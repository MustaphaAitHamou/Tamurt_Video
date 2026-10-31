import "server-only";

import { z } from "zod";

import { getEnv } from "@/lib/env";
import type { PlanTier } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/server/auth/session";
import {
  describeDevice,
  getClientIp,
  getRequestCountry,
  getUserAgent,
  hashIp,
} from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { getStreamingProvider } from "@/server/streaming";
import { signMediaToken } from "@/server/streaming/tokens";
import {
  StreamingUnavailableError,
  type DrmConfiguration,
  type StreamingProviderId,
} from "@/server/streaming/types";

export type PlaybackSubtitle = {
  id: string;
  language: string;
  label: string;
  kind: string;
  isDefault: boolean;
  machineGenerated: boolean;
  url: string;
};

export type PlaybackGranted = {
  ok: true;
  kind: "main" | "trailer";
  sessionId: string | null;
  provider: StreamingProviderId;
  manifestUrl: string;
  expiresAt: string;
  drm: DrmConfiguration[] | null;
  resumePositionSeconds: number;
  durationSeconds: number | null;
  intro: { start: number; end: number } | null;
  creditsStartSeconds: number | null;
  maxQuality: string;
  subtitles: PlaybackSubtitle[];
  preferredSubtitle: string | null;
  autoplayNext: boolean;
  nextEpisode: { id: string; label: string; name: string } | null;
};

export type PlaybackDenied = { ok: false; reason: string; requiredTier: PlanTier | null };

export const playbackRequestSchema = z.object({
  titleId: z.uuid(),
  episodeId: z.uuid().nullish(),
  kind: z.enum(["main", "trailer"]).default("main"),
  /** Session existante à prolonger (renouvellement d'une autorisation expirée). */
  sessionId: z.uuid().nullish(),
});

export type PlaybackRequest = z.infer<typeof playbackRequestSchema>;

/** Durée de validité de l'autorisation : couvre le visionnage complet, bornée entre 2 h et 12 h. */
export function playbackTtlSeconds(durationSeconds: number | null, override?: number) {
  if (override) return override;
  const base = (durationSeconds ?? 3600) * 1.5 + 3600;
  return Math.round(Math.min(Math.max(base, 7200), 43_200));
}

const denied = (reason: string, requiredTier: PlanTier | null = null): PlaybackDenied => ({
  ok: false,
  reason,
  requiredTier,
});

/**
 * Décision et délivrance d'une autorisation de lecture. Tous les contrôles sont
 * effectués côté serveur : identité, compte, droits de diffusion (licence,
 * territoire, période, mode d'exploitation), formule, profil, écrans simultanés.
 */
export async function startPlayback(
  request: PlaybackRequest,
  deviceId: string | null = null,
): Promise<PlaybackGranted | PlaybackDenied> {
  const env = getEnv();
  const admin = createSupabaseAdminClient();
  const [viewer, country, ip] = await Promise.all([
    getViewer(),
    getRequestCountry(),
    getClientIp(),
  ]);

  const limitKey = viewer ? `play:user:${viewer.user.id}` : `play:ip:${hashIp(ip) ?? "unknown"}`;
  const limit = await rateLimit(limitKey, 60, 600);
  if (!limit.allowed) return denied("rate_limited");

  const { data: decision, error } = await admin
    .rpc("check_playback", {
      p_user: (viewer?.user.id ?? null) as string,
      p_viewer_profile: (viewer?.activeProfile.id ?? null) as string,
      p_title: request.titleId,
      p_episode: (request.episodeId ?? null) as string,
      p_country: country,
      p_kind: request.kind,
    })
    .single();
  if (error || !decision) {
    console.error("[playback] check_playback", error?.message);
    return denied("provider_unavailable");
  }
  if (!decision.allowed) return denied(decision.reason, decision.required_tier ?? null);

  let sessionId: string | null = null;
  let resumePosition = 0;
  if (request.kind === "main" && viewer) {
    if (request.sessionId) {
      const { data: existing } = await admin
        .from("watch_history")
        .select("id, last_position_seconds, ended_at, account_id, title_id")
        .eq("id", request.sessionId)
        .maybeSingle();
      if (
        existing &&
        existing.account_id === viewer.user.id &&
        existing.title_id === request.titleId &&
        !existing.ended_at
      ) {
        sessionId = existing.id;
        resumePosition = existing.last_position_seconds;
      }
    }
    if (!sessionId) {
      const { data: session, error: sessionError } = await admin
        .rpc("start_watch_session", {
          p_user: viewer.user.id,
          p_viewer_profile: decision.viewer_profile_id,
          p_title: request.titleId,
          p_episode: (decision.episode_id ?? null) as string,
          p_asset: decision.media_asset_id,
          p_country: country,
          p_device_label: describeDevice(await getUserAgent()),
          p_max_streams: viewer.entitlements.maxStreams,
          p_device_id: (deviceId ?? null) as string,
        })
        .single();
      if (sessionError || !session) {
        console.error("[playback] start_watch_session", sessionError?.message);
        return denied("provider_unavailable");
      }
      if (!session.allowed) return denied("too_many_streams");
      sessionId = session.session_id;
      resumePosition = session.resume_position_seconds ?? 0;
    }
  }

  let grant;
  try {
    const provider = getStreamingProvider(decision.provider);
    grant = await provider.grantPlayback({
      providerAssetId: decision.provider_asset_id,
      ttlSeconds: playbackTtlSeconds(
        decision.duration_seconds ?? null,
        env.streaming.tokenTtlSeconds,
      ),
      country,
    });
  } catch (cause) {
    console.error(
      "[playback] fournisseur",
      cause instanceof StreamingUnavailableError ? cause.message : cause,
    );
    return denied("provider_unavailable");
  }

  // Sous-titres servis par l'application derrière un jeton lié au média et à l'utilisateur.
  const subtitles: PlaybackSubtitle[] = [];
  if (request.kind === "main") {
    const { data: rows } = await admin
      .from("subtitles")
      .select("id, language, label, kind, is_default, is_machine_generated")
      .eq("media_asset_id", decision.media_asset_id)
      .order("language");
    if (rows?.length) {
      const token = await signMediaToken(
        { sub: decision.media_asset_id, uid: viewer?.user.id ?? null },
        env.streaming.mediaTokenSecret,
        playbackTtlSeconds(decision.duration_seconds ?? null),
      );
      for (const row of rows) {
        subtitles.push({
          id: row.id,
          language: row.language,
          label: row.label,
          kind: row.kind,
          isDefault: row.is_default,
          machineGenerated: row.is_machine_generated,
          url: `/api/subtitles/${row.id}?token=${encodeURIComponent(token)}`,
        });
      }
    }
  }

  let nextEpisode: PlaybackGranted["nextEpisode"] = null;
  if (decision.episode_id) {
    const { data: nextId } = await admin.rpc("next_episode", { p_episode: decision.episode_id });
    if (nextId) {
      const { data: next } = await admin
        .from("episodes")
        .select("id, name, episode_number, seasons(season_number)")
        .eq("id", nextId)
        .maybeSingle();
      if (next) {
        const season = (next.seasons as { season_number: number } | null)?.season_number ?? 1;
        nextEpisode = {
          id: next.id,
          name: next.name,
          label: `S${season} · É${next.episode_number}`,
        };
      }
    }
  }

  const intro =
    decision.intro_start_seconds !== null && decision.intro_end_seconds !== null
      ? { start: decision.intro_start_seconds, end: decision.intro_end_seconds }
      : null;

  return {
    ok: true,
    kind: request.kind,
    sessionId,
    provider: decision.provider,
    manifestUrl: grant.manifestUrl,
    expiresAt: grant.expiresAt.toISOString(),
    drm: grant.drm,
    resumePositionSeconds: resumePosition,
    durationSeconds: decision.duration_seconds ?? null,
    intro,
    creditsStartSeconds: decision.credits_start_seconds ?? null,
    maxQuality: decision.max_quality ?? "hd",
    subtitles,
    preferredSubtitle: viewer?.profile.subtitleLocale ?? null,
    autoplayNext: viewer?.profile.autoplayNext ?? true,
    nextEpisode,
  };
}
