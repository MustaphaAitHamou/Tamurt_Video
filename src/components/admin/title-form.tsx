"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Field, FormMessage, SubmitButton, TextField } from "@/components/forms/form-fields";
import { NativeSelect } from "@/components/ui/native-select";
import { TITLE_KIND_LABELS } from "@/lib/constants";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/server/errors";

export type TitleFormValues = {
  title: string;
  slug: string;
  kind: string;
  structure: string;
  original_title: string | null;
  alternative_titles: string[];
  tagline: string | null;
  synopsis_short: string | null;
  description_long: string | null;
  release_year: number | null;
  runtime_minutes: number | null;
  age_rating: number;
  min_tier: string;
  countries: string[];
  original_languages: string[];
  audio_languages: string[];
  tags: string[];
  content_warnings: string[];
  is_original: boolean;
  is_featured: boolean;
  intro_start_seconds: number | null;
  intro_end_seconds: number | null;
  credits_start_seconds: number | null;
  genreIds: number[];
};

const TIERS: Record<string, string> = { free: "Gratuit (membres inscrits)", founder: "Fondateur et plus", standard: "Standard et plus", premium: "Premium uniquement" };

export function TitleForm<T>({
  action,
  genres,
  defaults,
  redirectOnCreate = false,
}: {
  action: (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>;
  genres: { id: number; label: string }[];
  defaults?: Partial<TitleFormValues>;
  redirectOnCreate?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, null);
  useEffect(() => {
    const data: unknown = state?.ok ? state.data : null;
    if (redirectOnCreate && data && typeof data === "object" && "id" in data && typeof data.id === "string") {
      router.push(`/admin/catalogue/${data.id}`);
    }
  }, [state, redirectOnCreate, router]);
  const d = defaults ?? {};
  const err = (name: string) => (!state?.ok ? state?.fieldErrors?.[name] : undefined);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <TextField label="Titre" name="title" defaultValue={d.title} required maxLength={200} error={err("title")} />
        <TextField label="Identifiant d'URL (slug)" name="slug" defaultValue={d.slug} hint="Laisser vide pour le générer depuis le titre." maxLength={80} />
        <Field label="Type" name="kind">
          <NativeSelect id="kind" name="kind" defaultValue={d.kind ?? "film"}>
            {Object.entries(TITLE_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Structure" name="structure" hint="Série et émission : épisodique. Film et court-métrage : œuvre unique.">
          <NativeSelect id="structure" name="structure" defaultValue={d.structure ?? "single"}>
            <option value="single">Œuvre unique</option>
            <option value="episodic">Épisodique (saisons et épisodes)</option>
          </NativeSelect>
        </Field>
        <TextField label="Titre original" name="original_title" defaultValue={d.original_title ?? ""} maxLength={200} />
        <TextField label="Titres alternatifs" name="alternative_titles" defaultValue={d.alternative_titles?.join(", ")} hint="Séparés par des virgules." />
        <TextField label="Accroche" name="tagline" defaultValue={d.tagline ?? ""} maxLength={200} />
        <TextField label="Année" name="release_year" type="number" defaultValue={d.release_year ?? ""} min={1888} max={2100} error={err("release_year")} />
        <TextField label="Pays (codes ISO)" name="countries" defaultValue={d.countries?.join(", ")} hint="Ex. : DZ, FR" />
        <TextField label="Langues originales (codes ISO 639)" name="original_languages" defaultValue={d.original_languages?.join(", ")} hint="Ex. : kab, ar, fr" />
        <TextField label="Langues audio disponibles" name="audio_languages" defaultValue={d.audio_languages?.join(", ")} />
        <TextField label="Durée (minutes)" name="runtime_minutes" type="number" defaultValue={d.runtime_minutes ?? ""} min={1} max={1000} />
        <Field label="Classification d'âge" name="age_rating">
          <NativeSelect id="age_rating" name="age_rating" defaultValue={String(d.age_rating ?? 0)}>
            <option value="0">Tous publics</option>
            <option value="10">-10 ans</option>
            <option value="12">-12 ans</option>
            <option value="16">-16 ans</option>
            <option value="18">-18 ans</option>
          </NativeSelect>
        </Field>
        <Field label="Accès" name="min_tier" hint="Formule minimale ; la licence doit couvrir le mode d'exploitation correspondant.">
          <NativeSelect id="min_tier" name="min_tier" defaultValue={d.min_tier ?? "standard"}>
            {Object.entries(TIERS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <TextField label="Étiquettes" name="tags" defaultValue={d.tags?.join(", ")} hint="Ex. : ramadan, kabylie, archive" />
        <TextField label="Avertissements de contenu" name="content_warnings" defaultValue={d.content_warnings?.join(", ")} />
      </div>
      <Field label="Synopsis court" name="synopsis_short">
        <Textarea id="synopsis_short" name="synopsis_short" defaultValue={d.synopsis_short ?? ""} maxLength={500} />
      </Field>
      <Field label="Description longue" name="description_long">
        <Textarea id="description_long" name="description_long" defaultValue={d.description_long ?? ""} maxLength={10000} className="min-h-40" />
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Genres</legend>
        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => (
            <label key={genre.id} className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/15">
              <input type="checkbox" name="genres" value={genre.id} defaultChecked={d.genreIds?.includes(genre.id)} className="sr-only" />
              {genre.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-5 md:grid-cols-3">
        <TextField label="Début de l'introduction (s)" name="intro_start_seconds" type="number" min={0} defaultValue={d.intro_start_seconds ?? ""} />
        <TextField label="Fin de l'introduction (s)" name="intro_end_seconds" type="number" min={0} defaultValue={d.intro_end_seconds ?? ""} />
        <TextField label="Début du générique de fin (s)" name="credits_start_seconds" type="number" min={0} defaultValue={d.credits_start_seconds ?? ""} />
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_original" defaultChecked={d.is_original} className="size-4 accent-primary" /> Production Tamurt
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_featured" defaultChecked={d.is_featured} className="size-4 accent-primary" /> Mise en avant
        </label>
      </div>
      <FormMessage state={state} />
      <SubmitButton>Enregistrer</SubmitButton>
    </form>
  );
}
