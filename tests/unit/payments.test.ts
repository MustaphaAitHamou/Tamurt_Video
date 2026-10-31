import Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { mapStripeInvoice, mapStripeSubscription } from "@/server/payments/stripe-mappers";
import { StripePaymentProvider } from "@/server/payments/stripe-provider";
import { detectTransitions, estimateFeeCents } from "@/server/payments/sync";

const USER = "11111111-2222-4333-8444-555555555555";

function subscription(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sub_123",
    object: "subscription",
    customer: "cus_123",
    status: "active",
    currency: "eur",
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: null,
    ended_at: null,
    trial_end: null,
    metadata: { user_id: USER, plan_code: "founder" },
    items: {
      data: [
        {
          price: { id: "price_founder", unit_amount: 200, currency: "eur" },
          current_period_start: 1_790_000_000,
          current_period_end: 1_792_592_000,
        },
      ],
    },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe("conversion des objets Stripe", () => {
  it("lit les périodes sur l'élément d'abonnement (API récente)", () => {
    const state = mapStripeSubscription(subscription());
    expect(state).toMatchObject({
      providerSubscriptionId: "sub_123",
      providerCustomerId: "cus_123",
      providerPriceId: "price_founder",
      status: "active",
      unitAmountCents: 200,
      currency: "EUR",
      userId: USER,
    });
    expect(state.currentPeriodEnd?.toISOString()).toBe(
      new Date(1_792_592_000 * 1000).toISOString(),
    );
  });

  it("ignore un identifiant utilisateur malformé et un statut inconnu", () => {
    const state = mapStripeSubscription(
      subscription({ metadata: { user_id: "pas-un-uuid" }, status: "bizarre" }),
    );
    expect(state.userId).toBeNull();
    expect(state.status).toBe("incomplete");
  });

  it("refuse un abonnement sans élément", () => {
    expect(() => mapStripeSubscription(subscription({ items: { data: [] } }))).toThrow(
      /sans élément/,
    );
  });

  it("lit l'abonnement d'une facture via parent.subscription_details", () => {
    const invoice = mapStripeInvoice({
      id: "in_1",
      number: "TV-0001",
      status: "paid",
      currency: "eur",
      customer: "cus_123",
      amount_due: 1000,
      amount_paid: 1000,
      total_taxes: [{ amount: 167 }],
      parent: { subscription_details: { subscription: "sub_123" } },
      status_transitions: { paid_at: 1_790_000_100 },
      period_start: 1_790_000_000,
      period_end: 1_792_592_000,
    } as unknown as Stripe.Invoice);
    expect(invoice).toMatchObject({
      providerSubscriptionId: "sub_123",
      amountPaidCents: 1000,
      taxCents: 167,
      currency: "EUR",
    });
    expect(invoice.paidAt).not.toBeNull();
  });
});

describe("transitions d'abonnement", () => {
  const live = { status: "active", cancel_at_period_end: false, plan_id: "p1" };
  it("détecte l'activation, l'échec de paiement et la résiliation", () => {
    expect(
      detectTransitions(null, { status: "active", cancelAtPeriodEnd: false, planId: "p1" }),
    ).toEqual(["activated"]);
    expect(
      detectTransitions(live, { status: "past_due", cancelAtPeriodEnd: false, planId: "p1" }),
    ).toEqual(["payment_failed"]);
    expect(
      detectTransitions(live, { status: "active", cancelAtPeriodEnd: true, planId: "p1" }),
    ).toEqual(["cancellation_scheduled"]);
    expect(
      detectTransitions(live, { status: "canceled", cancelAtPeriodEnd: false, planId: "p1" }),
    ).toEqual(["canceled"]);
  });
  it("ne réactive pas après un simple rétablissement de paiement", () => {
    expect(
      detectTransitions(
        { ...live, status: "past_due" },
        { status: "active", cancelAtPeriodEnd: false, planId: "p1" },
      ),
    ).toEqual([]);
  });
  it("détecte un changement de formule et l'annulation d'une résiliation", () => {
    expect(
      detectTransitions(live, { status: "active", cancelAtPeriodEnd: false, planId: "p2" }),
    ).toEqual(["plan_changed"]);
    expect(
      detectTransitions(
        { ...live, cancel_at_period_end: true },
        { status: "active", cancelAtPeriodEnd: false, planId: "p1" },
      ),
    ).toEqual(["cancellation_revoked"]);
  });
  it("estime les frais de paiement", () => {
    expect(estimateFeeCents(1000, 1.5, 25)).toBe(40);
    expect(estimateFeeCents(0, 1.5, 25)).toBe(0);
  });
});

describe("webhooks Stripe", () => {
  const secret = "whsec_test_secret_local";
  const provider = new StripePaymentProvider("sk_test_dummy", secret, new Stripe("sk_test_dummy"));
  const payload = JSON.stringify({
    id: "evt_1",
    object: "event",
    type: "customer.subscription.updated",
    created: 1_790_000_000,
    livemode: false,
    data: { object: { id: "sub_123" } },
  });

  it("est en mode test avec une clé de test", () => {
    expect(provider.testMode).toBe(true);
    expect(
      new StripePaymentProvider("sk_live_x", secret, new Stripe("sk_test_dummy")).testMode,
    ).toBe(false);
  });

  it("accepte une signature valide", () => {
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    const event = provider.parseWebhook(payload, header);
    expect(event).toMatchObject({
      id: "evt_1",
      type: "customer.subscription.updated",
      objectId: "sub_123",
      livemode: false,
    });
  });

  it("rejette une signature falsifiée, absente ou un corps modifié", () => {
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_autre" });
    expect(() => provider.parseWebhook(payload, header)).toThrow();
    expect(() => provider.parseWebhook(payload, null)).toThrow();
    const valid = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(() => provider.parseWebhook(payload.replace("sub_123", "sub_999"), valid)).toThrow();
  });
});
