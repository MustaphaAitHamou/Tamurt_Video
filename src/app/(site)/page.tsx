import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CrownIcon } from "lucide-react";

import { HeroCarousel } from "@/components/catalog/hero-carousel";
import { EmptyState } from "@/components/catalog/empty-state";
import { TitleRow } from "@/components/catalog/title-row";
import { FounderLanding } from "@/components/founder/founder-landing";
import { Button } from "@/components/ui/button";
import { getHeroSlides, getHomeSections } from "@/server/catalog/queries";
import { getViewer } from "@/server/auth/session";
import { getPublicSettings } from "@/server/settings";

export default async function HomePage() {
  const [viewer, settings] = await Promise.all([getViewer(), getPublicSettings()]);

  // Phase de soutien : les visiteurs découvrent d'abord le projet et l'offre fondateur.
  if (!viewer && settings.launchPhase === "founder") {
    return <FounderLanding />;
  }

  const [slides, sections, t, tf] = await Promise.all([
    getHeroSlides(),
    getHomeSections(),
    getTranslations("home"),
    getTranslations("founderLanding"),
  ]);
  const showFounderCta =
    settings.launchPhase === "founder" &&
    settings.founderSignupsOpen &&
    viewer &&
    viewer.entitlements.tier === "free";

  if (slides.length === 0 && sections.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-32 pb-16">
        <EmptyState
          title={t("emptyCatalogTitle")}
          description={t("emptyCatalogText")}
          action={{ href: "/feuille-de-route", label: t("emptyCatalogCta") }}
        />
      </div>
    );
  }

  return (
    <div className="pb-10">
      {slides.length > 0 ? <HeroCarousel slides={slides} /> : <div className="h-24" />}
      <div
        className={
          slides.length > 0
            ? "relative z-10 -mt-20 space-y-8 sm:-mt-28 sm:space-y-10"
            : "space-y-10"
        }
      >
        {showFounderCta && (
          <div className="px-4 sm:px-6 lg:px-10">
            <div className="flex flex-col items-start gap-4 rounded-2xl border border-gold/30 bg-gradient-to-r from-gold/15 via-card to-card p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-3 text-sm sm:text-base">
                <CrownIcon className="size-5 shrink-0 text-gold" />
                {tf("subtitle")}
              </p>
              <Button asChild variant="gold" className="shrink-0">
                <Link href="/offres?formule=founder">{tf("cta")}</Link>
              </Button>
            </div>
          </div>
        )}
        {sections.map((section, index) => (
          <TitleRow
            key={section.id}
            title={section.title}
            items={section.items}
            layout={section.layout}
            href={section.href}
            priority={index === 0 && slides.length === 0}
          />
        ))}
      </div>
    </div>
  );
}
