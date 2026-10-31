import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PlayIcon } from "lucide-react";

import { TitleBadges } from "@/components/catalog/title-badges";
import { cn } from "@/lib/utils";
import type { TitleCardData } from "@/server/catalog/types";

type Variant = "poster" | "landscape" | "large";

function Artwork({ title, variant, priority }: { title: TitleCardData; variant: Variant; priority?: boolean }) {
  const src = variant === "poster" ? title.posterUrl ?? title.backdropUrl : title.backdropUrl ?? title.posterUrl;
  if (!src) {
    return (
      <div className="bg-tamurt-pattern flex size-full items-end bg-gradient-to-br from-zinc-800 to-zinc-950 p-3">
        <span className="font-display text-sm font-semibold text-white/80">{title.title}</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt=""
      fill
      priority={priority}
      sizes={
        variant === "poster"
          ? "(max-width: 640px) 40vw, (max-width: 1024px) 22vw, 14vw"
          : variant === "large"
            ? "(max-width: 640px) 85vw, 40vw"
            : "(max-width: 640px) 70vw, (max-width: 1024px) 40vw, 24vw"
      }
      className="object-cover transition duration-500 group-hover:scale-105"
    />
  );
}

/** Carte d'œuvre : affiche, effets de survol, badges et progression éventuelle. */
export function TitleCard({
  title,
  variant = "poster",
  priority = false,
  rank,
  className,
}: {
  title: TitleCardData;
  variant?: Variant;
  priority?: boolean;
  rank?: number;
  className?: string;
}) {
  const tk = useTranslations("kinds");
  const th = useTranslations("home");
  const progress = title.progress;
  const percent =
    progress && progress.durationSeconds ? Math.min(100, Math.round((progress.positionSeconds / progress.durationSeconds) * 100)) : 0;
  const href = progress
    ? `/regarder/${title.slug}${progress.episodeId ? `?episode=${progress.episodeId}` : ""}`
    : `/titre/${title.slug}`;
  const ratio = variant === "poster" ? "aspect-[2/3]" : "aspect-video";

  return (
    <Link
      href={href}
      className={cn("group relative block shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      aria-label={`${title.title}${progress?.episodeLabel ? ` — ${progress.episodeLabel}` : ""}`}
    >
      <div className="flex items-end">
        {typeof rank === "number" && (
          <span
            aria-hidden
            className="-me-4 w-[38%] shrink-0 text-end font-display text-[6.5rem] leading-[0.78] font-black text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.4)] sm:text-[8rem]"
          >
            {rank}
          </span>
        )}
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-xl bg-muted shadow-lg ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-black/60 group-hover:ring-white/20",
            ratio,
          )}
        >
          <Artwork title={title} variant={variant} priority={priority} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
          <div className="absolute start-2 top-2">
            <TitleBadges title={title} compact={variant === "poster"} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-black shadow-xl">
              <PlayIcon className="ms-0.5 size-5 fill-current" />
            </span>
          </div>
          {variant !== "poster" && (
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="line-clamp-1 font-display text-base font-semibold text-white">{title.title}</p>
              <p className="text-xs text-white/70">
                {progress?.isNextEpisode ? th("nextEpisode") : progress?.episodeLabel ?? tk(title.kind)}
                {!progress && title.releaseYear ? ` · ${title.releaseYear}` : ""}
              </p>
            </div>
          )}
          {progress && percent > 0 && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
              <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
          )}
        </div>
      </div>
      {variant === "poster" && typeof rank !== "number" && (
        <div className="mt-2 px-0.5">
          <p className="line-clamp-1 text-sm font-medium text-white/90">{title.title}</p>
          <p className="text-xs text-muted-foreground">
            {tk(title.kind)}
            {title.releaseYear ? ` · ${title.releaseYear}` : ""}
          </p>
        </div>
      )}
    </Link>
  );
}
