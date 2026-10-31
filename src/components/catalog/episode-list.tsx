"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PlayIcon } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRuntime } from "@/lib/format";
import type { SeasonData } from "@/server/catalog/types";

export function EpisodeList({
  slug,
  seasons,
  playable,
}: {
  slug: string;
  seasons: SeasonData[];
  playable: boolean;
}) {
  const t = useTranslations("title");
  if (seasons.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noEpisodes")}</p>;
  }
  return (
    <Tabs defaultValue={seasons[0]?.id}>
      {seasons.length > 1 && (
        <TabsList>
          {seasons.map((season) => (
            <TabsTrigger key={season.id} value={season.id}>
              {season.number === 0 ? t("specials") : t("season", { number: season.number })}
            </TabsTrigger>
          ))}
        </TabsList>
      )}
      {seasons.map((season) => (
        <TabsContent key={season.id} value={season.id}>
          <ol className="divide-y divide-border overflow-hidden rounded-2xl border">
            {season.episodes.map((episode) => {
              const percent =
                episode.progress?.durationSeconds && !episode.progress.completed
                  ? Math.round((episode.progress.positionSeconds / episode.progress.durationSeconds) * 100)
                  : episode.progress?.completed
                    ? 100
                    : 0;
              const content = (
                <>
                  <span className="w-6 shrink-0 text-center font-display text-lg text-muted-foreground">{episode.number}</span>
                  <span className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-44">
                    {episode.stillUrl && <Image src={episode.stillUrl} alt="" fill sizes="176px" className="object-cover" />}
                    {playable && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                        <PlayIcon className="size-7 fill-white text-white" />
                      </span>
                    )}
                    {percent > 0 && (
                      <span className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                        <span className="block h-full bg-primary" style={{ width: `${percent}%` }} />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span dir="auto" className="truncate font-medium">{episode.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatRuntime(episode.runtimeMinutes)}</span>
                    </span>
                    {episode.synopsis && (
                      <span dir="auto" className="line-clamp-2 text-sm text-muted-foreground">
                        {episode.synopsis}
                      </span>
                    )}
                  </span>
                </>
              );
              return (
                <li key={episode.id}>
                  {playable ? (
                    <Link
                      href={`/regarder/${slug}?episode=${episode.id}`}
                      className="group flex items-center gap-4 p-3 transition hover:bg-white/[0.04] sm:p-4"
                      aria-label={`${t("episodeNumber", { number: episode.number })} : ${episode.name}`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="group flex items-center gap-4 p-3 sm:p-4">{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </TabsContent>
      ))}
    </Tabs>
  );
}
