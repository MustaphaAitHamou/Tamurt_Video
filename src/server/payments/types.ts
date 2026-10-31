import type { Database } from "@/lib/supabase/database.types";

export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

/** État d'un abonnement tel que connu du prestataire, normalisé. */
export type ProviderSubscriptionState = {
  providerSubscriptionId: string;
  providerCustomerId: string;
  providerPriceId: string;
  status: SubscriptionStatus;
  unitAmountCents: number;
  currency: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: Date | null;
  canceledAt: Date | null;
  endedAt: Date | null;
  trialEnd: Date | null;
  /** Utilisateur Tamurt rattaché (métadonnées posées lors du paiement). */
  userId: string | null;
};

export type ProviderInvoiceState = {
  providerInvoiceId: string;
  providerSubscriptionId: string | null;
  providerCustomerId: string | null;
  number: string | null;
  status: string;
  currency: string;
  amountDueCents: number;
  amountPaidCents: number;
  taxCents: number;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  billingReason: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  paidAt: Date | null;
};

export type ProviderEvent = {
  id: string;
  type: string;
  createdAt: Date;
  livemode: boolean;
  objectId: string | null;
  object: Record<string, unknown>;
  raw: unknown;
};

/**
 * Prestataire de paiement. Stripe est l'implémentation actuelle ; un autre
 * prestataire (par exemple pour des moyens de paiement locaux en Algérie)
 * pourra être ajouté en implémentant cette interface.
 */
export interface PaymentProvider {
  readonly id: "stripe";
  readonly testMode: boolean;
  createCheckout(input: {
    userId: string;
    email: string;
    customerId: string | null;
    priceId: string;
    planCode: string;
    successUrl: string;
    cancelUrl: string;
    locale: string;
    automaticTax: boolean;
  }): Promise<{ url: string; customerId: string }>;
  createPortal(input: {
    customerId: string;
    returnUrl: string;
    locale: string;
  }): Promise<{ url: string }>;
  retrieveSubscription(id: string): Promise<ProviderSubscriptionState>;
  retrieveInvoice(id: string): Promise<ProviderInvoiceState>;
  setCancelAtPeriodEnd(subscriptionId: string, cancel: boolean): Promise<ProviderSubscriptionState>;
  changePlan(subscriptionId: string, newPriceId: string): Promise<ProviderSubscriptionState>;
  cancelImmediately(subscriptionId: string): Promise<void>;
  refundInvoice(input: {
    invoiceId: string;
    amountCents: number;
    reason: string;
  }): Promise<{ refundId: string; status: string }>;
  ensurePrice(input: {
    planCode: string;
    planName: string;
    productId: string | null;
    amountCents: number;
    currency: string;
    interval: "month" | "year";
    /** Clé d'idempotence (identifiant du prix interne) : évite les doublons en cas de nouvelle tentative. */
    idempotencyKey?: string;
  }): Promise<{ productId: string; priceId: string }>;
  /** Vérifie la signature et décode l'événement ; lève une erreur si invalide. */
  parseWebhook(rawBody: string, signature: string | null): ProviderEvent;
}

export class PaymentsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentsUnavailableError";
  }
}
