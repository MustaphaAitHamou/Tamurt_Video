import type Stripe from "stripe";

import type { ProviderInvoiceState, ProviderSubscriptionState, SubscriptionStatus } from "@/server/payments/types";

const STATUSES: SubscriptionStatus[] = [
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
];

const toDate = (seconds: number | null | undefined) => (typeof seconds === "number" && seconds > 0 ? new Date(seconds * 1000) : null);
const idOf = (value: string | { id: string } | null | undefined) => (typeof value === "string" ? value : (value?.id ?? null));

/** Normalise un abonnement Stripe (API 2025+ : périodes portées par les éléments). */
export function mapStripeSubscription(subscription: Stripe.Subscription): ProviderSubscriptionState {
  const item = subscription.items.data[0];
  if (!item) throw new Error(`Abonnement ${subscription.id} sans élément.`);
  const status = STATUSES.includes(subscription.status as SubscriptionStatus)
    ? (subscription.status as SubscriptionStatus)
    : "incomplete";
  const userId = subscription.metadata?.user_id;
  return {
    providerSubscriptionId: subscription.id,
    providerCustomerId: idOf(subscription.customer) ?? "",
    providerPriceId: item.price.id,
    status,
    unitAmountCents: item.price.unit_amount ?? 0,
    currency: (subscription.currency ?? item.price.currency ?? "eur").toUpperCase(),
    currentPeriodStart: toDate(item.current_period_start),
    currentPeriodEnd: toDate(item.current_period_end),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    cancelAt: toDate(subscription.cancel_at),
    canceledAt: toDate(subscription.canceled_at),
    endedAt: toDate(subscription.ended_at),
    trialEnd: toDate(subscription.trial_end),
    userId: userId && /^[0-9a-f-]{36}$/.test(userId) ? userId : null,
  };
}

export function mapStripeInvoice(invoice: Stripe.Invoice): ProviderInvoiceState {
  const subscription = invoice.parent?.subscription_details?.subscription ?? null;
  const taxes = (invoice.total_taxes ?? []).reduce((sum, tax) => sum + (tax.amount ?? 0), 0);
  return {
    providerInvoiceId: invoice.id ?? "",
    providerSubscriptionId: idOf(subscription),
    providerCustomerId: idOf(invoice.customer),
    number: invoice.number ?? null,
    status: invoice.status ?? "draft",
    currency: (invoice.currency ?? "eur").toUpperCase(),
    amountDueCents: invoice.amount_due ?? 0,
    amountPaidCents: invoice.amount_paid ?? 0,
    taxCents: taxes,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdfUrl: invoice.invoice_pdf ?? null,
    billingReason: invoice.billing_reason ?? null,
    periodStart: toDate(invoice.period_start),
    periodEnd: toDate(invoice.period_end),
    paidAt: toDate(invoice.status_transitions?.paid_at),
  };
}
