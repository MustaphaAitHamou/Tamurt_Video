"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { parisInputToIso, slugify } from "@/lib/format";
import { adminContext, uuidPattern } from "@/server/admin/guard";
import { failure, failureFromDb, fromZodError, success, type ActionResult } from "@/server/errors";

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
/** Champ date-heure saisi à l'heure de Paris. */
const optionalDate = z
  .string()
  .optional()
  .refine((v) => !v || parisInputToIso(v) !== null, "Date invalide")
  .transform((v) => (v ? parisInputToIso(v) : null));
const AUDIENCES = ["all", "visitors", "members", "subscribers"] as const;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function refreshPublic() {
  revalidatePath("/", "layout");
}

async function uploadImage(ctx: Extract<Awaited<ReturnType<typeof adminContext>>, { ok: true }>, folder: string, file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return { path: null };
  if (!IMAGE_TYPES.has(file.type) || file.size > 3_900_000) return { error: failure("Image JPEG, PNG, WebP ou AVIF de moins de 4 Mo.", "VALIDATION") };
  const path = `${folder}/${Date.now()}.${file.type.split("/")[1]}`;
  const { error } = await ctx.supabase.storage.from("media-public").upload(path, file, { contentType: file.type });
  if (error) return { error: failure(`Envoi impossible : ${error.message}`, "STORAGE") };
  return { path };
}

// --- Sections de l'accueil ------------------------------------------------------

const sectionSchema = z.object({
  title: z.string().trim().min(1).max(80),
  slug: z.string().trim().max(60).optional(),
  title_en: optionalText(80),
  title_ar: optionalText(80),
  title_kab: optionalText(80),
  source: z.enum(["popular", "new", "collection", "filter", "continue_watching", "watchlist", "recommended", "coming_soon"]),
  layout: z.enum(["poster", "landscape", "top10", "large"]),
  max_items: z.coerce.number().int().min(1).max(50),
  audience: z.enum(AUDIENCES),
  position: z.coerce.number().int().min(0).max(1000),
  starts_at: optionalDate,
  ends_at: optionalDate,
  cfg_kind: optionalText(20),
  cfg_collection: optionalText(80),
  cfg_genre: optionalText(80),
  cfg_country: optionalText(2),
  cfg_language: optionalText(8),
  cfg_tag: optionalText(60),
  cfg_sort: z.enum(["popular", "new", "title", "year"]).optional(),
});

export async function saveHomeSectionAction(sectionId: string | null, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await adminContext("editorial.write");
  if (!ctx.ok) return ctx.result;
  const parsed = sectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  if (d.source === "collection" && !d.cfg_collection) return failure("Choisissez la collection à afficher.", "VALIDATION", { cfg_collection: ["Requis"] });
  const config: Record<string, string | boolean> = {};
  if (d.cfg_kind) config.kind = d.cfg_kind;
  if (d.cfg_collection) config.collection = d.cfg_collection;
  if (d.cfg_genre) config.genre = d.cfg_genre;
  if (d.cfg_country) config.country = d.cfg_country.toUpperCase();
  if (d.cfg_language) config.language = d.cfg_language.toLowerCase();
  if (d.cfg_tag) config.tag = slugify(d.cfg_tag);
  if (d.cfg_sort) config.sort = d.cfg_sort;
  if (formData.get("cfg_original") === "on") config.original = true;
  const title_i18n: Record<string, string> = {};
  if (d.title_en) title_i18n.en = d.title_en;
  if (d.title_ar) title_i18n.ar = d.title_ar;
  if (d.title_kab) title_i18n.kab = d.title_kab;
  const values = {
    title: d.title,
    slug: slugify(d.slug || d.title),
    title_i18n,
    source: d.source,
    config,
    layout: d.layout,
    max_items: d.max_items,
    audience: d.audience,
    position: d.position,
    is_active: formData.get("is_active") === "on",
    starts_at: d.starts_at,
    ends_at: d.ends_at,
  };
  const { error } = sectionId ? await ctx.supabase.from("home_sections").update(values).eq("id", sectionId) : await ctx.supabase.from("home_sections").insert(values);
  if (error) return failureFromDb(error, error.code === "23505" ? "Ce slug est déjà utilisé." : undefined);
  revalidatePath("/admin/editorial");
  refreshPublic();
  return success(undefined, sectionId ? "Section mise à jour." : "Section ajoutée.");
}

export async function moveHomeSectionAction(sectionId: string, direction: "up" | "down"): Promise<ActionResult> {
  const ctx = await adminContext("editorial.write");
  if (!ctx.ok) return ctx.result;
  const { data: sections } = await ctx.supabase.from("home_sections").select("id, position").order("position").order("created_at");
  const list = sections ?? [];
  const index = list.findIndex((s) => s.id === sectionId);
  const swap = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swap < 0 || swap >= list.length) return success(undefined, "Ordre inchangé.");
  // Positions normalisées (10, 20, 30…) pour éviter les égalités.
  const reordered = [...list];
  [reordered[index], reordered[swap]] = [reordered[swap]!, reordered[index]!];
  for (const [i, section] of reordered.entries()) {
    if (section.position !== (i + 1) * 10) await ctx.supabase.from("home_sections").update({ position: (i + 1) * 10 }).eq("id", section.id);
  }
  revalidatePath("/admin/editorial");
  refreshPublic();
  return success(undefined, "Ordre mis à jour.");
}

export async function toggleHomeSectionAction(sectionId: string, active: boolean): Promise<ActionResult> {
  const ctx = await adminContext("editorial.write");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase.from("home_sections").update({ is_active: active }).eq("id", sectionId);
  if (error) return failureFromDb(error);
  revalidatePath("/admin/editorial");
  refreshPublic();
  return success(undefined, active ? "Section affichée." : "Section masquée.");
}

export async function deleteHomeSectionAction(sectionId: string): Promise<ActionResult> {
  const ctx = await adminContext("editorial.write");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase.from("home_sections").delete().eq("id", sectionId);
  if (error) return failureFromDb(error);
  revalidatePath("/admin/editorial");
  refreshPublic();
  return success(undefined, "Section supprimée.");
}

// --- Bannières -------------------------------------------------------------------

const bannerSchema = z.object({
  headline: z.string().trim().min(1).max(120),
  subheadline: optionalText(300),
  cta_label: optionalText(40),
  cta_href: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || /^\/[^/]/.test(v) || v.startsWith("https://"), "Lien interne (/…) ou https:// uniquement"),
  title_id: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  audience: z.enum(AUDIENCES),
  position: z.coerce.number().int().min(0).max(1000),
  starts_at: optionalDate,
  ends_at: optionalDate,
});

export async function saveBannerAction(bannerId: string | null, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await adminContext("editorial.write");
  if (!ctx.ok) return ctx.result;
  const parsed = bannerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const image = await uploadImage(ctx, "banners", formData.get("image"));
  if (image.error) return image.error;
  const values = { ...parsed.data, is_active: formData.get("is_active") === "on", ...(image.path ? { image_path: image.path } : {}) };
  const { error } = bannerId ? await ctx.supabase.from("home_banners").update(values).eq("id", bannerId) : await ctx.supabase.from("home_banners").insert(values);
  if (error) return failureFromDb(error);
  revalidatePath("/admin/editorial");
  refreshPublic();
  return success(undefined, bannerId ? "Bannière mise à jour." : "Bannière ajoutée.");
}

export async function deleteBannerAction(bannerId: string): Promise<ActionResult> {
  const ctx = await adminContext("editorial.write");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase.from("home_banners").delete().eq("id", bannerId);
  if (error) return failureFromDb(error);
  revalidatePath("/admin/editorial");
  refreshPublic();
  return success(undefined, "Bannière supprimée.");
}

// --- Collections -----------------------------------------------------------------

export async function saveCollectionAction(collectionId: string | null, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await adminContext("editorial.write");
  if (!ctx.ok) return ctx.result;
  const parsed = z
    .object({ name: z.string().trim().min(1).max(120), slug: z.string().trim().max(80).optional(), description: optionalText(1000) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const values = { name: parsed.data.name, slug: slugify(parsed.data.slug || parsed.data.name), description: parsed.data.description, is_public: formData.get("is_public") === "on" };
  const { error } = collectionId ? await ctx.supabase.from("collections").update(values).eq("id", collectionId) : await ctx.supabase.from("collections").insert(values);
  if (error) return failureFromDb(error, error.code === "23505" ? "Ce slug est déjà utilisé." : undefined);
  revalidatePath("/admin/editorial/collections");
  refreshPublic();
  return success(undefined, collectionId ? "Collection mise à jour." : "Collection créée.");
}

export async function addCollectionItemAction(collectionId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await adminContext("editorial.write");
  if (!ctx.ok) return ctx.result;
  const titleId = String(formData.get("title_id") ?? "");
  if (!uuidPattern.test(collectionId) || !uuidPattern.test(titleId)) return failure("Choisissez une œuvre.", "VALIDATION");
  const { count } = await ctx.supabase.from("collection_items").select("title_id", { count: "exact", head: true }).eq("collection_id", collectionId);
  const { error } = await ctx.supabase.from("collection_items").insert({ collection_id: collectionId, title_id: titleId, position: (count ?? 0) + 1 });
  if (error) return failureFromDb(error, error.code === "23505" ? "Cette œuvre figure déjà dans la collection." : undefined);
  revalidatePath("/admin/editorial/collections");
  refreshPublic();
  return success(undefined, "Œuvre ajoutée.");
}

export async function removeCollectionItemAction(collectionId: string, titleId: string): Promise<ActionResult> {
  const ctx = await adminContext("editorial.write");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase.from("collection_items").delete().eq("collection_id", collectionId).eq("title_id", titleId);
  if (error) return failureFromDb(error);
  revalidatePath("/admin/editorial/collections");
  refreshPublic();
  return success(undefined, "Œuvre retirée.");
}

export async function deleteCollectionAction(collectionId: string): Promise<ActionResult> {
  const ctx = await adminContext("editorial.write");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase.from("collections").delete().eq("id", collectionId);
  if (error) return failureFromDb(error);
  revalidatePath("/admin/editorial/collections");
  refreshPublic();
  return success(undefined, "Collection supprimée.");
}

// --- Actualités --------------------------------------------------------------------

const announcementSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().max(100).optional(),
  excerpt: optionalText(400),
  body: z.string().max(30000),
  category: z.enum(["news", "roadmap", "partnership", "feature", "launch", "catalog"]),
  audience: z.enum(["public", "members", "subscribers", "founders"]),
  status: z.enum(["draft", "published", "archived"]),
  published_at: optionalDate,
});

export async function saveAnnouncementAction(announcementId: string | null, _prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const ctx = await adminContext("editorial.write");
  if (!ctx.ok) return ctx.result;
  const parsed = announcementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  const partnershipAuthorized = formData.get("partnership_authorized") === "on";
  if (d.category === "partnership" && d.status === "published" && !partnershipAuthorized) {
    return failure("Un partenariat ne peut être annoncé qu'avec l'accord écrit du partenaire : cochez la confirmation d'autorisation.", "PARTNERSHIP_NOT_AUTHORIZED", { partnership_authorized: ["Requis"] });
  }
  const cover = await uploadImage(ctx, "announcements", formData.get("cover"));
  if (cover.error) return cover.error as ActionResult<never>;
  const values = {
    title: d.title,
    slug: slugify(d.slug || d.title),
    excerpt: d.excerpt,
    body: d.body,
    category: d.category,
    audience: d.audience,
    status: d.status,
    published_at: d.status === "published" ? (d.published_at ?? new Date().toISOString()) : d.published_at,
    pinned: formData.get("pinned") === "on",
    partnership_authorized: partnershipAuthorized,
    updated_by: ctx.viewer.user.id,
    ...(cover.path ? { cover_path: cover.path } : {}),
  };
  const result = announcementId
    ? await ctx.supabase.from("announcements").update(values).eq("id", announcementId).select("id").single()
    : await ctx.supabase.from("announcements").insert({ ...values, created_by: ctx.viewer.user.id }).select("id").single();
  if (result.error) return failureFromDb(result.error, result.error.code === "23505" ? "Ce slug est déjà utilisé." : undefined);
  revalidatePath("/admin/editorial/actualites");
  revalidatePath("/actualites");
  refreshPublic();
  return success({ id: result.data.id }, announcementId ? "Actualité enregistrée." : "Actualité créée.");
}

export async function deleteAnnouncementAction(announcementId: string): Promise<ActionResult> {
  const ctx = await adminContext("editorial.write");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase.from("announcements").delete().eq("id", announcementId);
  if (error) return failureFromDb(error);
  revalidatePath("/admin/editorial/actualites");
  refreshPublic();
  return success(undefined, "Actualité supprimée.");
}

// --- Feuille de route ----------------------------------------------------------------

const roadmapSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: optionalText(2000),
  category: z.enum(["platform", "catalog", "apps", "community", "business"]),
  status: z.enum(["planned", "in_progress", "done", "paused"]),
  target_label: optionalText(40),
  progress: z.coerce.number().int().min(0).max(100),
  position: z.coerce.number().int().min(0).max(1000),
});

export async function saveRoadmapItemAction(itemId: string | null, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await adminContext("editorial.write");
  if (!ctx.ok) return ctx.result;
  const parsed = roadmapSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const values = {
    ...parsed.data,
    progress: parsed.data.status === "done" ? 100 : parsed.data.progress,
    is_public: formData.get("is_public") === "on",
    completed_at: parsed.data.status === "done" ? new Date().toISOString() : null,
  };
  const { error } = itemId ? await ctx.supabase.from("roadmap_items").update(values).eq("id", itemId) : await ctx.supabase.from("roadmap_items").insert(values);
  if (error) return failureFromDb(error);
  revalidatePath("/admin/editorial/feuille-de-route");
  revalidatePath("/feuille-de-route");
  return success(undefined, itemId ? "Étape mise à jour." : "Étape ajoutée.");
}

export async function deleteRoadmapItemAction(itemId: string): Promise<ActionResult> {
  const ctx = await adminContext("editorial.write");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase.from("roadmap_items").delete().eq("id", itemId);
  if (error) return failureFromDb(error);
  revalidatePath("/admin/editorial/feuille-de-route");
  revalidatePath("/feuille-de-route");
  return success(undefined, "Étape supprimée.");
}
