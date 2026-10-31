import { deleteRoadmapItemAction, saveRoadmapItemAction } from "@/actions/admin/editorial";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { EditorialNav } from "@/components/admin/editorial/editorial-nav";
import { ROADMAP_CATEGORY_LABELS, ROADMAP_STATUS_LABELS } from "@/components/admin/editorial/labels";
import { AdminPageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/action-form";
import { Field, TextField } from "@/components/forms/form-fields";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";

export const metadata = { title: "Feuille de route" };

type Item = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  target_label: string | null;
  progress: number;
  position: number;
  is_public: boolean;
};

function ItemFields({ item, nextPosition }: { item?: Item; nextPosition: number }) {
  const p = item ? `r-${item.id.slice(0, 8)}-` : "r-new-";
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="Intitulé" name="title" id={`${p}title`} required maxLength={160} defaultValue={item?.title} className="md:col-span-2" />
        <TextField label="Échéance indicative" name="target_label" id={`${p}target`} maxLength={40} defaultValue={item?.target_label ?? ""} hint="Ex. : « Printemps 2027 » — jamais une promesse ferme." />
        <Field label="Catégorie" name={`${p}category`}>
          <NativeSelect id={`${p}category`} name="category" defaultValue={item?.category ?? "platform"}>
            {Object.entries(ROADMAP_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Statut" name={`${p}status`}>
          <NativeSelect id={`${p}status`} name="status" defaultValue={item?.status ?? "planned"}>
            {Object.entries(ROADMAP_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Avancement (%)" name="progress" id={`${p}progress`} type="number" min={0} max={100} defaultValue={item?.progress ?? 0} />
          <TextField label="Position" name="position" id={`${p}position`} type="number" min={0} defaultValue={item?.position ?? nextPosition} />
        </div>
      </div>
      <Field label="Description" name={`${p}description`}>
        <Textarea id={`${p}description`} name="description" maxLength={2000} defaultValue={item?.description ?? ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_public" defaultChecked={item?.is_public ?? true} className="size-4 accent-primary" /> Visible sur la feuille de route publique
      </label>
    </>
  );
}

export default async function RoadmapAdminPage() {
  await requireStaff("editorial.write", "/admin/editorial/feuille-de-route");
  const supabase = await createSupabaseServerClient();
  const { data: items } = await supabase.from("roadmap_items").select("*").order("position").order("created_at");
  const list = items ?? [];
  return (
    <>
      <AdminPageHeader title="Feuille de route" description="Étapes affichées aux fondateurs et au public. Formulez des objectifs, pas des promesses : aucune date ni aucun contenu ne doit être garanti sans certitude." />
      <EditorialNav active="/admin/editorial/feuille-de-route" />
      <ul className="mb-6 space-y-2">
        {list.map((item) => (
          <li key={item.id}>
            <details className="rounded-xl border bg-card/60">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{item.title}</span>
                  <Badge variant="outline">{ROADMAP_CATEGORY_LABELS[item.category]}</Badge>
                  <Badge variant={item.status === "done" ? "success" : item.status === "in_progress" ? "gold" : "muted"}>{ROADMAP_STATUS_LABELS[item.status]}</Badge>
                  {!item.is_public && <Badge variant="warning">Interne</Badge>}
                </span>
                <span className="flex w-40 items-center gap-2 text-xs text-muted-foreground">
                  <Progress value={item.progress} aria-label={`Avancement ${item.progress} %`} /> {item.progress} %
                </span>
              </summary>
              <div className="space-y-4 border-t p-5">
                <ActionForm action={saveRoadmapItemAction.bind(null, item.id)} submitLabel="Enregistrer">
                  <ItemFields item={item} nextPosition={item.position} />
                </ActionForm>
                <ConfirmAction action={deleteRoadmapItemAction.bind(null, item.id)} label="Supprimer" title="Supprimer cette étape ?" description="Elle disparaît de la feuille de route." variant="ghost" destructive />
              </div>
            </details>
          </li>
        ))}
      </ul>
      <section className="rounded-xl border border-dashed p-5">
        <h2 className="mb-4 font-semibold">Nouvelle étape</h2>
        <ActionForm action={saveRoadmapItemAction.bind(null, null)} submitLabel="Ajouter" resetOnSuccess>
          <ItemFields nextPosition={(list.at(-1)?.position ?? 0) + 10} />
        </ActionForm>
      </section>
    </>
  );
}
