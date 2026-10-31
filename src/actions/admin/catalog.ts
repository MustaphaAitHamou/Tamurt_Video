"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CONTENT_LANGUAGES, TITLE_KINDS } from "@/lib/constants";
import { slugify } from "@/lib/format";
import { adminContext, uuidPattern } from "@/server/admin/guard";
import { failure, failureFromDb, fromZodError, success, type ActionResult } from "@/server/errors";
import { logAudit } from "@/server/audit";

const csv = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const intOrNull = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().int().nullable(),
);

const titleSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(80).optional(),
  kind: z.enum(TITLE_KINDS),
  structure: z.enum(["single", "episodic"]),
  original_title: z.string().trim().max(200).optional(),
  tagline: z.string().trim().max(200).optional(),
  synopsis_short: z.string().trim().max(500).optional(),
  description_long: z.string().trim().max(10000).optional(),
  release_year: intOrNull.refine((v) => v === null || (v >= 1888 && v <= 2100), "Année invalide"),
  runtime_minutes: intOrNull.refine((v) => v === null || (v > 0 && v <= 1000), "Durée invalide"),
  age_rating: z.coerce
    .number()
    .int()
    .refine((v) => [0, 10, 12, 16, 18].includes(v)),
  min_tier: z.enum(["free", "founder", "standard", "premium"]),
  intro_start_seconds: intOrNull,
  intro_end_seconds: intOrNull,
  credits_start_seconds: intOrNull,
});

function parseTitleForm(formData: FormData) {
  const parsed = titleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: fromZodError(parsed.error) } as const;
  const countries = csv(formData.get("countries")).map((c) => c.toUpperCase());
  if (countries.some((c) => !/^[A-Z]{2}$/.test(c)))
    return {
      error: failure(
        "Pays : codes ISO à deux lettres séparés par des virgules (DZ, FR…).",
        "VALIDATION",
      ),
    } as const;
  const languages = csv(formData.get("original_languages")).map((c) => c.toLowerCase());
  const audio = csv(formData.get("audio_languages")).map((c) => c.toLowerCase());
  if ([...languages, ...audio].some((c) => !/^[a-z]{2,3}$/.test(c))) {
    return {
      error: failure(
        `Langues : codes ISO 639 (${Object.keys(CONTENT_LANGUAGES).slice(0, 4).join(", ")}…).`,
        "VALIDATION",
      ),
    } as const;
  }
  const d = parsed.data;
  if (["series", "show"].includes(d.kind) && d.structure !== "episodic")
    return { error: failure("Une série ou une émission est épisodique.", "VALIDATION") } as const;
  if (["film", "short"].includes(d.kind) && d.structure !== "single")
    return {
      error: failure("Un film ou un court-métrage n'a pas d'épisodes.", "VALIDATION"),
    } as const;
  return {
    values: {
      title: d.title,
      slug: slugify(d.slug || d.title) || `oeuvre-${Date.now()}`,
      kind: d.kind,
      structure: d.structure,
      original_title: d.original_title || null,
      alternative_titles: csv(formData.get("alternative_titles")),
      tagline: d.tagline || null,
      synopsis_short: d.synopsis_short || null,
      description_long: d.description_long || null,
      release_year: d.release_year,
      runtime_minutes: d.runtime_minutes,
      age_rating: d.age_rating,
      min_tier: d.min_tier,
      countries,
      original_languages: languages,
      audio_languages: audio.length ? audio : languages,
      tags: csv(formData.get("tags"))
        .map((t) => slugify(t))
        .filter(Boolean),
      content_warnings: csv(formData.get("content_warnings")),
      is_original: formData.get("is_original") === "on",
      is_featured: formData.get("is_featured") === "on",
      intro_start_seconds: d.intro_start_seconds,
      intro_end_seconds: d.intro_end_seconds,
      credits_start_seconds: d.credits_start_seconds,
    },
    genreIds: formData
      .getAll("genres")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0),
  } as const;
}

export async function createTitleAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await adminContext("catalog.write");
  if (!ctx.ok) return ctx.result;
  const parsed = parseTitleForm(formData);
  if ("error" in parsed) return parsed.error as ActionResult<never>;
  const { data, error } = await ctx.supabase
    .from("titles")
    .insert({
      ...parsed.values,
      status: "draft",
      created_by: ctx.viewer.user.id,
      updated_by: ctx.viewer.user.id,
    })
    .select("id")
    .single();
  if (error)
    return failureFromDb(error, error.code === "23505" ? "Ce slug est déjà utilisé." : undefined);
  if (parsed.genreIds.length)
    await ctx.supabase
      .from("title_genres")
      .insert(parsed.genreIds.map((genre_id) => ({ title_id: data.id, genre_id })));
  revalidatePath("/admin/catalogue");
  return success(
    { id: data.id },
    "Œuvre créée en brouillon. Ajoutez une licence avant toute publication.",
  );
}

export async function updateTitleAction(
  titleId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await adminContext("catalog.write");
  if (!ctx.ok) return ctx.result;
  if (!uuidPattern.test(titleId)) return failure("Œuvre invalide.", "VALIDATION");
  const parsed = parseTitleForm(formData);
  if ("error" in parsed) return parsed.error as ActionResult<never>;
  const { error } = await ctx.supabase
    .from("titles")
    .update({ ...parsed.values, updated_by: ctx.viewer.user.id })
    .eq("id", titleId);
  if (error)
    return failureFromDb(error, error.code === "23505" ? "Ce slug est déjà utilisé." : undefined);
  await ctx.supabase.from("title_genres").delete().eq("title_id", titleId);
  if (parsed.genreIds.length)
    await ctx.supabase
      .from("title_genres")
      .insert(parsed.genreIds.map((genre_id) => ({ title_id: titleId, genre_id })));
  revalidatePath(`/admin/catalogue/${titleId}`);
  revalidatePath("/", "layout");
  return success(undefined, "Modifications enregistrées.");
}

const statusSchema = z.enum([
  "draft",
  "in_review",
  "announced",
  "published",
  "unpublished",
  "archived",
]);

/** Changement de statut : la base refuse toute publication ou annonce sans licence valide. */
export async function setTitleStatusAction(
  titleId: string,
  status: string,
  publishAt?: string,
): Promise<ActionResult> {
  const ctx = await adminContext(
    status === "published" || status === "announced" ? "catalog.publish" : "catalog.write",
  );
  if (!ctx.ok) return ctx.result;
  const parsedStatus = statusSchema.safeParse(status);
  if (!uuidPattern.test(titleId) || !parsedStatus.success)
    return failure("Requête invalide.", "VALIDATION");
  const publishedAt =
    parsedStatus.data === "published"
      ? publishAt && !Number.isNaN(Date.parse(publishAt))
        ? new Date(publishAt).toISOString()
        : new Date().toISOString()
      : undefined;
  const { error } = await ctx.supabase
    .from("titles")
    .update({
      status: parsedStatus.data,
      ...(publishedAt ? { published_at: publishedAt } : {}),
      updated_by: ctx.viewer.user.id,
    })
    .eq("id", titleId);
  if (error) return failureFromDb(error);
  revalidatePath(`/admin/catalogue/${titleId}`);
  revalidatePath("/", "layout");
  return success(undefined, "Statut mis à jour.");
}

export async function softDeleteTitleAction(titleId: string): Promise<ActionResult> {
  const ctx = await adminContext("catalog.write");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase
    .from("titles")
    .update({
      deleted_at: new Date().toISOString(),
      status: "archived",
      updated_by: ctx.viewer.user.id,
    })
    .eq("id", titleId);
  if (error) return failureFromDb(error);
  revalidatePath("/admin/catalogue");
  revalidatePath("/", "layout");
  return success(undefined, "Œuvre supprimée (archivée).");
}

export async function restoreTitleAction(titleId: string): Promise<ActionResult> {
  const ctx = await adminContext("catalog.write");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase
    .from("titles")
    .update({ deleted_at: null, status: "draft", updated_by: ctx.viewer.user.id })
    .eq("id", titleId);
  if (error) return failureFromDb(error);
  revalidatePath("/admin/catalogue");
  return success(undefined, "Œuvre restaurée en brouillon.");
}

/** Retrait immédiat (réclamation) et rétablissement. */
export async function takedownTitleAction(
  titleId: string,
  reason?: string,
  claimId?: string,
): Promise<ActionResult> {
  const ctx = await adminContext("takedown.execute");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase.rpc("takedown_title", {
    p_title: titleId,
    p_reason: reason ?? "",
    ...(claimId ? { p_claim: claimId } : {}),
  });
  if (error) return failureFromDb(error);
  revalidatePath("/", "layout");
  return success(undefined, "Contenu retiré : la lecture est bloquée immédiatement.");
}

export async function restoreTakedownAction(titleId: string, note?: string): Promise<ActionResult> {
  const ctx = await adminContext("takedown.execute");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase.rpc("restore_title", {
    p_title: titleId,
    p_note: note ?? "",
  });
  if (error) return failureFromDb(error);
  revalidatePath("/", "layout");
  return success(undefined, "Contenu rétabli.");
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

/** Envoi d'une affiche, bannière ou vignette vers le stockage public. */
export async function uploadTitleImageAction(
  titleId: string,
  field: "poster_path" | "backdrop_path" | "logo_path",
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await adminContext("catalog.write");
  if (!ctx.ok) return ctx.result;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return failure("Choisissez une image.", "VALIDATION");
  if (!IMAGE_TYPES.has(file.type) || file.size > 3_900_000)
    return failure("Image JPEG, PNG, WebP ou AVIF de moins de 4 Mo.", "VALIDATION");
  const extension = file.type.split("/")[1];
  const path = `titles/${titleId}/${field.replace("_path", "")}-${Date.now()}.${extension}`;
  const { error: uploadError } = await ctx.supabase.storage
    .from("media-public")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return failure(`Envoi impossible : ${uploadError.message}`, "STORAGE");
  const update =
    field === "poster_path"
      ? { poster_path: path }
      : field === "backdrop_path"
        ? { backdrop_path: path }
        : { logo_path: path };
  const { error } = await ctx.supabase
    .from("titles")
    .update({ ...update, updated_by: ctx.viewer.user.id })
    .eq("id", titleId);
  if (error) return failureFromDb(error);
  revalidatePath(`/admin/catalogue/${titleId}`);
  revalidatePath("/", "layout");
  return success(undefined, "Image enregistrée.");
}

// --- Distribution -----------------------------------------------------------

export async function addCreditAction(
  titleId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await adminContext("catalog.write");
  if (!ctx.ok) return ctx.result;
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(160),
      role: z.enum([
        "director",
        "actor",
        "writer",
        "producer",
        "composer",
        "cinematographer",
        "editor",
        "presenter",
        "guest",
      ]),
      character: z.string().trim().max(120).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const slug = slugify(parsed.data.name);
  let { data: person } = await ctx.supabase
    .from("people")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!person) {
    const created = await ctx.supabase
      .from("people")
      .insert({ slug, full_name: parsed.data.name })
      .select("id")
      .single();
    if (created.error) return failureFromDb(created.error);
    person = created.data;
  }
  const { count } = await ctx.supabase
    .from("credits")
    .select("id", { count: "exact", head: true })
    .eq("title_id", titleId);
  const { error } = await ctx.supabase.from("credits").insert({
    title_id: titleId,
    person_id: person.id,
    role: parsed.data.role,
    character_name: parsed.data.character || null,
    position: count ?? 0,
  });
  if (error) return failureFromDb(error);
  revalidatePath(`/admin/catalogue/${titleId}`);
  return success(undefined, "Crédit ajouté.");
}

export async function removeCreditAction(creditId: string, titleId: string): Promise<ActionResult> {
  const ctx = await adminContext("catalog.write");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase.from("credits").delete().eq("id", creditId);
  if (error) return failureFromDb(error);
  revalidatePath(`/admin/catalogue/${titleId}`);
  return success(undefined, "Crédit retiré.");
}

// --- Saisons et épisodes ----------------------------------------------------

export async function addSeasonAction(
  titleId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await adminContext("catalog.write");
  if (!ctx.ok) return ctx.result;
  const parsed = z
    .object({
      season_number: z.coerce.number().int().min(0).max(200),
      name: z.string().trim().max(120).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { error } = await ctx.supabase.from("seasons").insert({
    title_id: titleId,
    season_number: parsed.data.season_number,
    name: parsed.data.name || `Saison ${parsed.data.season_number}`,
  });
  if (error)
    return failureFromDb(error, error.code === "23505" ? "Cette saison existe déjà." : undefined);
  revalidatePath(`/admin/catalogue/${titleId}`);
  return success(undefined, "Saison ajoutée.");
}

const episodeSchema = z.object({
  season_id: z.uuid(),
  episode_number: z.coerce.number().int().min(0).max(2000),
  name: z.string().trim().min(1).max(200),
  synopsis: z.string().trim().max(2000).optional(),
  runtime_minutes: intOrNull,
  intro_start_seconds: intOrNull,
  intro_end_seconds: intOrNull,
  credits_start_seconds: intOrNull,
  status: z.enum(["draft", "published", "unpublished"]),
});

export async function saveEpisodeAction(
  titleId: string,
  episodeId: string | null,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await adminContext("catalog.write");
  if (!ctx.ok) return ctx.result;
  const parsed = episodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const values = {
    ...parsed.data,
    synopsis: parsed.data.synopsis || null,
    title_id: titleId,
    published_at: parsed.data.status === "published" ? new Date().toISOString() : null,
  };
  const { error } = episodeId
    ? await ctx.supabase.from("episodes").update(values).eq("id", episodeId).eq("title_id", titleId)
    : await ctx.supabase.from("episodes").insert(values);
  if (error)
    return failureFromDb(
      error,
      error.code === "23505" ? "Ce numéro d'épisode existe déjà dans la saison." : undefined,
    );
  revalidatePath(`/admin/catalogue/${titleId}`);
  return success(undefined, episodeId ? "Épisode mis à jour." : "Épisode ajouté.");
}

export async function deleteEpisodeAction(
  episodeId: string,
  titleId: string,
): Promise<ActionResult> {
  const ctx = await adminContext("catalog.write");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase
    .from("episodes")
    .update({ deleted_at: new Date().toISOString(), status: "unpublished" })
    .eq("id", episodeId);
  if (error) return failureFromDb(error);
  revalidatePath(`/admin/catalogue/${titleId}`);
  return success(undefined, "Épisode supprimé.");
}

// --- Sous-titres --------------------------------------------------------------

export async function uploadSubtitleAction(
  assetId: string,
  titleId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await adminContext("catalog.write");
  if (!ctx.ok) return ctx.result;
  const parsed = z
    .object({
      language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/),
      label: z.string().trim().min(1).max(60),
      kind: z.enum(["subtitles", "captions", "forced"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 2_000_000)
    return failure("Fichier WebVTT de moins de 2 Mo requis.", "VALIDATION");
  const text = await file.text();
  if (!text.replace(/^﻿/, "").startsWith("WEBVTT"))
    return failure(
      "Le fichier doit être au format WebVTT (commence par « WEBVTT »).",
      "VALIDATION",
    );
  const path = `${assetId}/${parsed.data.language}-${parsed.data.kind}.vtt`;
  const { error: uploadError } = await ctx.supabase.storage
    .from("subtitles")
    .upload(path, new Blob([text], { type: "text/vtt" }), {
      upsert: true,
      contentType: "text/vtt",
    });
  if (uploadError) return failure(`Envoi impossible : ${uploadError.message}`, "STORAGE");
  const { error } = await ctx.supabase.from("subtitles").upsert(
    {
      media_asset_id: assetId,
      language: parsed.data.language,
      label: parsed.data.label,
      kind: parsed.data.kind,
      storage_path: path,
      is_machine_generated: formData.get("machine") === "on",
      created_by: ctx.viewer.user.id,
    },
    { onConflict: "media_asset_id,language,kind" },
  );
  if (error) return failureFromDb(error);
  revalidatePath(`/admin/catalogue/${titleId}`);
  return success(undefined, "Sous-titres enregistrés.");
}

export async function deleteSubtitleAction(
  subtitleId: string,
  titleId: string,
): Promise<ActionResult> {
  const ctx = await adminContext("catalog.write");
  if (!ctx.ok) return ctx.result;
  const { data } = await ctx.supabase
    .from("subtitles")
    .select("storage_path")
    .eq("id", subtitleId)
    .maybeSingle();
  if (data) await ctx.supabase.storage.from("subtitles").remove([data.storage_path]);
  const { error } = await ctx.supabase.from("subtitles").delete().eq("id", subtitleId);
  if (error) return failureFromDb(error);
  await logAudit({
    actorId: ctx.viewer.user.id,
    action: "subtitle.deleted",
    entityType: "subtitle",
    entityId: subtitleId,
  });
  revalidatePath(`/admin/catalogue/${titleId}`);
  return success(undefined, "Sous-titres supprimés.");
}
