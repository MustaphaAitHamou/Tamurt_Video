import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { NewspaperIcon, PinIcon } from "lucide-react";

import { AdSlot } from "@/components/ads/ad-slot";
import { EmptyState } from "@/components/catalog/empty-state";
import { Badge } from "@/components/ui/badge";
import { isLocale, localeIntlTag } from "@/i18n/config";
import { formatDate } from "@/lib/format";
import { getAnnouncements } from "@/server/content";

export const metadata: Metadata = {
  title: "Actualités",
  description:
    "Les nouvelles du projet Tamurt Vidéo : acquisitions, partenariats, nouvelles fonctionnalités.",
  alternates: { canonical: "/actualites" },
};

export default async function NewsPage() {
  const [t, items, rawLocale] = await Promise.all([
    getTranslations("news"),
    getAnnouncements({ limit: 40 }),
    getLocale(),
  ]);
  const locale = isLocale(rawLocale) ? localeIntlTag[rawLocale] : "fr-FR";
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-28 pb-16 sm:px-6 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="mb-10 space-y-3">
          <h1 className="text-3xl font-bold sm:text-4xl">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        {items.length === 0 ? (
          <EmptyState title={t("empty")} icon={NewspaperIcon} />
        ) : (
          <ul className="space-y-5">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/actualites/${item.slug}`}
                  className="group grid gap-5 rounded-2xl border bg-card/60 p-5 transition hover:border-white/20 sm:grid-cols-[200px_1fr]"
                >
                  <span className="bg-tamurt-pattern relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-primary/30 to-card">
                    {item.coverUrl && (
                      <Image
                        src={item.coverUrl}
                        alt=""
                        fill
                        sizes="200px"
                        className="object-cover"
                      />
                    )}
                  </span>
                  <span className="space-y-2">
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {item.pinned && <PinIcon className="size-3.5 text-primary-text" />}
                      <Badge variant="outline">{t(`categories.${item.category}`)}</Badge>
                      {item.audience !== "public" && (
                        <Badge variant="gold">{t("membersOnly")}</Badge>
                      )}
                      {t("publishedOn", { date: formatDate(item.publishedAt, locale) })}
                    </span>
                    <span dir="auto" className="block text-lg font-semibold group-hover:underline">
                      {item.title}
                    </span>
                    {item.excerpt && (
                      <span className="block text-sm text-muted-foreground">{item.excerpt}</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <aside className="space-y-6">
        <AdSlot slotKey="news_sidebar" />
      </aside>
    </div>
  );
}
