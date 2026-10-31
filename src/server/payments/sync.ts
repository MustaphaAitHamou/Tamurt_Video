import "server-only";

import { formatDate, formatPrice } from "@/lib/format";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/server/email/dispatcher";
import type {
  PaymentProvider,
  ProviderInvoiceState,
  ProviderSubscriptionState,
} from "@/server/payments/types";

export type SubscriptionTransition =
  | "activated"
  | "payment_failed"
  | "cancellation_scheduled"
  | "cancellation_revoked"
  | "canceled"
  | "plan_changed";

type PreviousState = { status: string; cancel_at_period_end: boolean; plan_id: string } | null;

/** Transitions métier entre l'état enregistré et le nouvel état (fonction pure, testée). */
export function detectTransitions(
  previous: PreviousState,
  next: { status: string; cancelAtPeriodEnd: boolean; planId: string },
): SubscriptionTransition[] {
  const transitions: SubscriptionTransition[] = [];
  const wasLive = previous !== null && ["active", "trialing", "past_due"].includes(previous.status);
  const isLive = ["active", "trialing"].includes(next.status);
  if (!wasLive && isLive) transitions.push("activated");
  if (previous && ["active", "trialing"].includes(previous.status) && next.status === "past_due")
    transitions.push("payment_failed");
  if (
    previous &&
    !previous.cancel_at_period_end &&
    next.cancelAtPeriodEnd &&
    next.status !== "canceled"
  )
    transitions.push("cancellation_scheduled");
  if (previous && previous.cancel_at_period_end && !next.cancelAtPeriodEnd && isLive)
    transitions.push("cancellation_revoked");
  if (previous && previous.status !== "canceled" && next.status === "canceled")
    transitions.push("canceled");
  if (previous && previous.plan_id !== next.planId && isLive && wasLive)
    transitions.push("plan_changed");
  return transitions;
}

async function resolveUserId(admin: AdminSupabaseClient, state: ProviderSubscriptionState) {
  if (state.userId) return state.userId;
  const { data } = await admin
    .from("billing_customers")
    .select("user_id")
    .eq("provider", "stripe")
    .eq("provider_customer_id", state.providerCustomerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

/**
 * Synchronise un abonnement à partir de son état courant chez le prestataire.
 * L'état est toujours relu via l'API : l'ordre d'arrivée des webhooks n'a pas
 * d'importance, et un état plus ancien ne peut pas écraser un état plus récent.
 */
export async function syncSubscription(
  provider: PaymentProvider,
  admin: AdminSupabaseClient,
  providerSubscriptionId: string,
  knownState?: ProviderSubscriptionState,
) {
  const state = knownState ?? (await provider.retrieveSubscription(providerSubscriptionId));
  const userId = await resolveUserId(admin, state);
  if (!userId)
    throw new Error(
      `UNKNOWN_CUSTOMER: client ${state.providerCustomerId} non rattaché à un compte.`,
    );

  const { data: previous } = await admin
    .from("subscriptions")
    .select("status, cancel_at_period_end, plan_id")
    .eq("provider", "stripe")
    .eq("provider_subscription_id", state.providerSubscriptionId)
    .maybeSingle();

  const { data: applied, error } = await admin
    .rpc("upsert_provider_subscription", {
      p_user: userId,
      p_provider: "stripe",
      p_provider_subscription_id: state.providerSubscriptionId,
      p_provider_customer_id: state.providerCustomerId,
      p_provider_price_id: state.providerPriceId,
      p_status: state.status,
      p_unit_amount_cents: state.unitAmountCents,
      p_currency: state.currency,
      p_current_period_start: state.currentPeriodStart?.toISOString() as string,
      p_current_period_end: state.currentPeriodEnd?.toISOString() as string,
      p_cancel_at_period_end: state.cancelAtPeriodEnd,
      p_cancel_at: state.cancelAt?.toISOString() as string,
      p_canceled_at: state.canceledAt?.toISOString() as string,
      p_ended_at: state.endedAt?.toISOString() as string,
      p_trial_end: state.trialEnd?.toISOString() as string,
      p_state_at: new Date().toISOString(),
    })
    .single();
  if (error || !applied) throw new Error(error?.message ?? "Synchronisation impossible.");

  await admin
    .from("billing_customers")
    .upsert(
      { user_id: userId, provider: "stripe", provider_customer_id: state.providerCustomerId },
      { onConflict: "user_id" },
    );

  if (!applied.applied)
    return {
      subscriptionId: applied.subscription_id,
      userId,
      transitions: [] as SubscriptionTransition[],
    };

  const { data: current } = await admin
    .from("subscriptions")
    .select("plan_id, subscription_plans(name)")
    .eq("id", applied.subscription_id)
    .single();
  const planName = (current?.subscription_plans as { name: string } | null)?.name ?? "Tamurt Vidéo";
  const transitions = detectTransitions(previous, {
    status: state.status,
    cancelAtPeriodEnd: state.cancelAtPeriodEnd,
    planId: current?.plan_id ?? "",
  });
  const price = formatPrice(state.unitAmountCents, state.currency);
  const periodEnd = state.currentPeriodEnd ? formatDate(state.currentPeriodEnd) : "";

  for (const transition of transitions) {
    switch (transition) {
      case "activated":
        await notifyUser({
          userId,
          type: "billing.subscription_confirmed",
          title: `Abonnement ${planName} confirmé`,
          body: `Votre abonnement ${planName} (${price} par mois, facturé en ${state.currency}) est actif.${periodEnd ? ` Prochain renouvellement le ${periodEnd}.` : ""}`,
          link: "/compte/abonnement",
          email: true,
        });
        break;
      case "payment_failed":
        await notifyUser({
          userId,
          type: "billing.payment_failed",
          title: "Échec du paiement de votre abonnement",
          body: "Le dernier paiement n'a pas abouti. Votre accès est maintenu pendant la période de grâce : mettez à jour votre moyen de paiement.",
          link: "/compte/abonnement",
          email: true,
        });
        break;
      case "cancellation_scheduled":
        await notifyUser({
          userId,
          type: "billing.cancellation_scheduled",
          title: "Résiliation programmée",
          body: `Votre abonnement ${planName} prendra fin le ${periodEnd}. Vous gardez l'accès jusqu'à cette date.`,
          link: "/compte/abonnement",
          email: true,
        });
        break;
      case "canceled":
        await notifyUser({
          userId,
          type: "billing.subscription_canceled",
          title: "Votre abonnement a pris fin",
          body: `Votre abonnement ${planName} est terminé.`,
          link: "/offres",
          email: true,
        });
        break;
      case "plan_changed":
        await notifyUser({
          userId,
          type: "billing.plan_changed",
          title: `Nouvelle formule : ${planName}`,
          body: `Votre abonnement est passé à la formule ${planName} (${price} par mois).`,
          link: "/compte/abonnement",
          email: true,
        });
        break;
      case "cancellation_revoked":
        await notifyUser({
          userId,
          type: "billing.plan_changed",
          title: "Abonnement réactivé",
          body: "La résiliation programmée a été annulée : votre abonnement continue.",
          link: "/compte/abonnement",
        });
        break;
    }
  }
  return { subscriptionId: applied.subscription_id, userId, transitions };
}

/** Enregistre ou met à jour une facture (historique des paiements). */
export async function upsertInvoice(
  admin: AdminSupabaseClient,
  invoice: ProviderInvoiceState,
  estimatedFeeCents: number | null,
) {
  let userId: string | null = null;
  if (invoice.providerCustomerId) {
    const { data } = await admin
      .from("billing_customers")
      .select("user_id")
      .eq("provider", "stripe")
      .eq("provider_customer_id", invoice.providerCustomerId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  let subscriptionId: string | null = null;
  if (invoice.providerSubscriptionId) {
    const { data } = await admin
      .from("subscriptions")
      .select("id")
      .eq("provider", "stripe")
      .eq("provider_subscription_id", invoice.providerSubscriptionId)
      .maybeSingle();
    subscriptionId = data?.id ?? null;
  }
  const { error } = await admin.from("invoices").upsert(
    {
      user_id: userId,
      subscription_id: subscriptionId,
      provider: "stripe",
      provider_invoice_id: invoice.providerInvoiceId,
      number: invoice.number,
      status: invoice.status,
      currency: invoice.currency,
      amount_due_cents: invoice.amountDueCents,
      amount_paid_cents: invoice.amountPaidCents,
      tax_cents: invoice.taxCents,
      fee_cents: invoice.amountPaidCents > 0 ? estimatedFeeCents : null,
      hosted_invoice_url: invoice.hostedInvoiceUrl,
      invoice_pdf_url: invoice.invoicePdfUrl,
      billing_reason: invoice.billingReason,
      period_start: invoice.periodStart?.toISOString() ?? null,
      period_end: invoice.periodEnd?.toISOString() ?? null,
      paid_at: invoice.paidAt?.toISOString() ?? null,
    },
    { onConflict: "provider,provider_invoice_id" },
  );
  if (error) throw new Error(`Facture ${invoice.providerInvoiceId} : ${error.message}`);
  return { userId, subscriptionId };
}

/** Commission estimée du prestataire (paramétrable ; la valeur exacte figure dans le tableau de bord Stripe). */
export function estimateFeeCents(amountCents: number, percent: number, fixedCents: number) {
  if (amountCents <= 0) return 0;
  return Math.round((amountCents * percent) / 100 + fixedCents);
}
