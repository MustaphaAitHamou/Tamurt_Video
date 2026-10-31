import Link from "next/link";

import {
  addCollectionItemAction,
  deleteCollectionAction,
  removeCollectionItemAction,
  saveCollectionAction,
} from "@/actions/admin/editorial";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { EditorialNav } from "@/components/admin/editorial/editorial-nav";
import { AdminPageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/action-form";
import { Field, TextField } from "@/components/forms/form-fields";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";

export const metadata = { title: "Collections" };

function CollectionFields({
  collection,
}: {
  collection?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    is_public: boolean;
  };
}) {
  const p = collection ? `c-${collection.id.slice(0, 8)}-` : "c-new-";
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Nom"
          name="name"
          id={`${p}name`}
          required
          maxLength={120}
          defaultValue={collection?.name}
        />
        <TextField
          label="Slug"
          name="slug"
          id={`${p}slug`}
          maxLength={80}
          defaultValue={collection?.slug}
        />
      </div>
      <Field label="Description" name={`${p}description`}>
        <Textarea
          id={`${p}description`}
          name="description"
          maxLength={1000}
          defaultValue={collection?.description ?? ""}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_public"
          defaultChecked={collection?.is_public ?? true}
          className="size-4 accent-primary"
        />{" "}
        Visible publiquement (page catalogue)
      </label>
    </>
  );
}

export default async function CollectionsPage() {
  await requireStaff("editorial.write", "/admin/editorial/collections");
  const supabase = await createSupabaseServerClient();
  const [{ data: collections }, { data: titles }] = await Promise.all([
    supabase
      .from("collections")
      .select(
        "id, name, slug, description, is_public, collection_items(position, title_id, titles(title, status))",
      )
      .order("name"),
    supabase.from("titles").select("id, title").is("deleted_at", null).order("title").limit(2000),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Collections"
        description="Sélections éditoriales (ex. « Spécial Yennayer », « Cinéma kabyle restauré ») utilisables dans les sections de l'accueil et le catalogue."
      />
      <EditorialNav active="/admin/editorial/collections" />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <ul className="space-y-3">
          {(collections ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">Aucune collection.</li>
          )}
          {(collections ?? []).map((collection) => {
            const items = [...collection.collection_items].sort((a, b) => a.position - b.position);
            return (
              <li key={collection.id} className="space-y-4 rounded-xl border bg-card/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">
                    {collection.name}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      /{collection.slug}
                    </span>
                  </h2>
                  <span className="flex items-center gap-2">
                    {!collection.is_public && <Badge variant="muted">Privée</Badge>}
                    {collection.is_public && (
                      <Link
                        href={`/catalogue?collection=${collection.slug}`}
                        target="_blank"
                        className="text-xs text-muted-foreground underline"
                      >
                        Voir
                      </Link>
                    )}
                  </span>
                </div>
                <ol className="space-y-1 text-sm">
                  {items.length === 0 && (
                    <li className="text-muted-foreground">Collection vide.</li>
                  )}
                  {items.map((item, index) => (
                    <li
                      key={item.title_id}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-accent/40"
                    >
                      <span>
                        <span className="me-2 text-xs text-muted-foreground">{index + 1}.</span>
                        {item.titles?.title}
                        {item.titles &&
                          !["published", "announced"].includes(item.titles.status) && (
                            <span className="ms-2 text-xs text-warning">(non visible)</span>
                          )}
                      </span>
                      <ConfirmAction
                        action={removeCollectionItemAction.bind(null, collection.id, item.title_id)}
                        label="Retirer"
                        title="Retirer de la collection ?"
                        description="L'œuvre reste au catalogue."
                        variant="ghost"
                      />
                    </li>
                  ))}
                </ol>
                <ActionForm
                  action={addCollectionItemAction.bind(null, collection.id)}
                  submitLabel="Ajouter"
                  submitVariant="secondary"
                  resetOnSuccess
                  className="flex flex-wrap items-end gap-3 space-y-0"
                >
                  <Field
                    label="Ajouter une œuvre"
                    name={`add-${collection.id.slice(0, 8)}`}
                    className="min-w-64 flex-1"
                  >
                    <NativeSelect
                      id={`add-${collection.id.slice(0, 8)}`}
                      name="title_id"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Choisir…
                      </option>
                      {(titles ?? [])
                        .filter((t) => !items.some((i) => i.title_id === t.id))
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                    </NativeSelect>
                  </Field>
                </ActionForm>
                <details>
                  <summary className="cursor-pointer text-xs text-primary-text">
                    Modifier la collection
                  </summary>
                  <div className="mt-3 space-y-3">
                    <ActionForm
                      action={saveCollectionAction.bind(null, collection.id)}
                      submitLabel="Enregistrer"
                    >
                      <CollectionFields collection={collection} />
                    </ActionForm>
                    <ConfirmAction
                      action={deleteCollectionAction.bind(null, collection.id)}
                      label="Supprimer la collection"
                      title="Supprimer cette collection ?"
                      description="Les sections de l'accueil qui l'utilisent n'afficheront plus rien."
                      variant="ghost"
                      destructive
                    />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
        <section className="h-fit rounded-xl border bg-card/60 p-5">
          <h2 className="mb-4 font-semibold">Nouvelle collection</h2>
          <ActionForm
            action={saveCollectionAction.bind(null, null)}
            submitLabel="Créer"
            resetOnSuccess
          >
            <CollectionFields />
          </ActionForm>
        </section>
      </div>
    </>
  );
}
