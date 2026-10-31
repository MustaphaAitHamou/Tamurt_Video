import { NextResponse, type NextRequest } from "next/server";

import { getEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/server/payments";
import { applyProviderEvent } from "@/server/payments/webhook";
import { getSettings } from "@/server/settings";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Webhook Stripe : signature vérifiée, traitement idempotent (événement
 * réservé en base avant traitement), journalisé dans payment_events.
 * Codes de réponse : 2xx = traité ou doublon ; 409 = traitement concurrent
 * en cours ; 5xx = échec, Stripe renverra l'événement.
 */
export async function POST(request: NextRequest) {
  const provider = getPaymentProvider();
  if (!provider) return NextResponse.json({ error: "payments_disabled" }, { status: 503 });

  const rawBody = await request.text();
  let event;
  try {
    event = provider.parseWebhook(rawBody, request.headers.get("stripe-signature"));
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const env = getEnv();
  const { data: claim, error: claimError } = await admin
    .rpc("claim_payment_event", {
      p_provider: "stripe",
      p_event_id: event.id,
      p_event_type: event.type,
      p_event_created_at: event.createdAt.toISOString(),
      p_livemode: event.livemode,
      p_payload: event.raw as Json,
    })
    .single();
  if (claimError || !claim) {
    console.error("[stripe-webhook] réservation impossible", claimError?.message);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 500 });
  }
  if (!claim.should_process) {
    return claim.previous_status === "processing"
      ? NextResponse.json({ status: "in_progress" }, { status: 409 })
      : NextResponse.json({ status: "duplicate" });
  }

  // Un événement « live » ne doit jamais être appliqué tant que le mode réel n'est pas validé.
  if (event.livemode && !env.payments.liveModeAllowed) {
    await admin.rpc("complete_payment_event", { p_event_row_id: claim.event_row_id, p_status: "ignored", p_error: "Événement live refusé (mode test)." });
    return NextResponse.json({ status: "ignored" });
  }

  try {
    const settings = await getSettings();
    const result = await applyProviderEvent(event, {
      provider,
      admin,
      feeModel: { percent: settings.paymentFeePercent, fixedCents: settings.paymentFeeFixedCents },
    });
    await admin.rpc("complete_payment_event", {
      p_event_row_id: claim.event_row_id,
      p_status: result.outcome,
      p_related_user: (result.userId ?? null) as string,
      p_related_subscription: (result.subscriptionId ?? null) as string,
    });
    return NextResponse.json({ status: result.outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe-webhook]", event.type, message);
    await admin.rpc("complete_payment_event", { p_event_row_id: claim.event_row_id, p_status: "failed", p_error: message });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
