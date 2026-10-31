"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Field, FormMessage, SubmitButton, TextField } from "@/components/forms/form-fields";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_CATEGORY_LABELS,
} from "@/components/admin/editorial/labels";
import type { ActionResult } from "@/server/errors";

export type AnnouncementValues = {
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  category: string;
  audience: string;
  status: string;
  published_at: string | null;
  pinned: boolean;
  partnership_authorized: boolean;
};

export function AnnouncementForm({
  action,
  defaults,
  publishedAtLocal,
}: {
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData,
  ) => Promise<ActionResult<{ id: string }>>;
  defaults?: Partial<AnnouncementValues>;
  publishedAtLocal?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, null);
  const isNew = !defaults?.slug;
  useEffect(() => {
    if (state?.ok && isNew) router.push(`/admin/editorial/actualites/${state.data.id}`);
  }, [state, isNew, router]);
  const d = defaults ?? {};
  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Titre" name="title" required maxLength={160} defaultValue={d.title} />
        <TextField
          label="Slug"
          name="slug"
          maxLength={100}
          defaultValue={d.slug}
          hint="Adresse : /actualites/<slug>"
        />
        <Field label="Catégorie" name="category">
          <NativeSelect id="category" name="category" defaultValue={d.category ?? "news"}>
            {Object.entries(ANNOUNCEMENT_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Public" name="audience">
          <NativeSelect id="audience" name="audience" defaultValue={d.audience ?? "public"}>
            {Object.entries(ANNOUNCEMENT_AUDIENCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Statut" name="status">
          <NativeSelect id="status" name="status" defaultValue={d.status ?? "draft"}>
            <option value="draft">Brouillon</option>
            <option value="published">Publiée</option>
            <option value="archived">Archivée</option>
          </NativeSelect>
        </Field>
        <TextField
          label="Date de publication (heure de Paris)"
          name="published_at"
          type="datetime-local"
          defaultValue={publishedAtLocal}
          hint="Vide : maintenant, à la publication."
        />
      </div>
      <TextField label="Chapô" name="excerpt" maxLength={400} defaultValue={d.excerpt ?? ""} />
      <Field
        label="Texte (Markdown)"
        name="body"
        hint="Titres (##), listes, liens et emphase. Le HTML brut est ignoré à l'affichage."
      >
        <Textarea
          id="body"
          name="body"
          defaultValue={d.body ?? ""}
          maxLength={30000}
          className="min-h-72 font-mono text-sm"
        />
      </Field>
      <Field label="Image de couverture (16:9, 4 Mo max.)" name="cover">
        <input
          id="cover"
          type="file"
          name="cover"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="block w-full text-sm file:me-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-foreground"
        />
      </Field>
      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="pinned"
            defaultChecked={d.pinned}
            className="size-4 accent-primary"
          />{" "}
          Épingler en tête des actualités
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            name="partnership_authorized"
            defaultChecked={d.partnership_authorized}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>
            Partenariat : je confirme disposer de l&apos;accord écrit du partenaire pour communiquer
            publiquement.
            <span className="block text-xs text-muted-foreground">
              Obligatoire pour publier une annonce de catégorie « Partenariat ». Aucun partenariat
              ne doit être annoncé sans accord.
            </span>
          </span>
        </label>
      </div>
      <FormMessage state={state} />
      <SubmitButton>Enregistrer</SubmitButton>
    </form>
  );
}
