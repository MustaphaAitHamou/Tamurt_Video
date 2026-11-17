import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowRightIcon,
  CheckIcon,
  CrownIcon,
  GlobeIcon,
  LandmarkIcon,
  LanguagesIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { FounderIllustration } from "@/components/founder/founder-illustration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TitleRow } from "@/components/catalog/title-row";
import { localeIntlTag, isLocale } from "@/i18n/config";
import { formatIndicativeDzd, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getActiveFounderCount, getPublicPlans } from "@/server/billing/plans";
import { listCatalog } from "@/server/catalog/queries";
import { getPublicSettings } from "@/server/settings";

/** Page d'accueil publique de la phase de soutien à 2 €. */
export async function FounderLanding() {
  const [t, tf, tp, tTiers, settings, plans, founderCount, announced, available, rawLocale] =
    await Promise.all([
      getTranslations("founderLanding"),
      getTranslations("founder"),
      getTranslations("pricing"),
      getTranslations("tiers"),
      getPublicSettings(),
      getPublicPlans(),
      getActiveFounderCount(),
      listCatalog({ status: "announced", sort: "new", limit: 12 }),
      listCatalog({ sort: "popular", limit: 48 }),
      getLocale(),
    ]);
  const locale = isLocale(rawLocale) ? localeIntlTag[rawLocale] : "fr-FR";
  // Uniquement les œuvres réellement incluses dès la formule Fondateur (aucune promesse implicite).
  const includedForFounders = available
    .filter((t) => t.minTier === "free" || t.minTier === "founder")
    .slice(0, 12);
  const founderPlan = plans.find((p) => p.tier === "founder");
  const price = founderPlan
    ? formatPrice(founderPlan.priceCents, founderPlan.currency, locale)
    : "2 €";
  const dzd =
    founderPlan && settings.dzdDisplayEnabled
      ? formatIndicativeDzd(founderPlan.priceCents, settings.eurToDzdRate, locale)
      : null;
  const ctaHref = "/offres?formule=founder";
  const why = [
    { icon: ShieldCheckIcon, title: t("why1Title"), text: t("why1Text") },
    { icon: LanguagesIcon, title: t("why2Title"), text: t("why2Text") },
    { icon: LandmarkIcon, title: t("why3Title"), text: t("why3Text") },
  ];
  // Les formules telles qu'enregistrées en base (prix et contenus réels), dans l'ordre d'affichage.
  const isFrench = rawLocale === "fr";
  const frenchText = isFrench ? {} : ({ lang: "fr", dir: "auto" } as const);
  const shownPlans = plans.filter((p) => p.tier !== "free");
  const faq = [1, 2, 3, 4].map((n) => ({ q: t(`faq${n}Q`), a: t(`faq${n}A`) }));

  return (
    <div className="relative">
      {/* Héros */}
      <section className="relative isolate overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
        <div className="bg-tamurt-pattern-strong absolute inset-0 -z-10" aria-hidden />
        <div
          className="absolute start-1/2 -top-40 -z-10 h-[620px] w-[920px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(227,38,58,0.35),transparent)] blur-2xl rtl:translate-x-1/2"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent"
          aria-hidden
        />
        <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:px-10">
          <div className="animate-fade-up space-y-7">
            <Badge variant="gold" className="gap-1.5 px-3 py-1 text-xs tracking-wide uppercase">
              <CrownIcon /> {t("eyebrow")}
            </Badge>
            <h1 className="text-4xl leading-[1.05] font-extrabold sm:text-6xl">{t("title")}</h1>
            <p className="max-w-xl text-lg leading-relaxed text-white/80">{t("subtitleShort")}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={ctaHref}>
                  <CrownIcon /> {t("cta")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="glass">
                <Link href="#formules">{t("seePlans")}</Link>
              </Button>
            </div>
            <p className="text-sm text-white/60">
              {t("priceTeaser", { price })}
              {dzd && <span className="ms-1">({dzd})</span>}
            </p>
          </div>
          {/* Illustration originale : un écran ouvert sur un village kabyle, pellicule à motifs berbères. */}
          <FounderIllustration className="mx-auto max-w-[540px]" />
        </div>
      </section>

      {/* Pourquoi */}
      <section
        id="projet"
        className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-16 sm:px-6 lg:px-10"
      >
        <h2 className="mb-10 text-3xl font-bold sm:text-4xl">{t("whyTitle")}</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {why.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border bg-card/60 p-6 transition hover:border-white/20 hover:bg-card"
            >
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary-text">
                <Icon className="size-5" />
              </span>
              <h3 className="mb-2 text-lg font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Formules : Fondateur aujourd'hui, Standard et Premium au lancement du catalogue */}
      {shownPlans.length > 0 && (
        <section
          id="formules"
          className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-16 sm:px-6 lg:px-10"
        >
          <div className="mb-10 max-w-2xl space-y-3">
            <h2 className="text-3xl font-bold sm:text-4xl">{t("plansTitle")}</h2>
            <p className="text-lg text-muted-foreground">{t("plansSubtitle")}</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {shownPlans.map((plan) => {
              const isFounder = plan.tier === "founder";
              const availableNow =
                plan.isActive && plan.availableInPhases.includes(settings.launchPhase);
              return (
                <article
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col rounded-3xl border bg-card/80 p-7",
                    isFounder &&
                      "border-gold/50 bg-gradient-to-b from-gold/15 to-card/90 shadow-2xl shadow-gold/10",
                  )}
                >
                  <div className="mb-4 flex min-h-6 flex-wrap gap-2">
                    {availableNow ? (
                      <Badge variant="gold">{t("availableNow")}</Badge>
                    ) : (
                      <Badge variant="muted">{tp("unavailable")}</Badge>
                    )}
                  </div>
                  <h3 className="flex items-center gap-2 text-2xl font-bold">
                    {isFounder && <CrownIcon className="size-5 text-gold" />}
                    {isFrench ? plan.name : tTiers(plan.tier)}
                  </h3>
                  {plan.tagline && (
                    <p className="mt-1 text-sm text-muted-foreground" {...frenchText}>
                      {plan.tagline}
                    </p>
                  )}
                  <p className="mt-5 flex items-baseline gap-1.5">
                    <span className="font-display text-5xl font-extrabold">
                      {formatPrice(plan.priceCents, plan.currency, locale)}
                    </span>
                    <span className="text-muted-foreground">{tp("perMonth")}</span>
                  </p>
                  {/* Trois points clés seulement : le détail complet est sur la page des offres. */}
                  <ul className="mt-6 mb-7 space-y-2.5">
                    {plan.features.slice(0, 3).map((feature) => (
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
                    {plan.tier === "standard" && founderPlan && (
                      <p className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-white/85">
                        {t("founderKeepsPrice", { price })}
                      </p>
                    )}
                    {isFounder ? (
                      settings.founderSignupsOpen ? (
                        <Button asChild size="lg" variant="gold" className="w-full">
                          <Link href={ctaHref}>
                            <CrownIcon /> {t("cta")}
                          </Link>
                        </Button>
                      ) : (
                        <p className="rounded-lg bg-muted p-3 text-center text-sm text-muted-foreground">
                          {tp("founderClosed")}
                        </p>
                      )
                    ) : (
                      <Button asChild size="lg" variant="outline" className="w-full">
                        <Link href={`/offres?formule=${plan.code}`}>{t("planDetails")}</Link>
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="mt-8 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>{t("honesty")}</p>
            <p>
              {t("priceNote")} {t("notDonation")}
            </p>
            <Link
              href="/offres"
              className="inline-flex items-center gap-1.5 font-semibold text-primary-text hover:underline"
            >
              {t("comparePlans")} <ArrowRightIcon className="size-4 rtl:rotate-180" />
            </Link>
          </div>
        </section>
      )}

      {/* Catalogue disponible et annoncé (uniquement ce qui existe réellement) */}
      {includedForFounders.length > 0 && (
        <div className="py-6">
          <TitleRow
            title={t("includedTitle")}
            items={includedForFounders}
            layout="poster"
            href="/catalogue"
          />
        </div>
      )}
      {announced.length > 0 && (
        <div className="py-6">
          <TitleRow
            title={tf("announcedTitle")}
            items={announced}
            layout="poster"
            href="/prochainement"
          />
        </div>
      )}

      {/* Avancement : une ligne et un lien, le détail est sur la feuille de route */}
      <section className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
        <div className="bg-tamurt-pattern flex flex-col items-start gap-4 rounded-2xl border bg-card/70 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-3 text-lg text-white/90">
            <GlobeIcon className="size-5 shrink-0 text-gold" />
            {t("founderCount", { count: founderCount })}
          </p>
          <Button asChild variant="outline">
            <Link href="/feuille-de-route">{t("progressCta")}</Link>
          </Button>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="mb-8 text-center text-3xl font-bold">{t("faqTitle")}</h2>
        <div className="space-y-3">
          {faq.map(({ q, a }) => (
            <details key={q} className="group rounded-xl border bg-card/60 p-5 open:bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {q}
                <span
                  className="text-xl text-muted-foreground transition group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Button asChild size="lg">
            <Link href={ctaHref}>
              <CrownIcon /> {t("cta")}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
