import { NextResponse, type NextRequest } from "next/server";

import { getEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyAssetStatus } from "@/server/media";
import { verifyCloudflareWebhook } from "@/server/streaming/cloudflare-provider";

/** Notification Cloudflare Stream (vidéo prête ou en erreur), signature vérifiée. */
export async function POST(request: NextRequest) {
  const secret = getEnv().streaming.cloudflare.webhookSecret;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const rawBody = await request.text();
  if (!verifyCloudflareWebhook(rawBody, request.headers.get("webhook-signature"), secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }
  let payload: {
    uid?: string;
    readyToStream?: boolean;
    duration?: number;
    input?: { width?: number; height?: number };
    status?: { state?: string; errorReasonText?: string };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!payload.uid) return NextResponse.json({ error: "missing_uid" }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { data: asset } = await admin
    .from("media_assets")
    .select("id")
    .eq("provider", "cloudflare_stream")
    .eq("provider_asset_id", payload.uid)
    .maybeSingle();
  if (!asset) return NextResponse.json({ status: "unknown_asset" });
  const status = await applyAssetStatus(admin, asset.id, {
    state: payload.readyToStream
      ? "ready"
      : payload.status?.state === "error"
        ? "error"
        : "processing",
    durationSeconds:
      payload.duration && payload.duration > 0 ? Math.round(payload.duration) : undefined,
    width: payload.input?.width,
    height: payload.input?.height,
    errorMessage: payload.status?.errorReasonText,
  });
  return NextResponse.json({ status });
}
