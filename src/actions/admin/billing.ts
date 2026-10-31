"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/format";
import { adminContext, uuidPattern } from "@/server/admin/guard";
import { logAudit } from "@/server/audit";
import { failure, failureFromDb, fromZodError, success, type ActionResult } from "@/server/errors";
import { getPaymentProvider } from "@/server/payments";
import { estimateFeeCents, syncSubscription, upsertInvoice } from "@/server/payments/sync";
import type { ProviderEvent } from "@/server/payments/types";
import { applyProviderEvent } from "@/server/payments/webhook";
import { getSettings } from "@/server/settings";

function refresh() {
  revalidatePath("/admin/abonnements");
  revalidatePath("/offres");
  revalidatePath("/fondateurs");
  revalidatePath("/", "layout");
}

const planSchema = z.object({
  name: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(160).optional(),
  description: z.string().trim().max(1000).optional(),
  features: z.string().max(3000).optional(),
  max_streams: z.coerce.number().int().min(1).max(10),
  max_profiles: z.coerce.number().int().min(1).max(10),
  max_quality: z.enum(["sd", "hd", "fhd", "uhd"]),
  sort_order: z.coerce.number().int().min(0).max(100),
});

/** Présentation et limites d'une formule. Le prix se modifie séparément (historisé). */
export async function updatePlanAction(
  planId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await adminContext("billing.manage");
  if (!ctx.ok) return ctx.result;
  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const phases = formData
    .getAll("phases")
    .map(String)
    .filter((p) => p === "founder" || p === "commercial");
  if (phases.length === 0)
    return failure("Choisissez au moins une phase de commercialisation.", "VALIDATION");
  const features = (parsed.data.features ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);
  const { error } = await ctx.supabase
    .from("subscription_plans")
    .update({
      name: parsed.data.name,
      tagline: parsed.data.tagline || null,
      description: parsed.data.description || null,
      features,
      max_streams: parsed.data.max_streams,
      max_profiles: parsed.data.max_profiles,
      max_quality: parsed.data.max_quality,
      sort_order: parsed.data.sort_order,
      includes_ads: formData.get("includes_ads") === "on",
      is_active: formData.get("is_active") === "on",
      is_public: formData.get("is_public") === "on",
      available_in_phases: phases,
    })
    .eq("id", planId);
  if (error) return failureFromDb(error);
  refresh();
  return success(undefined, "Formule mise à jour.");
}

/** Crée le prix chez Stripe (mode test tant que les paiements réels ne sont pas autorisés). */
async function syncCurrentPrice(planId: string) {
  const provider = getPaymentProvider();
  if (!provider)
    return {
      synced: false as const,
      reason:
        "Paiements non configurés : le prix sera synchronisé quand des clés Stripe de test seront renseignées.",
    };
  const admin = createSupabaseAdminClient();
  const { data: plan } = await admin
    .from("subscription_plans")
    .select("id, code, name, provider_product_id, billing_interval")
    .eq("id", planId)
    .single();
  const { data: price } = await admin
    .from("plan_prices")
    .select("id, amount_cents, currency, provider_price_id")
    .eq("plan_id", planId)
    .eq("is_current", true)
    .single();
  if (!plan || !price) return { synced: false as const, reason: "Prix courant introuvable." };
  if (price.provider_price_id) return { synced: true as const, priceId: price.provider_price_id };
  const result = await provider.ensurePrice({
    planCode: plan.code,
    planName: plan.name,
    productId: plan.provider_product_id,
    amountCents: price.amount_cents,
    currency: price.currency,
    interval: plan.billing_interval === "year" ? "year" : "month",
    idempotencyKey: price.id,
  });
  await admin.from("plan_prices").update({ provider_price_id: result.priceId }).eq("id", price.id);
  if (!plan.provider_product_id)
    await admin
      .from("subscription_plans")
      .update({ provider_product_id: result.productId })
      .eq("id", plan.id);
  return { synced: true as const, priceId: result.priceId, testMode: provider.testMode };
}

/**
 * Nouveau prix pour les FUTURES souscriptions. Les abonnements en cours (et en
 * particulier les fondateurs) conservent leur tarif : aucune hausse automatique.
 */
export async function setPlanPriceAction(
  planId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await adminContext("billing.manage");
  if (!ctx.ok) return ctx.result;
  const amount = Number(String(formData.get("amount") ?? "").replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000)
    return failure("Montant invalide (en euros, TTC).", "VALIDATION", {
      amount: ["Montant invalide"],
    });
  if (formData.get("acknowledge") !== "on")
    return failure(
      "Confirmez avoir compris que le prix ne s'applique qu'aux nouvelles souscriptions.",
      "VALIDATION",
      { acknowledge: ["Requis"] },
    );
  const cents = Math.round(amount * 100);
  const { error } = await ctx.supabase.rpc("admin_set_plan_price", {
    p_plan: planId,
    p_amount_cents: cents,
  });
  if (error) return failureFromDb(error);
  let note: string;
  try {
    const sync = await syncCurrentPrice(planId);
    note = sync.synced
      ? ` Prix créé chez Stripe${"testMode" in sync && sync.testMode ? " (mode test)" : ""}.`
      : ` ${sync.reason}`;
  } catch (cause) {
    console.error("[billing] synchronisation du prix", cause);
    note = " La synchronisation Stripe a échoué : relancez-la depuis cette page.";
  }
  await logAudit({
    actorId: ctx.viewer.user.id,
    action: "billing.plan_price_changed",
    entityType: "subscription_plan",
    entityId: planId,
    metadata: { amount_cents: cents },
  });
  refresh();
  return success(
    undefined,
    `Nouveau prix : ${formatPrice(cents)} pour les nouvelles souscriptions.${note}`,
  );
}

export async function syncPlanPriceAction(planId: string): Promise<ActionResult> {
  const ctx = await adminContext("billing.manage");
  if (!ctx.ok) return ctx.result;
  try {
    const sync = await syncCurrentPrice(planId);
    refresh();
    return sync.synced
      ? success(undefined, "Prix synchronisé avec Stripe.")
      : failure(sync.reason, "PAYMENTS_DISABLED");
  } catch (cause) {
    console.error("[billing] synchronisation du prix", cause);
    return failure(
      "Stripe n'a pas pu créer le prix. Vérifiez la configuration (clés de test).",
      "PROVIDER_ERROR",
    );
  }
}

/** Résiliation par l'équipe (à l'échéance ou immédiate) ou annulation d'une résiliation programmée. */
export async function adminCancelSubscriptionAction(
  subscriptionId: string,
  mode: "period_end" | "immediate" | "revoke",
  reason?: string,
): Promise<ActionResult> {
  const ctx = await adminContext("billing.manage");
  if (!ctx.ok) return ctx.result;
  if (!uuidPattern.test(subscriptionId)) return failure("Abonnement invalide.", "VALIDATION");
  const provider = getPaymentProvider();
  if (!provider) return failure("Les paiements ne sont pas configurés.", "PAYMENTS_DISABLED");
  const admin = createSupabaseAdminClient();
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("id, provider, provider_subscription_id, user_id")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (!subscription?.provider_subscription_id || subscription.provider !== "stripe")
    return failure("Abonnement Stripe introuvable.", "NOT_FOUND");
  try {
    if (mode === "immediate") {
      await provider.cancelImmediately(subscription.provider_subscription_id);
      await syncSubscription(provider, admin, subscription.provider_subscription_id);
    } else {
      const state = await provider.setCancelAtPeriodEnd(
        subscription.provider_subscription_id,
        mode === "period_end",
      );
      await syncSubscription(provider, admin, subscription.provider_subscription_id, state);
    }
  } catch (cause) {
    console.error("[billing] résiliation (admin)", cause);
    return failure("Le prestataire de paiement a refusé l'opération.", "PROVIDER_ERROR");
  }
  await logAudit({
    actorId: ctx.viewer.user.id,
    action: `billing.admin_${mode}`,
    entityType: "subscription",
    entityId: subscriptionId,
    metadata: { reason: reason ?? null, user_id: subscription.user_id },
  });
  refresh();
  return success(
    undefined,
    mode === "revoke"
      ? "Résiliation annulée."
      : mode === "immediate"
        ? "Abonnement résilié immédiatement."
        : "Résiliation programmée à l'échéance.",
  );
}

/** Remboursement total ou partiel d'une facture (mode test par défaut). */
export async function refundInvoiceAction(
  invoiceId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await adminContext("billing.manage");
  if (!ctx.ok) return ctx.result;
  const parsed = z
    .object({ amount: z.string().min(1), reason: z.string().trim().min(3).max(500) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const provider = getPaymentProvider();
  if (!provider) return failure("Les paiements ne sont pas configurés.", "PAYMENTS_DISABLED");
  const admin = createSupabaseAdminClient();
  const { data: invoice } = await admin
    .from("invoices")
    .select("id, user_id, provider_invoice_id, amount_paid_cents, amount_refunded_cents, currency")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice) return failure("Facture introuvable.", "NOT_FOUND");
  const cents = Math.round(Number(parsed.data.amount.replace(",", ".")) * 100);
  const refundable = invoice.amount_paid_cents - invoice.amount_refunded_cents;
  if (!Number.isFinite(cents) || cents <= 0 || cents > refundable)
    return failure(
      `Montant invalide (maximum ${formatPrice(refundable, invoice.currency)}).`,
      "VALIDATION",
    );
  let refund: { refundId: string; status: string };
  try {
    refund = await provider.refundInvoice({
      invoiceId: invoice.provider_invoice_id,
      amountCents: cents,
      reason: parsed.data.reason,
    });
  } catch (cause) {
    console.error("[billing] remboursement", cause);
    return failure(
      "Le remboursement a été refusé par le prestataire de paiement.",
      "PROVIDER_ERROR",
    );
  }
  await admin.from("refunds").insert({
    invoice_id: invoice.id,
    user_id: invoice.user_id,
    provider: "stripe",
    provider_refund_id: refund.refundId,
    amount_cents: cents,
    currency: invoice.currency,
    reason: parsed.data.reason,
    status: refund.status,
    created_by: ctx.viewer.user.id,
  });
  try {
    const settings = await getSettings();
    const state = await provider.retrieveInvoice(invoice.provider_invoice_id);
    await upsertInvoice(
      admin,
      state,
      estimateFeeCents(
        state.amountPaidCents,
        settings.paymentFeePercent,
        settings.paymentFeeFixedCents,
      ),
    );
  } catch (cause) {
    console.error("[billing] rafraîchissement facture", cause);
  }
  await logAudit({
    actorId: ctx.viewer.user.id,
    action: "billing.refund",
    entityType: "invoice",
    entityId: invoice.id,
    metadata: { amount_cents: cents, test_mode: provider.testMode },
  });
  refresh();
  return success(
    undefined,
    `Remboursement de ${formatPrice(cents, invoice.currency)} demandé${provider.testMode ? " (mode test)" : ""}.`,
  );
}

/** Relance le traitement d'un événement de paiement en échec, à partir de l'état actuel chez Stripe. */
export async function reprocessPaymentEventAction(eventRowId: string): Promise<ActionResult> {
  const ctx = await adminContext("billing.manage");
  if (!ctx.ok) return ctx.result;
  const provider = getPaymentProvider();
  if (!provider) return failure("Les paiements ne sont pas configurés.", "PAYMENTS_DISABLED");
  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("payment_events")
    .select("id, event_id, event_type, payload, livemode, status")
    .eq("id", eventRowId)
    .maybeSingle();
  if (!row) return failure("Événement introuvable.", "NOT_FOUND");
  if (row.livemode && provider.testMode)
    return failure(
      "Événement en mode réel : non traité tant que les paiements réels ne sont pas autorisés.",
      "LIVE_MODE",
    );
  const payload = row.payload as { created?: number; data?: { object?: Record<string, unknown> } };
  const object = payload.data?.object ?? {};
  const event: ProviderEvent = {
    id: row.event_id,
    type: row.event_type,
    createdAt: new Date((payload.created ?? Date.now() / 1000) * 1000),
    livemode: row.livemode,
    objectId: typeof object.id === "string" ? object.id : null,
    object,
    raw: payload,
  };
  try {
    const settings = await getSettings();
    const result = await applyProviderEvent(event, {
      provider,
      admin,
      feeModel: { percent: settings.paymentFeePercent, fixedCents: settings.paymentFeeFixedCents },
    });
    await admin.rpc("complete_payment_event", {
      p_event_row_id: row.id,
      p_status: result.outcome,
      p_related_user: (result.userId ?? null) as string,
      p_related_subscription: (result.subscriptionId ?? null) as string,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    await admin.rpc("complete_payment_event", {
      p_event_row_id: row.id,
      p_status: "failed",
      p_error: message,
    });
    return failure(`Nouvel échec : ${message}`, "PROVIDER_ERROR");
  }
  await logAudit({
    actorId: ctx.viewer.user.id,
    action: "billing.event_reprocessed",
    entityType: "payment_event",
    entityId: row.id,
  });
  revalidatePath("/admin/abonnements/evenements");
  return success(undefined, "Événement retraité.");
}
