"use server";

import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminContext, uuidPattern } from "@/server/admin/guard";
import { logAudit } from "@/server/audit";
import { failure, failureFromDb, success, type ActionResult } from "@/server/errors";
import { applyAssetStatus } from "@/server/media";
import { getStreamingProvider, getUploadProvider } from "@/server/streaming";
import { devAssetFolder } from "@/server/streaming/dev-provider";

const targetSchema = z.object({
  titleId: z.uuid(),
  episodeId: z.uuid().nullable(),
  kind: z.enum(["main", "trailer"]),
});

/** Une vidéo ne peut être importée que pour une œuvre couverte par une licence signée. */
async function assertLicensed(titleId: string, kind: "main" | "trailer") {
  const { data } = await createSupabaseAdminClient()
    .from("licenses")
    .select("id, exploitation_modes")
    .eq("title_id", titleId)
    .eq("status", "signed")
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`);
  const valid = (data ?? []).filter((l) => (kind === "trailer" ? true : l.exploitation_modes.some((m) => ["svod", "avod", "free"].includes(m))));
  return valid[0]?.id ?? null;
}

export async function createVideoUploadAction(input: {
  titleId: string;
  episodeId: string | null;
  kind: "main" | "trailer";
  fileName: string;
  sizeBytes: number;
  attestation: boolean;
}): Promise<ActionResult<{ uploadUrl: string; assetId: string }>> {
  const ctx = await adminContext("media.upload");
  if (!ctx.ok) return ctx.result;
  const target = targetSchema.safeParse(input);
  if (!target.success) return failure("Cible invalide.", "VALIDATION");
  if (!input.attestation) return failure("L'attestation de droits est obligatoire.", "ATTESTATION_REQUIRED");
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > 30 * 1024 ** 3) return failure("Taille de fichier invalide (30 Go maximum).", "VALIDATION");
  const licenseId = await assertLicensed(target.data.titleId, target.data.kind);
  if (!licenseId) return failure("Aucune licence signée et valide n'autorise la diffusion de cette œuvre : enregistrez d'abord les droits.", "LICENSE_REQUIRED");

  const provider = getUploadProvider();
  if (!provider.createDirectUpload) {
    return failure("L'import réel nécessite Cloudflare Stream. En développement, associez un média de test.", "PROVIDER_UNSUPPORTED");
  }
  let upload;
  try {
    upload = await provider.createDirectUpload({
      fileName: input.fileName.slice(0, 200),
      sizeBytes: input.sizeBytes,
      maxDurationSeconds: 6 * 3600,
      creatorId: ctx.viewer.user.id,
    });
  } catch (error) {
    console.error("[media] direct upload", error);
    return failure("Le service vidéo n'a pas pu préparer l'envoi.", "PROVIDER_ERROR");
  }
  const { data, error } = await ctx.supabase
    .from("media_assets")
    .insert({
      provider: "cloudflare_stream",
      provider_asset_id: upload.providerAssetId,
      kind: target.data.kind,
      status: "pending_upload",
      title_id: target.data.titleId,
      episode_id: target.data.episodeId,
      original_filename: input.fileName.slice(0, 200),
      size_bytes: input.sizeBytes,
      rights_attestation: { attested_by: ctx.viewer.user.id, attested_at: new Date().toISOString(), license_id: licenseId },
      created_by: ctx.viewer.user.id,
    })
    .select("id")
    .single();
  if (error) return failureFromDb(error);
  return success({ uploadUrl: upload.uploadUrl, assetId: data.id });
}

export async function refreshMediaStatusAction(assetId: string): Promise<ActionResult<{ status: string }>> {
  const ctx = await adminContext("media.upload");
  if (!ctx.ok) return ctx.result;
  if (!uuidPattern.test(assetId)) return failure("Média invalide.", "VALIDATION");
  const admin = createSupabaseAdminClient();
  const { data: asset } = await admin.from("media_assets").select("provider, provider_asset_id, title_id").eq("id", assetId).maybeSingle();
  if (!asset?.provider_asset_id) return failure("Média introuvable.", "NOT_FOUND");
  const provider = getStreamingProvider(asset.provider);
  if (!provider.getAssetStatus) return success({ status: "ready" });
  try {
    const status = await applyAssetStatus(admin, assetId, await provider.getAssetStatus(asset.provider_asset_id));
    if (asset.title_id) revalidatePath(`/admin/catalogue/${asset.title_id}`);
    return success({ status: status ?? "unknown" });
  } catch (error) {
    console.error("[media] statut", error);
    return failure("Statut indisponible pour le moment.", "PROVIDER_ERROR");
  }
}

/** Liste des médias de test générés localement (pnpm media:dev). */
export async function listDevMediaFolders(): Promise<string[]> {
  if (getEnv().streaming.provider !== "dev") return [];
  try {
    const entries = await readdir(path.join(process.cwd(), "dev-media"), { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() && devAssetFolder(e.name) === e.name).map((e) => e.name);
  } catch {
    return [];
  }
}

/** Développement : associe un média synthétique local (contenu sans droits tiers). */
export async function attachDevMediaAction(input: { titleId: string; episodeId: string | null; kind: "main" | "trailer"; folder: string }): Promise<ActionResult> {
  const ctx = await adminContext("media.upload");
  if (!ctx.ok) return ctx.result;
  if (getEnv().streaming.provider !== "dev") return failure("Disponible uniquement avec le fournisseur de développement.", "DEV_ONLY");
  const target = targetSchema.safeParse(input);
  const folder = devAssetFolder(input.folder);
  if (!target.success || !folder || !(await listDevMediaFolders()).includes(folder)) return failure("Média de test introuvable.", "VALIDATION");
  const admin = createSupabaseAdminClient();
  const { data, error } = await ctx.supabase
    .from("media_assets")
    .insert({
      provider: "dev_local",
      provider_asset_id: `${folder}#${randomUUID()}`,
      kind: target.data.kind,
      status: "processing",
      title_id: target.data.titleId,
      episode_id: target.data.episodeId,
      original_filename: `${folder}/master.m3u8`,
      rights_attestation: { type: "synthetic_test_media", attested_by: ctx.viewer.user.id, attested_at: new Date().toISOString() },
      created_by: ctx.viewer.user.id,
    })
    .select("id")
    .single();
  if (error) return failureFromDb(error);
  await applyAssetStatus(admin, data.id, { state: "ready", durationSeconds: 90, height: 720, width: 1280 });
  await logAudit({ actorId: ctx.viewer.user.id, action: "media.dev_attached", entityType: "media_asset", entityId: data.id });
  revalidatePath(`/admin/catalogue/${target.data.titleId}`);
  return success(undefined, "Média de test associé.");
}
