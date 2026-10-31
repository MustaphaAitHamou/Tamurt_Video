import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { estimateFeeCents, syncSubscription, upsertInvoice } from "@/server/payments/sync";
import type { PaymentProvider, ProviderEvent } from "@/server/payments/types";

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
]);

const INVOICE_EVENTS = new Set([
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "invoice.finalized",
  "invoice.updated",
  "invoice.voided",
  "invoice.marked_uncollectible",
]);

export type WebhookDeps = {
  provider: PaymentProvider;
  admin: AdminSupabaseClient;
  feeModel: { percent: number; fixedCents: number };
};

/** Applique un événement du prestataire. Retourne « ignored » pour les types non gérés. */
export async function applyProviderEvent(
  event: ProviderEvent,
  deps: WebhookDeps,
): Promise<{ outcome: "processed" | "ignored"; userId?: string; subscriptionId?: string }> {
  const object = event.object;

  if (SUBSCRIPTION_EVENTS.has(event.type) && event.objectId) {
    const result = await syncSubscription(deps.provider, deps.admin, event.objectId);
    return { outcome: "processed", userId: result.userId, subscriptionId: result.subscriptionId };
  }

  if (event.type === "checkout.session.completed") {
    if (object.mode !== "subscription" || typeof object.subscription !== "string")
      return { outcome: "ignored" };
    const userId =
      typeof object.client_reference_id === "string" ? object.client_reference_id : null;
    const customerId = typeof object.customer === "string" ? object.customer : null;
    if (userId && customerId) {
      await deps.admin
        .from("billing_customers")
        .upsert(
          { user_id: userId, provider: "stripe", provider_customer_id: customerId },
          { onConflict: "user_id" },
        );
    }
    const result = await syncSubscription(deps.provider, deps.admin, object.subscription);
    return { outcome: "processed", userId: result.userId, subscriptionId: result.subscriptionId };
  }

  if (INVOICE_EVENTS.has(event.type) && event.objectId) {
    const invoice = await deps.provider.retrieveInvoice(event.objectId);
    let synced: { userId?: string; subscriptionId?: string } = {};
    // L'abonnement d'abord, pour que la facture puisse y être rattachée.
    if (invoice.providerSubscriptionId) {
      const result = await syncSubscription(
        deps.provider,
        deps.admin,
        invoice.providerSubscriptionId,
      );
      synced = { userId: result.userId, subscriptionId: result.subscriptionId };
    }
    await upsertInvoice(
      deps.admin,
      invoice,
      estimateFeeCents(invoice.amountPaidCents, deps.feeModel.percent, deps.feeModel.fixedCents),
    );
    return { outcome: "processed", ...synced };
  }

  return { outcome: "ignored" };
}
