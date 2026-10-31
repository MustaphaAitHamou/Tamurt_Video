import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlertCircleIcon, ClapperboardIcon, CrownIcon, LockIcon, PlayIcon } from "lucide-react";

import { AgeRatingBadge, TitleBadges } from "@/components/catalog/title-badges";
import { EpisodeList } from "@/components/catalog/episode-list";
import { ShareButton } from "@/components/catalog/share-button";
import { TitleRow } from "@/components/catalog/title-row";
import { WatchlistButton } from "@/components/catalog/watchlist-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { countryName, languageName } from "@/lib/constants";
import { formatRuntime } from "@/lib/format";
import { tierAtLeast } from "@/lib/permissions";
import { publicEnv } from "@/lib/public-env";
import {
  getCatalogContext,
  getSimilarTitles,
  getTitleDetail,
  getWatchlistIds,
} from "@/server/catalog/queries";

export async function generateMetadata({ params }: PageProps<"/titre/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const title = await getTitleDetail(slug);
  if (!title) return { title: "Œuvre introuvable" };
  return {
    title: title.title,
    description: title.synopsisShort ?? undefined,
    alternates: { canonical: `/titre/${title.slug}` },
    openGraph: {
      type: title.structure === "episodic" ? "video.tv_show" : "video.movie",
      title: title.title,
      description: title.synopsisShort ?? undefined,
      images: title.backdropUrl
        ? [{ url: title.backdropUrl, width: 1600, height: 900 }]
        : undefined,
    },
    robots: title.isDemo ? { index: false } : undefined,
  };
}

export default async function TitlePage({ params }: PageProps<"/titre/[slug]">) {
  const { slug } = await params;
  const [title, { viewer }] = await Promise.all([getTitleDetail(slug), getCatalogContext()]);
  if (!title) notFound();

  const [t, tk, tiers, similar, watchlist] = await Promise.all([
    getTranslations("title"),
    getTranslations("kinds"),
    getTranslations("tiers"),
    getSimilarTitles(title),
    getWatchlistIds(viewer),
  ]);

  const path = `/titre/${title.slug}`;
  const firstEpisode = title.seasons[0]?.episodes[0] ?? null;
  const resumeEpisode =
    title.seasons
      .flatMap((s) => s.episodes.map((e) => ({ ...e, season: s.number })))
      .find((e) => e.progress && !e.progress.completed) ?? null;
  const canAccessTier = viewer ? tierAtLeast(viewer.entitlements.tier, title.minTier) : false;
  const playable = title.availability === "available" && canAccessTier;
  const watchHref = `/regarder/${title.slug}${resumeEpisode ? `?episode=${resumeEpisode.id}` : firstEpisode ? `?episode=${firstEpisode.id}` : ""}`;

  const directors = title.credits.filter((c) => c.role === "director");
  const cast = title.credits.filter(
    (c) => c.role === "actor" || c.role === "presenter" || c.role === "guest",
  );
  const writers = title.credits.filter((c) => c.role === "writer");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": title.structure === "episodic" ? "TVSeries" : "Movie",
    name: title.title,
    alternateName: title.originalTitle ?? undefined,
    description: title.synopsisShort ?? undefined,
    image: title.posterUrl ? new URL(title.posterUrl, publicEnv.siteUrl).toString() : undefined,
    dateCreated: title.releaseYear ? String(title.releaseYear) : undefined,
    genre: title.genres.map((g) => g.label),
    inLanguage: title.originalLanguages,
    director: directors.map((d) => ({ "@type": "Person", name: d.name })),
    actor: cast.map((a) => ({ "@type": "Person", name: a.name })),
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden pt-28 pb-12">
        {title.backdropUrl && (
          <Image
            src={title.backdropUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/80 to-background/10 rtl:bg-gradient-to-l" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/30 to-black/40" />

        <div className="mx-auto grid w-full max-w-[1400px] items-end gap-10 px-4 sm:px-6 md:grid-cols-[minmax(0,260px)_1fr] lg:px-10">
          <div className="relative hidden aspect-[2/3] w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 md:block">
            {title.posterUrl && (
              <Image
                src={title.posterUrl}
                alt={title.title}
                fill
                sizes="260px"
                className="object-cover"
              />
            )}
          </div>
          <div className="max-w-3xl animate-fade-up space-y-5">
            <TitleBadges title={title} />
            <h1 dir="auto" className="text-4xl leading-[1.05] font-extrabold sm:text-6xl">
              {title.title}
            </h1>
            {title.originalTitle && title.originalTitle !== title.title && (
              <p className="text-sm text-white/70">
                {t("originalTitle")} :{" "}
                <span lang={title.originalLanguages[0]}>{title.originalTitle}</span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/80">
              <span>{tk(title.kind)}</span>
              {title.releaseYear && <span>· {title.releaseYear}</span>}
              {title.runtimeMinutes && title.structure === "single" && (
                <span>· {formatRuntime(title.runtimeMinutes)}</span>
              )}
              {title.structure === "episodic" && title.seasons.length > 0 && (
                <span>
                  ·{" "}
                  {title.seasons.length > 1
                    ? t("seasonCount", { count: title.seasons.length })
                    : t("episodeCount", { count: title.seasons[0]?.episodes.length ?? 0 })}
                </span>
              )}
              <AgeRatingBadge rating={title.ageRating} />
              {title.subtitleLanguages.length > 0 && (
                <Badge variant="outline" className="uppercase">
                  ST {title.subtitleLanguages.join(" · ")}
                </Badge>
              )}
            </div>
            {title.tagline && (
              <p dir="auto" className="font-display text-xl text-white/90 italic">
                {title.tagline}
              </p>
            )}
            {title.synopsisShort && (
              <p
                dir="auto"
                className="max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg"
              >
                {title.synopsisShort}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {title.availability === "taken_down" && (
                <p className="flex items-center gap-2 rounded-full bg-destructive/15 px-4 py-2 text-sm text-destructive">
                  <AlertCircleIcon className="size-4" /> {t("takenDown")}
                </p>
              )}
              {title.availability === "unavailable_territory" && (
                <p className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
                  <LockIcon className="size-4" /> {t("unavailableTerritory")}
                </p>
              )}
              {title.availability === "coming_soon" && (
                <p className="flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-sm text-gold">
                  <ClapperboardIcon className="size-4" /> {t("comingSoonNote")}
                </p>
              )}
              {title.availability === "available" && !viewer && (
                <Button asChild size="lg" variant="light">
                  <Link href={`/connexion?next=${encodeURIComponent(path)}`}>
                    <PlayIcon className="fill-current" /> {t("signInToWatch")}
                  </Link>
                </Button>
              )}
              {title.availability === "available" && viewer && !canAccessTier && (
                <>
                  <Button asChild size="lg" variant="gold">
                    <Link href="/offres">
                      <CrownIcon /> {t("upgradeToWatch", { plan: tiers(title.minTier) })}
                    </Link>
                  </Button>
                  <span className="text-sm text-white/70">
                    {t("requiresPlan", { plan: tiers(title.minTier) })}
                  </span>
                </>
              )}
              {playable && (
                <Button asChild size="lg" variant="light">
                  <Link href={watchHref}>
                    <PlayIcon className="fill-current" />
                    {resumeEpisode
                      ? t("resumeEpisode", {
                          season: resumeEpisode.season,
                          episode: resumeEpisode.number,
                        })
                      : title.progress
                        ? t("resume")
                        : t("play")}
                  </Link>
                </Button>
              )}
              {title.hasTrailer && title.availability !== "taken_down" && (
                <Button asChild size="lg" variant="glass">
                  <Link href={`/regarder/${title.slug}?bande-annonce=1`}>
                    <ClapperboardIcon /> {t("trailer")}
                  </Link>
                </Button>
              )}
              {title.availability !== "taken_down" && (
                <WatchlistButton
                  titleId={title.id}
                  initialInList={watchlist.has(title.id)}
                  signedIn={Boolean(viewer)}
                  nextPath={path}
                />
              )}
              <ShareButton title={title.title} path={path} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] space-y-14 px-4 sm:px-6 lg:px-10">
        {title.structure === "episodic" && (
          <section aria-labelledby="episodes-heading" className="space-y-5">
            <h2 id="episodes-heading" className="text-2xl font-bold">
              {t("episodes")}
            </h2>
            <EpisodeList slug={title.slug} seasons={title.seasons} playable={playable} />
          </section>
        )}

        <section aria-labelledby="about-heading" className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <h2 id="about-heading" className="text-2xl font-bold">
              {t("about")}
            </h2>
            {title.descriptionLong && (
              <p className="leading-relaxed whitespace-pre-line text-white/80">
                {title.descriptionLong}
              </p>
            )}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-2xl border bg-card/60 p-6 text-sm">
            {directors.length > 0 && (
              <>
                <dt className="text-muted-foreground">{t("director")}</dt>
                <dd>{directors.map((d) => d.name).join(", ")}</dd>
              </>
            )}
            {writers.length > 0 && (
              <>
                <dt className="text-muted-foreground">{t("writers")}</dt>
                <dd>{writers.map((d) => d.name).join(", ")}</dd>
              </>
            )}
            {cast.length > 0 && (
              <>
                <dt className="text-muted-foreground">{t("cast")}</dt>
                <dd>
                  {cast
                    .map((c) => (c.character ? `${c.name} (${c.character})` : c.name))
                    .join(", ")}
                </dd>
              </>
            )}
            {title.genres.length > 0 && (
              <>
                <dt className="text-muted-foreground">{t("genres")}</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {title.genres.map((g) => (
                    <Link
                      key={g.slug}
                      href={`/catalogue?genre=${g.slug}`}
                      className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs hover:bg-white/20"
                    >
                      {g.label}
                    </Link>
                  ))}
                </dd>
              </>
            )}
            {title.originalLanguages.length > 0 && (
              <>
                <dt className="text-muted-foreground">{t("languages")}</dt>
                <dd>{title.originalLanguages.map(languageName).join(", ")}</dd>
              </>
            )}
            {title.subtitleLanguages.length > 0 && (
              <>
                <dt className="text-muted-foreground">{t("subtitles")}</dt>
                <dd>{title.subtitleLanguages.map(languageName).join(", ")}</dd>
              </>
            )}
            {title.countries.length > 0 && (
              <>
                <dt className="text-muted-foreground">{t("countries")}</dt>
                <dd>{title.countries.map(countryName).join(", ")}</dd>
              </>
            )}
          </dl>
        </section>
      </div>

      {similar.length > 0 && (
        <div className="mt-14">
          <TitleRow title={t("moreLikeThis")} items={similar} layout="poster" />
        </div>
      )}
    </article>
  );
}
