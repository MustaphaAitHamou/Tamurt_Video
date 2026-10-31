import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VideoPlayer } from "@/components/player/video-player";
import { getTitleDetail } from "@/server/catalog/queries";

export const metadata: Metadata = { title: "Lecture", robots: { index: false, follow: false } };

export default async function WatchPage({ params, searchParams }: PageProps<"/regarder/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const title = await getTitleDetail(slug);
  if (!title) notFound();

  const isTrailer = query["bande-annonce"] === "1";
  const requestedEpisode = typeof query.episode === "string" && /^[0-9a-f-]{36}$/.test(query.episode) ? query.episode : null;
  const episodes = title.seasons.flatMap((season) =>
    season.episodes.map((episode) => ({
      id: episode.id,
      name: episode.name,
      label: `S${season.number} · É${episode.number}`,
    })),
  );
  const episodeId = isTrailer ? null : title.structure === "episodic" ? (requestedEpisode ?? episodes[0]?.id ?? null) : null;
  const current = episodes.find((e) => e.id === episodeId) ?? null;
  const path = `/regarder/${title.slug}${episodeId ? `?episode=${episodeId}` : ""}`;

  return (
    <VideoPlayer
      key={`${title.id}-${episodeId ?? "film"}-${isTrailer ? "trailer" : "main"}`}
      titleId={title.id}
      episodeId={episodeId}
      kind={isTrailer ? "trailer" : "main"}
      slug={title.slug}
      heading={title.title}
      subheading={isTrailer ? "Bande-annonce" : current ? `${current.label} — ${current.name}` : null}
      backHref={`/titre/${title.slug}`}
      posterUrl={title.backdropUrl}
      episodes={isTrailer ? [] : episodes}
      signInHref={`/connexion?next=${encodeURIComponent(path)}`}
    />
  );
}
