import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangleIcon, CrownIcon, HourglassIcon, InfoIcon } from "lucide-react";

import { openBillingPortalAction } from "@/actions/billing";
import { AccountSection } from "@/components/account/section";
import { CancelSubscriptionButton, ChangePlanButton } from "@/components/billing/subscription-actions";
import { SubmitButton } from "@/components/forms/form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isLocale, localeIntlTag } from "@/i18n/config";
import { formatDate, formatPrice } from "@/lib/format";
import { tierAtLeast } from "@/lib/permissions";
import { requireViewer } from "@/server/auth/session";
import { getPublicPlans } from "@/server/billing/plans";
import { getPaymentProvider } from "@/server/payments";

export const metadata: Metadata = { title: "Abonnement", robots: { index: false } };

export default async function SubscriptionPage({ searchParams }: PageProps<"/compte/abonnement">) {
  const params = await searchParams;
  const viewer = await requireViewer("/compte/abonnement");
  const [t, tb, tp, tTiers, plans, rawLocale] = await Promise.all([
    getTranslations("account"),
    getTranslations("billing"),
    getTranslations("pricing"),
    getTranslations("tiers"),
    getPublicPlans(),
    getLocale(),
  ]);
  const planName = (plan: { name: string; tier: "free" | "founder" | "standard" | "premium" }) => (rawLocale === "fr" ? plan.name : tTiers(plan.tier));
  const locale = isLocale(rawLocale) ? localeIntlTag[rawLocale] : "fr-FR";
  const e = viewer.entitlements;
  const provider = getPaymentProvider();
  const isStripe = e.provider === "stripe";
  const endDate = e.currentPeriodEnd ? formatDate(e.currentPeriodEnd, locale) : null;
  const graceUntil = e.accessUntil && e.inGrace ? formatDate(e.accessUntil, locale) : null;
  const otherPlans = plans.filter(
    (p) => p.code !== e.planCode && p.isActive && p.availableInPhases.includes(e.launchPhase) && p.tier !== "founder",
  );

  return (
    <>
      {params.paiement === "confirmation" && !e.subscriptionId && (
        <p role="status" className="flex items-start gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-gold">
          <HourglassIcon className="mt-0.5 size-4 shrink-0" />
          {tb("paymentPending")}
        </p>
      )}
      {params.info === "deja-abonne" && (
        <p role="status" className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          {tb("alreadySubscribed")}
        </p>
      )}

      <AccountSection title={t("subscription")}>
        {!e.subscriptionId ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">{t("noSubscription")}</p>
            <Button asChild>
              <Link href="/offres">{t("seePlans")}</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-xl font-semibold">
                  {e.planTier === "founder" && <CrownIcon className="size-5 text-gold" />}
                  {rawLocale === "fr" || !e.planTier ? e.planName : tTiers(e.planTier)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={e.status === "active" || e.status === "trialing" ? "success" : e.status === "past_due" ? "warning" : "muted"}>
                    {e.status ? t(`statuses.${e.status}`) : ""}
                  </Badge>
                  {e.isFounderRate && <Badge variant="gold">{t("founderRate")}</Badge>}
                  {e.provider === "manual" && <Badge variant="outline">{tb("grantedByTeam")}</Badge>}
                </div>
              </div>
              {e.unitAmountCents !== null && (
                <p className="text-end">
                  <span className="font-display text-3xl font-bold">{formatPrice(e.unitAmountCents, e.currency ?? "EUR", locale)}</span>
                  <span className="text-sm text-muted-foreground"> {tp("perMonth")}</span>
                  <span className="block text-xs text-muted-foreground">{tp("billedIn", { currency: e.currency ?? "EUR" })}</span>
                </p>
              )}
            </div>

            {e.launchPhase === "commercial" && e.planTier === "founder" && (
              <p className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-gold">
                <CrownIcon className="mt-0.5 size-4 shrink-0" />
                {tb("standardLaunched")}
              </p>
            )}
            {e.inGrace && graceUntil && (
              <p role="alert" className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                {t("graceWarning", { date: graceUntil })}
              </p>
            )}
            {e.cancelAtPeriodEnd && endDate && (
              <p className="flex items-start gap-2 rounded-xl border bg-muted p-3 text-sm">
                <InfoIcon className="mt-0.5 size-4 shrink-0" />
                {t("cancelScheduled", { date: endDate })}
              </p>
            )}
            {!e.cancelAtPeriodEnd && endDate && <p className="text-sm text-muted-foreground">{t("renewsOn", { date: endDate })}</p>}

            {isStripe && provider && (
              <div className="flex flex-wrap gap-3 border-t pt-5">
                <form action={openBillingPortalAction}>
                  <SubmitButton variant="secondary">{t("manageBilling")}</SubmitButton>
                </form>
                <CancelSubscriptionButton cancelScheduled={e.cancelAtPeriodEnd} endDate={endDate} />
              </div>
            )}
            {isStripe && !provider && <p className="text-sm text-muted-foreground">{tb("onlineManagementUnavailable")}</p>}
          </div>
        )}
      </AccountSection>

      {isStripe && provider && otherPlans.length > 0 && (
        <AccountSection title={tb("changePlanTitle")} description={tb("changePlanDescription")}>
          <ul className="space-y-3">
            {otherPlans.map((plan) => (
              <li key={plan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                <div>
                  <p className="font-medium">{planName(plan)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(plan.priceCents, plan.currency, locale)} {tp("perMonth")}
                    {tierAtLeast(plan.tier, e.tier) ? "" : ` · ${tb("lowerPlan")}`}
                  </p>
                </div>
                <ChangePlanButton
                  planCode={plan.code}
                  planName={planName(plan)}
                  priceLabel={formatPrice(plan.priceCents, plan.currency, locale)}
                  losesFounderRate={e.isFounderRate}
                />
              </li>
            ))}
          </ul>
        </AccountSection>
      )}

      <AccountSection title={tb("termsTitle")} description={tb("termsDescription")}>
        <p className="text-sm text-muted-foreground">
          {tb.rich("termsText", {
            terms: (chunks) => (
              <Link href="/legal/cga" className="text-foreground underline underline-offset-4">
                {chunks}
              </Link>
            ),
            refunds: (chunks) => (
              <Link href="/legal/remboursement" className="text-foreground underline underline-offset-4">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </AccountSection>
    </>
  );
}
