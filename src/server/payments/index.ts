import "server-only";

import { getEnv } from "@/lib/env";
import { StripePaymentProvider } from "@/server/payments/stripe-provider";
import { PaymentsUnavailableError, type PaymentProvider } from "@/server/payments/types";

let cached: PaymentProvider | null | undefined;

/**
 * Prestataire de paiement configuré, ou null si les paiements sont désactivés.
 * Garde-fou : une clé « live » est refusée tant que PAYMENTS_LIVE_MODE_ALLOWED
 * n'est pas explicitement activé (aucun paiement réel sans validation).
 */
export function getPaymentProvider(): PaymentProvider | null {
  if (cached !== undefined) return cached;
  const env = getEnv();
  if (env.payments.provider !== "stripe" || !env.payments.stripeSecretKey) {
    cached = null;
    return cached;
  }
  if (/^(sk|rk)_live_/.test(env.payments.stripeSecretKey) && !env.payments.liveModeAllowed) {
    console.error("[payments] Clé Stripe live refusée : définir PAYMENTS_LIVE_MODE_ALLOWED=true après validation explicite.");
    cached = null;
    return cached;
  }
  cached = new StripePaymentProvider(env.payments.stripeSecretKey, env.payments.stripeWebhookSecret);
  return cached;
}

export function requirePaymentProvider(): PaymentProvider {
  const provider = getPaymentProvider();
  if (!provider) throw new PaymentsUnavailableError("Les paiements ne sont pas configurés.");
  return provider;
}
