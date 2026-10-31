import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  CheckIcon,
  CrownIcon,
  GlobeIcon,
  LandmarkIcon,
  LanguagesIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TitleRow } from "@/components/catalog/title-row";
import { localeIntlTag, isLocale } from "@/i18n/config";
import { formatIndicativeDzd, formatPrice } from "@/lib/format";
import { getActiveFounderCount, getPublicPlans } from "@/server/billing/plans";
import { listCatalog } from "@/server/catalog/queries";
import { getRoadmap } from "@/server/content";
import { getPublicSettings } from "@/server/settings";

/** Page d'accueil publique de la phase de soutien à 2 €. */
export async function FounderLanding() {
  const [t, tf, tp, settings, plans, founderCount, roadmap, announced, available, rawLocale] =
    await Promise.all([
      getTranslations("founderLanding"),
      getTranslations("founder"),
      getTranslations("pricing"),
      getPublicSettings(),
      getPublicPlans(),
      getActiveFounderCount(),
      getRoadmap(),
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
  const benefits = [t("benefit1"), t("benefit2"), t("benefit3"), t("benefit4"), t("benefit5")];
  const faq = [1, 2, 3, 4].map((n) => ({ q: t(`faq${n}Q`), a: t(`faq${n}A`) }));

  return (
    <div className="relative">
      {/* Héros */}
      <section className="relative isolate overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
        <div className="bg-tamurt-pattern absolute inset-0 -z-10 opacity-80" aria-hidden />
        <div
          className="absolute start-1/2 -top-40 -z-10 h-[620px] w-[920px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(227,38,58,0.35),transparent)] blur-2xl rtl:translate-x-1/2"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent"
          aria-hidden
        />
        <div className="mx-auto grid max-w-[1400px] items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:px-10">
          <div className="animate-fade-up space-y-7">
            <Badge variant="gold" className="gap-1.5 px-3 py-1 text-xs tracking-wide uppercase">
              <CrownIcon /> {t("eyebrow")}
            </Badge>
            <h1 className="text-4xl leading-[1.05] font-extrabold sm:text-6xl">{t("title")}</h1>
            <p className="max-w-xl text-lg leading-relaxed text-white/80">{t("subtitle")}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={ctaHref}>
                  <CrownIcon /> {t("cta")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="glass">
                <Link href="#projet">{t("ctaSecondary")}</Link>
              </Button>
            </div>
            <p className="max-w-xl rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-muted-foreground">
              {t("honesty")}
            </p>
          </div>

          {/* Carte tarif */}
          <div className="relative mx-auto w-full max-w-md">
            <div
              className="absolute -inset-1 rounded-[28px] bg-gradient-to-br from-gold/60 via-primary/40 to-transparent opacity-70 blur"
              aria-hidden
            />
            <div className="relative space-y-6 rounded-3xl border border-white/10 bg-card/95 p-8 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-display text-lg font-semibold">
                  <LogoMark className="size-7" /> {founderPlan?.name ?? "Fondateur"}
                </span>
                <Badge variant="gold">{tf("badge")}</Badge>
              </div>
              <div>
                <p className="flex items-baseline gap-2">
                  <span className="font-display text-6xl font-extrabold">{price}</span>
                  <span className="text-muted-foreground">{t("priceLabel")}</span>
                </p>
                {dzd && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {dzd} <span className="text-xs">({tp("indicative").toLowerCase()})</span>
                  </p>
                )}
              </div>
              <ul className="space-y-2.5">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex gap-2.5 text-sm leading-relaxed">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-gold" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              {settings.founderSignupsOpen ? (
                <Button asChild size="lg" className="w-full">
                  <Link href={ctaHref}>{t("cta")}</Link>
                </Button>
              ) : (
                <p className="rounded-lg bg-muted p-3 text-center text-sm text-muted-foreground">
                  {tp("founderClosed")}
                </p>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">{t("priceNote")}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{t("notDonation")}</p>
            </div>
          </div>
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

      {/* Avancement */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold sm:text-4xl">{t("progressTitle")}</h2>
            <p className="flex items-center gap-2 text-lg text-white/85">
              <GlobeIcon className="size-5 text-gold" />
              {t("founderCount", { count: founderCount })}
            </p>
            <Button asChild variant="outline">
              <Link href="/feuille-de-route">{t("progressCta")}</Link>
            </Button>
          </div>
          <ul className="space-y-4">
            {roadmap.slice(0, 5).map((item) => (
              <li key={item.id} className="rounded-xl border bg-card/60 p-5">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <span dir="auto" className="font-medium">
                    {item.title}
                  </span>
                  <Badge
                    variant={
                      item.status === "done"
                        ? "success"
                        : item.status === "in_progress"
                          ? "gold"
                          : "muted"
                    }
                  >
                    {tf(`roadmapStatuses.${item.status}`)}
                  </Badge>
                </div>
                <Progress value={item.progress} aria-label={item.title} />
              </li>
            ))}
          </ul>
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
