import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { AdSlot } from "@/components/ads/ad-slot";
import { Markdown } from "@/components/content/markdown";
import { Badge } from "@/components/ui/badge";
import { isLocale, localeIntlTag } from "@/i18n/config";
import { formatDate } from "@/lib/format";
import { getAnnouncement } from "@/server/content";

export async function generateMetadata({ params }: PageProps<"/actualites/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const item = await getAnnouncement(slug);
  if (!item) return { title: "Actualité introuvable" };
  return {
    title: item.title,
    description: item.excerpt ?? undefined,
    alternates: { canonical: `/actualites/${item.slug}` },
    openGraph: { type: "article", title: item.title, description: item.excerpt ?? undefined, images: item.coverUrl ? [item.coverUrl] : undefined },
    robots: item.audience === "public" ? undefined : { index: false },
  };
}

export default async function NewsArticlePage({ params }: PageProps<"/actualites/[slug]">) {
  const { slug } = await params;
  const item = await getAnnouncement(slug);
  if (!item || item.status !== "published") notFound();
  const [t, rawLocale] = await Promise.all([getTranslations("news"), getLocale()]);
  const locale = isLocale(rawLocale) ? localeIntlTag[rawLocale] : "fr-FR";
  const half = item.body.indexOf("\n\n", Math.floor(item.body.length / 2));
  const [first, second] = half > 0 ? [item.body.slice(0, half), item.body.slice(half)] : [item.body, ""];
  return (
    <article className="mx-auto max-w-3xl px-4 pt-28 pb-16">
      <Link href="/actualites" className="text-sm text-muted-foreground hover:text-foreground">
        ← {t("title")}
      </Link>
      <header className="mt-6 mb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{t(`categories.${item.category}`)}</Badge>
          <time dateTime={item.published_at ?? undefined}>{t("publishedOn", { date: formatDate(item.published_at, locale) })}</time>
        </div>
        <h1 className="text-4xl leading-tight font-bold">{item.title}</h1>
        {item.excerpt && <p className="text-lg text-muted-foreground">{item.excerpt}</p>}
      </header>
      {item.coverUrl && (
        <div className="relative mb-8 aspect-video overflow-hidden rounded-2xl">
          <Image src={item.coverUrl} alt="" fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" priority />
        </div>
      )}
      <Markdown>{first}</Markdown>
      {second && (
        <>
          <AdSlot slotKey="news_inline" className="my-8" />
          <Markdown>{second}</Markdown>
        </>
      )}
    </article>
  );
}
