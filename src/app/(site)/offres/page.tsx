import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AlertCircleIcon, CheckIcon, CrownIcon, FlaskConicalIcon, InfoIcon } from "lucide-react";

import { startCheckoutAction } from "@/actions/billing";
import { SubmitButton } from "@/components/forms/form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isLocale, localeIntlTag } from "@/i18n/config";
import { formatDate, formatIndicativeDzd, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getViewer } from "@/server/auth/session";
import { getPublicPlans } from "@/server/billing/plans";
import { getPaymentProvider } from "@/server/payments";
import { getPublicSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "Offres et tarifs",
  description:
    "Les formules Tamurt Vidéo : Fondateur, Standard et Premium. Sans engagement, résiliables à tout moment.",
};

const ERRORS: Record<string, string> = {
  paiements: "Le paiement n'a pas pu être initialisé. Réessayez plus tard.",
  plan_unavailable: "Cette formule n'est pas disponible actuellement.",
  founder_closed: "Les nouvelles adhésions fondateur sont fermées.",
  plan_not_synced: "Cette formule n'est pas encore configurée chez le prestataire de paiement.",
  limite: "Trop de tentatives de paiement. Réessayez dans une heure.",
  formule: "Formule inconnue.",
};

export default async function PricingPage({ searchParams }: PageProps<"/offres">) {
  const params = await searchParams;
  const [t, tf, tTiers, viewer, plans, settings, rawLocale] = await Promise.all([
    getTranslations("pricing"),
    getTranslations("founderLanding"),
    getTranslations("tiers"),
    getViewer(),
    getPublicPlans(),
    getPublicSettings(),
    getLocale(),
  ]);
  const locale = isLocale(rawLocale) ? localeIntlTag[rawLocale] : "fr-FR";
  // Les textes des formules sont rédigés en français dans l'administration : hors français,
  // le nom vient des traductions et les descriptifs restent balisés comme texte français.
  const isFrench = rawLocale === "fr";
  const planName = (plan: { name: string; tier: "free" | "founder" | "standard" | "premium" }) =>
    isFrench ? plan.name : tTiers(plan.tier);
  const frenchText = isFrench ? {} : ({ lang: "fr", dir: "auto" } as const);
  const provider = getPaymentProvider();
  const highlighted = typeof params.formule === "string" ? params.formule : null;
  const errorKey = typeof params.erreur === "string" ? params.erreur : null;
  const currentPlanCode = viewer?.entitlements.planCode ?? null;
  const hasStripeSubscription = viewer?.entitlements.provider === "stripe";

  return (
    <div className="mx-auto max-w-[1300px] px-4 pt-28 pb-16 sm:px-6 lg:px-10">
      <div className="mx-auto mb-12 max-w-2xl space-y-4 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        {provider?.testMode && (
          <p className="inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-4 py-1.5 text-sm text-warning">
            <FlaskConicalIcon className="size-4" /> {t("testMode")}
          </p>
        )}
        {!provider && (
          <p className="inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
            <InfoIcon className="size-4" /> {t("paymentsDisabled")}
          </p>
        )}
      </div>

      {errorKey && ERRORS[errorKey] && (
        <p
          role="alert"
          className="mx-auto mb-8 flex max-w-2xl items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-text"
        >
          <AlertCircleIcon className="size-4 shrink-0" /> {ERRORS[errorKey]}
        </p>
      )}
      {params.paiement === "annule" && (
        <p
          role="status"
          className="mx-auto mb-8 max-w-2xl rounded-xl border bg-card p-4 text-center text-sm text-muted-foreground"
        >
          Paiement annulé : aucun montant n&apos;a été débité.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const available = plan.isActive && plan.availableInPhases.includes(settings.launchPhase);
          const founderClosed = plan.tier === "founder" && !settings.founderSignupsOpen;
          const isCurrent = currentPlanCode === plan.code;
          const isFounder = plan.tier === "founder";
          const dzd = settings.dzdDisplayEnabled
            ? formatIndicativeDzd(plan.priceCents, settings.eurToDzdRate, locale)
            : null;
          return (
            <article
              key={plan.id}
              id={`formule-${plan.code}`}
              className={cn(
                "relative flex flex-col rounded-3xl border bg-card/80 p-7 transition",
                highlighted === plan.code && "ring-2 ring-primary",
                isFounder &&
                  settings.launchPhase === "founder" &&
                  "border-gold/40 bg-gradient-to-b from-gold/10 to-card/80",
                !available && "opacity-80",
              )}
            >
              <div className="mb-5 space-y-2">
                <div className="flex min-h-6 flex-wrap gap-2">
                  {isFounder && settings.launchPhase === "founder" && (
                    <Badge variant="gold">{t("founderBadge")}</Badge>
                  )}
                  {!isFounder && !available && <Badge variant="muted">{t("unavailable")}</Badge>}
                </div>
                <h2 className="flex items-center gap-2 text-2xl font-bold">
                  {isFounder && <CrownIcon className="size-5 text-gold" />}
                  {planName(plan)}
                </h2>
                {plan.tagline && (
                  <p className="text-sm text-muted-foreground" {...frenchText}>
                    {plan.tagline}
                  </p>
                )}
              </div>
              <p className="flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-extrabold">
                  {formatPrice(plan.priceCents, plan.currency, locale)}
                </span>
                <span className="text-muted-foreground">{t("perMonth")}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("billedIn", { currency: plan.currency })}
                {dzd && (
                  <>
                    {" · "}
                    <span
                      title={t("indicativeNote", {
                        date: formatDate(settings.eurToDzdRateUpdatedAt, locale),
                      })}
                    >
                      {dzd} ({t("indicative").toLowerCase()})
                    </span>
                  </>
                )}
              </p>
              {plan.description && (
                <p className="mt-4 text-sm leading-relaxed text-white/80" {...frenchText}>
                  {plan.description}
                </p>
              )}
              <ul className="mt-6 mb-8 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-sm leading-relaxed">
                    <CheckIcon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        isFounder ? "text-gold" : "text-primary-text",
                      )}
                    />
                    <span {...frenchText}>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto space-y-3">
                {isCurrent ? (
                  <Button asChild variant="secondary" className="w-full" size="lg">
                    <Link href="/compte/abonnement">{t("currentPlan")}</Link>
                  </Button>
                ) : !available ? (
                  <Button disabled variant="secondary" className="w-full" size="lg">
                    {t("unavailable")}
                  </Button>
                ) : founderClosed ? (
                  <Button disabled variant="secondary" className="w-full" size="lg">
                    {t("founderClosed")}
                  </Button>
                ) : !viewer ? (
                  <Button
                    asChild
                    className="w-full"
                    size="lg"
                    variant={isFounder ? "gold" : "default"}
                  >
                    <Link
                      href={`/inscription?next=${encodeURIComponent(`/offres?formule=${plan.code}`)}`}
                    >
                      {t("signInToSubscribe")}
                    </Link>
                  </Button>
                ) : hasStripeSubscription ? (
                  <Button asChild variant="outline" className="w-full" size="lg">
                    <Link href="/compte/abonnement">{t("changePlan")}</Link>
                  </Button>
                ) : !provider ? (
                  <Button disabled className="w-full" size="lg">
                    {t("subscribe")}
                  </Button>
                ) : (
                  <form action={startCheckoutAction}>
                    <input type="hidden" name="plan" value={plan.code} />
                    <SubmitButton
                      className="w-full"
                      size="lg"
                      variant={isFounder ? "gold" : "default"}
                    >
                      {t("choose", { plan: planName(plan) })}
                    </SubmitButton>
                  </form>
                )}
                <p className="text-center text-xs text-muted-foreground">{t("autoRenew")}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mx-auto mt-12 max-w-3xl space-y-3 rounded-2xl border bg-card/50 p-6 text-sm leading-relaxed text-muted-foreground">
        <p>{tf("priceNote")}</p>
        <p>{tf("notDonation")}</p>
        <p>
          {t("legal")}{" "}
          <Link href="/legal/cga" className="text-foreground underline underline-offset-4">
            CGA
          </Link>{" "}
          ·{" "}
          <Link
            href="/legal/remboursement"
            className="text-foreground underline underline-offset-4"
          >
            Remboursements
          </Link>
        </p>
        {settings.launchPhase === "founder" && <p>{tf("faq2A")}</p>}
      </div>
    </div>
  );
}
