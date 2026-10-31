import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "lucide-react";

import { ScrollRow } from "@/components/catalog/scroll-row";
import { TitleCard } from "@/components/catalog/title-card";
import { cn } from "@/lib/utils";
import type { HomeSectionLayout, TitleCardData } from "@/server/catalog/types";

const widths: Record<HomeSectionLayout, string> = {
  poster: "w-[38vw] sm:w-[24vw] md:w-[18vw] lg:w-[14vw] xl:w-[12vw]",
  landscape: "w-[72vw] sm:w-[42vw] md:w-[32vw] lg:w-[24vw] xl:w-[20vw]",
  large: "w-[82vw] sm:w-[56vw] md:w-[44vw] lg:w-[34vw]",
  top10: "w-[58vw] sm:w-[38vw] md:w-[29vw] lg:w-[23vw] xl:w-[19vw]",
};

/** Rangée de titres d'une section de l'accueil. */
export function TitleRow({
  title,
  items,
  layout = "poster",
  href,
  priority = false,
}: {
  title: string;
  items: TitleCardData[];
  layout?: HomeSectionLayout;
  href?: string | null;
  priority?: boolean;
}) {
  const t = useTranslations("common");
  const headingId = `row-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <section aria-labelledby={headingId} className="relative">
      <div className="mb-2 flex items-end justify-between px-4 sm:px-6 lg:px-10">
        <h2 id={headingId} className="text-lg font-semibold sm:text-xl">
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="group inline-flex items-center gap-0.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            {t("seeAll")}
            <ChevronRightIcon className="size-4 transition group-hover:translate-x-0.5 rtl:rotate-180" />
          </Link>
        )}
      </div>
      <ScrollRow labelPrev={t("scrollLeft")} labelNext={t("scrollRight")}>
        {items.map((item, index) => (
          <TitleCard
            key={`${item.id}-${item.progress?.episodeId ?? ""}`}
            title={item}
            variant={layout === "top10" ? "poster" : layout}
            rank={layout === "top10" ? index + 1 : undefined}
            priority={priority && index < 4}
            className={cn(widths[layout])}
          />
        ))}
      </ScrollRow>
    </section>
  );
}
