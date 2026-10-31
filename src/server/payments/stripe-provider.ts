import Stripe from "stripe";

import { mapStripeInvoice, mapStripeSubscription } from "@/server/payments/stripe-mappers";
import { PaymentsUnavailableError, type PaymentProvider, type ProviderEvent } from "@/server/payments/types";

const STRIPE_LOCALES = new Set(["fr", "en", "ar"]);

export class StripePaymentProvider implements PaymentProvider {
  readonly id = "stripe" as const;
  readonly testMode: boolean;
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string | undefined,
    client?: Stripe,
  ) {
    this.testMode = !/^(sk|rk)_live_/.test(secretKey);
    this.stripe = client ?? new Stripe(secretKey, { appInfo: { name: "Tamurt Video" }, maxNetworkRetries: 2, timeout: 20_000 });
  }

  async createCheckout(input: Parameters<PaymentProvider["createCheckout"]>[0]) {
    let customerId = input.customerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create(
        { email: input.email, metadata: { user_id: input.userId } },
        { idempotencyKey: `customer-${input.userId}` },
      );
      customerId = customer.id;
    }
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: input.userId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      locale: (STRIPE_LOCALES.has(input.locale) ? input.locale : "fr") as Stripe.Checkout.SessionCreateParams.Locale,
      allow_promotion_codes: false,
      billing_address_collection: input.automaticTax ? "required" : "auto",
      automatic_tax: { enabled: input.automaticTax },
      ...(input.automaticTax ? { customer_update: { address: "auto" as const } } : {}),
      subscription_data: { metadata: { user_id: input.userId, plan_code: input.planCode } },
      metadata: { user_id: input.userId, plan_code: input.planCode },
    });
    if (!session.url) throw new PaymentsUnavailableError("Session de paiement sans URL.");
    return { url: session.url, customerId };
  }

  async createPortal(input: { customerId: string; returnUrl: string; locale: string }) {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
      locale: (STRIPE_LOCALES.has(input.locale) ? input.locale : "fr") as Stripe.BillingPortal.SessionCreateParams.Locale,
    });
    return { url: session.url };
  }

  async retrieveSubscription(id: string) {
    return mapStripeSubscription(await this.stripe.subscriptions.retrieve(id));
  }

  async retrieveInvoice(id: string) {
    return mapStripeInvoice(await this.stripe.invoices.retrieve(id));
  }

  async setCancelAtPeriodEnd(subscriptionId: string, cancel: boolean) {
    return mapStripeSubscription(await this.stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: cancel }));
  }

  async changePlan(subscriptionId: string, newPriceId: string) {
    const current = await this.stripe.subscriptions.retrieve(subscriptionId);
    const item = current.items.data[0];
    if (!item) throw new PaymentsUnavailableError("Abonnement sans élément.");
    const updated = await this.stripe.subscriptions.update(subscriptionId, {
      items: [{ id: item.id, price: newPriceId }],
      proration_behavior: "create_prorations",
      cancel_at_period_end: false,
    });
    return mapStripeSubscription(updated);
  }

  async cancelImmediately(subscriptionId: string) {
    await this.stripe.subscriptions.cancel(subscriptionId, { prorate: false });
  }

  async refundInvoice(input: { invoiceId: string; amountCents: number; reason: string }) {
    const payments = await this.stripe.invoicePayments.list({ invoice: input.invoiceId, limit: 1 });
    const paymentIntent = payments.data[0]?.payment?.payment_intent;
    const paymentIntentId = typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
    if (!paymentIntentId) throw new PaymentsUnavailableError("Aucun paiement remboursable pour cette facture.");
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: input.amountCents,
      reason: "requested_by_customer",
      metadata: { tamurt_reason: input.reason.slice(0, 450) },
    });
    return { refundId: refund.id, status: refund.status ?? "pending" };
  }

  async ensurePrice(input: Parameters<PaymentProvider["ensurePrice"]>[0]) {
    let productId = input.productId;
    if (!productId) {
      const product = await this.stripe.products.create(
        { name: `Tamurt Vidéo — ${input.planName}`, metadata: { plan_code: input.planCode } },
        { idempotencyKey: `product-${input.planCode}` },
      );
      productId = product.id;
    }
    const price = await this.stripe.prices.create({
      product: productId,
      currency: input.currency.toLowerCase(),
      unit_amount: input.amountCents,
      recurring: { interval: input.interval },
      tax_behavior: "inclusive",
      metadata: { plan_code: input.planCode },
    });
    return { productId, priceId: price.id };
  }

  parseWebhook(rawBody: string, signature: string | null): ProviderEvent {
    if (!this.webhookSecret) throw new PaymentsUnavailableError("STRIPE_WEBHOOK_SECRET manquant.");
    if (!signature) throw new Error("Signature absente.");
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    const object = event.data.object as unknown as Record<string, unknown>;
    return {
      id: event.id,
      type: event.type,
      createdAt: new Date(event.created * 1000),
      livemode: event.livemode,
      objectId: typeof object.id === "string" ? object.id : null,
      object,
      raw: event,
    };
  }
}
