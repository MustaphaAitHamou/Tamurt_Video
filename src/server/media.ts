import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { AssetStatus } from "@/server/streaming/types";

/**
 * Applique l'état d'un média et, lorsqu'il est prêt, le rattache à son œuvre
 * ou à son épisode (vidéo principale ou bande-annonce).
 */
export async function applyAssetStatus(
  admin: AdminSupabaseClient,
  assetId: string,
  status: AssetStatus,
) {
  const { data: asset } = await admin
    .from("media_assets")
    .select("id, kind, title_id, episode_id, status")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset) return null;
  const nextStatus =
    status.state === "ready" ? "ready" : status.state === "error" ? "error" : "processing";
  await admin
    .from("media_assets")
    .update({
      status: nextStatus,
      duration_seconds: status.durationSeconds ?? null,
      width: status.width ?? null,
      height: status.height ?? null,
      error_message: status.errorMessage ?? null,
      ...(nextStatus === "ready"
        ? {
            ready_at: new Date().toISOString(),
            qualities: status.height ? [`${status.height}p`] : [],
          }
        : {}),
    })
    .eq("id", asset.id);

  if (nextStatus === "ready") {
    if (asset.kind === "trailer" && asset.title_id) {
      await admin.from("titles").update({ trailer_asset_id: asset.id }).eq("id", asset.title_id);
    } else if (asset.kind === "main" && asset.episode_id) {
      await admin.from("episodes").update({ main_asset_id: asset.id }).eq("id", asset.episode_id);
    } else if (asset.kind === "main" && asset.title_id) {
      await admin.from("titles").update({ main_asset_id: asset.id }).eq("id", asset.title_id);
    }
  }
  return nextStatus;
}
