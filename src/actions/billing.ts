"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";

import { getEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getViewer, requireViewer } from "@/server/auth/session";
import { logAudit } from "@/server/audit";
import { failure, success, type ActionResult } from "@/server/errors";
import { getPaymentProvider } from "@/server/payments";
import { syncSubscription } from "@/server/payments/sync";
import { rateLimit } from "@/server/rate-limit";
import { getSettings } from "@/server/settings";

const planCodeSchema = z.string().regex(/^[a-z0-9_]{1,40}$/);

/** Formule souscriptible dans la phase actuelle, avec son prix Stripe courant. */
async function resolvePurchasablePlan(code: string) {
  const admin = createSupabaseAdminClient();
  const settings = await getSettings();
  const { data: plan } = await admin
    .from("subscription_plans")
    .select("id, code, tier, name, is_active, available_in_phases")
    .eq("code", code)
    .maybeSingle();
  if (!plan || !plan.is_active || !plan.available_in_phases.includes(settings.launchPhase)) return { ok: false as const, error: "PLAN_UNAVAILABLE" as const };
  if (plan.tier === "founder" && !settings.founderSignupsOpen) return { ok: false as const, error: "FOUNDER_CLOSED" as const };
  const { data: price } = await admin
    .from("plan_prices")
    .select("id, provider_price_id")
    .eq("plan_id", plan.id)
    .eq("is_current", true)
    .maybeSingle();
  if (!price?.provider_price_id) return { ok: false as const, error: "PLAN_NOT_SYNCED" as const };
  return { ok: true as const, plan, priceId: price.provider_price_id };
}

/** Démarre un paiement Stripe Checkout. L'accès n'est accordé qu'à réception du webhook. */
export async function startCheckoutAction(formData: FormData) {
  const code = planCodeSchema.safeParse(formData.get("plan"));
  if (!code.success) redirect("/offres?erreur=formule");
  const viewer = await requireViewer(`/offres?formule=${code.data}`);

  const provider = getPaymentProvider();
  if (!provider) redirect("/offres?erreur=paiements");

  if (viewer.entitlements.provider === "stripe" && viewer.entitlements.subscriptionId) {
    redirect("/compte/abonnement?info=deja-abonne");
  }

  const resolved = await resolvePurchasablePlan(code.data);
  if (!resolved.ok) redirect(`/offres?erreur=${resolved.error.toLowerCase()}`);

  const limit = await rateLimit(`checkout:${viewer.user.id}`, 10, 3600);
  if (!limit.allowed) redirect("/offres?erreur=limite");

  const admin = createSupabaseAdminClient();
  const { data: customer } = await admin
    .from("billing_customers")
    .select("provider_customer_id")
    .eq("user_id", viewer.user.id)
    .eq("provider", "stripe")
    .maybeSingle();

  const env = getEnv();
  const locale = await getLocale();
  let url: string;
  try {
    const checkout = await provider.createCheckout({
      userId: viewer.user.id,
      email: viewer.user.email,
      customerId: customer?.provider_customer_id ?? null,
      priceId: resolved.priceId,
      planCode: resolved.plan.code,
      successUrl: `${env.siteUrl}/compte/abonnement?paiement=confirmation`,
      cancelUrl: `${env.siteUrl}/offres?paiement=annule`,
      locale,
      automaticTax: env.payments.automaticTax,
    });
    url = checkout.url;
    if (!customer) {
      await admin
        .from("billing_customers")
        .upsert({ user_id: viewer.user.id, provider: "stripe", provider_customer_id: checkout.customerId }, { onConflict: "user_id" });
    }
  } catch (error) {
    console.error("[billing] checkout", error);
    redirect("/offres?erreur=paiements");
  }
  await logAudit({ actorId: viewer.user.id, action: "billing.checkout_started", entityType: "subscription_plan", entityId: resolved.plan.id, metadata: { plan: resolved.plan.code, test_mode: provider.testMode } });
  redirect(url);
}

/** Portail client Stripe : moyens de paiement, factures, résiliation. */
export async function openBillingPortalAction() {
  const viewer = await requireViewer("/compte/abonnement");
  const provider = getPaymentProvider();
  if (!provider) redirect("/compte/abonnement?erreur=paiements");
  const { data: customer } = await createSupabaseAdminClient()
    .from("billing_customers")
    .select("provider_customer_id")
    .eq("user_id", viewer.user.id)
    .eq("provider", "stripe")
    .maybeSingle();
  if (!customer) redirect("/offres");
  let url: string;
  try {
    const portal = await provider.createPortal({
      customerId: customer.provider_customer_id,
      returnUrl: `${getEnv().siteUrl}/compte/abonnement`,
      locale: await getLocale(),
    });
    url = portal.url;
  } catch (error) {
    console.error("[billing] portail", error);
    redirect("/compte/abonnement?erreur=paiements");
  }
  redirect(url);
}

async function ownStripeSubscription() {
  const viewer = await getViewer();
  if (!viewer) return { error: failure("Connexion requise.", "UNAUTHENTICATED") };
  const admin = createSupabaseAdminClient();
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("id, provider_subscription_id, plan_id, status")
    .eq("user_id", viewer.user.id)
    .eq("provider", "stripe")
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!subscription?.provider_subscription_id) return { error: failure("Aucun abonnement modifiable.", "NOT_FOUND") };
  const provider = getPaymentProvider();
  if (!provider) return { error: failure("Les paiements ne sont pas configurés.", "PAYMENTS_DISABLED") };
  return { viewer, admin, provider, subscription: { ...subscription, provider_subscription_id: subscription.provider_subscription_id } };
}

/** Résiliation à l'échéance : l'accès reste ouvert jusqu'à la fin de la période payée. */
export async function setCancelAtPeriodEndAction(cancel: boolean): Promise<ActionResult> {
  const context = await ownStripeSubscription();
  if ("error" in context) return context.error as ActionResult;
  const { viewer, admin, provider, subscription } = context;
  try {
    const state = await provider.setCancelAtPeriodEnd(subscription.provider_subscription_id, cancel);
    await syncSubscription(provider, admin, subscription.provider_subscription_id, state);
  } catch (error) {
    console.error("[billing] résiliation", error);
    return failure("Le prestataire de paiement n'a pas pu traiter la demande. Réessayez plus tard.", "PROVIDER_ERROR");
  }
  await logAudit({ actorId: viewer.user.id, action: cancel ? "billing.cancel_scheduled" : "billing.cancel_revoked", entityType: "subscription", entityId: subscription.id });
  revalidatePath("/compte/abonnement");
  return success(undefined, cancel ? "Résiliation programmée à la fin de la période en cours." : "Votre abonnement continue.");
}

/** Changement de formule (proratisé). Met fin définitivement au tarif fondateur. */
export async function changePlanAction(planCode: string): Promise<ActionResult> {
  const code = planCodeSchema.safeParse(planCode);
  if (!code.success) return failure("Formule invalide.", "VALIDATION");
  const context = await ownStripeSubscription();
  if ("error" in context) return context.error as ActionResult;
  const { viewer, admin, provider, subscription } = context;
  const resolved = await resolvePurchasablePlan(code.data);
  if (!resolved.ok) return failure("Cette formule n'est pas disponible actuellement.", resolved.error);
  if (resolved.plan.id === subscription.plan_id) return failure("Vous avez déjà cette formule.", "SAME_PLAN");
  try {
    const state = await provider.changePlan(subscription.provider_subscription_id, resolved.priceId);
    await syncSubscription(provider, admin, subscription.provider_subscription_id, state);
  } catch (error) {
    console.error("[billing] changement de formule", error);
    return failure("Le changement de formule a échoué. Aucun montant n'a été modifié.", "PROVIDER_ERROR");
  }
  await logAudit({ actorId: viewer.user.id, action: "billing.plan_changed", entityType: "subscription", entityId: subscription.id, metadata: { to: resolved.plan.code } });
  revalidatePath("/compte/abonnement");
  return success(undefined, `Votre formule est désormais ${resolved.plan.name}.`);
}
