"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { InfoIcon, PlayIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HeroSlide } from "@/server/catalog/types";

const ROTATION_MS = 9000;

/** Bannière cinématographique en rotation (pause au survol, au focus et si mouvement réduit). */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const tk = useTranslations("kinds");
  const tt = useTranslations("title");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (slides.length < 2 || paused || reducedMotion.current) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), ROTATION_MS);
    return () => clearInterval(timer);
  }, [slides.length, paused]);

  if (slides.length === 0) return null;

  return (
    <section
      aria-roledescription="carrousel"
      aria-label={t("watchNow")}
      className="relative h-[78svh] min-h-[520px] w-full overflow-hidden sm:h-[86svh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((slide, i) => {
        const title = slide.title;
        const watchHref = title
          ? title.status === "published"
            ? `/regarder/${title.slug}`
            : `/titre/${title.slug}`
          : (slide.ctaHref ?? "/catalogue");
        const isActive = i === index;
        return (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="diapositive"
            aria-label={`${i + 1} / ${slides.length}`}
            aria-hidden={!isActive}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 ease-out",
              isActive ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {slide.imageUrl ? (
              <Image
                src={slide.imageUrl}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                className={cn(
                  "object-cover transition-transform duration-[12000ms] ease-out",
                  isActive && "scale-105",
                )}
              />
            ) : (
              <div className="bg-tamurt-pattern absolute inset-0 bg-gradient-to-br from-red-950 via-zinc-950 to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent rtl:bg-gradient-to-l" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/30" />

            <div className="absolute inset-x-0 bottom-[16%] px-4 sm:px-6 lg:px-10">
              <div className={cn("max-w-2xl space-y-4", isActive && "animate-fade-up")}>
                <div className="flex flex-wrap items-center gap-2">
                  {title?.isOriginal && <Badge>{t("originalBadge")}</Badge>}
                  {title?.isDemo && (
                    <Badge variant="muted" title={tc("demoTooltip")}>
                      {tc("demo")}
                    </Badge>
                  )}
                  {title?.status === "announced" && (
                    <Badge variant="gold">{tt("comingSoon")}</Badge>
                  )}
                  {title && (
                    <span className="text-sm font-medium text-white/80">
                      {tk(title.kind)}
                      {title.releaseYear ? ` · ${title.releaseYear}` : ""}
                    </span>
                  )}
                </div>
                <h1
                  dir="auto"
                  className="text-shadow-hero text-4xl leading-[1.05] font-extrabold sm:text-6xl lg:text-7xl"
                >
                  {slide.headline}
                </h1>
                {slide.subheadline && (
                  <p
                    dir="auto"
                    className="text-shadow-hero line-clamp-3 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg"
                  >
                    {slide.subheadline}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button asChild size="lg" variant="light" tabIndex={isActive ? 0 : -1}>
                    <Link href={watchHref}>
                      <PlayIcon className="fill-current" />
                      {slide.ctaLabel ??
                        (title?.status === "announced" ? t("moreInfo") : t("watchNow"))}
                    </Link>
                  </Button>
                  {title && (
                    <Button asChild size="lg" variant="glass" tabIndex={isActive ? 0 : -1}>
                      <Link href={`/titre/${title.slug}`}>
                        <InfoIcon />
                        {t("moreInfo")}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {slides.length > 1 && (
        <div className="absolute end-4 bottom-[8%] flex gap-2 sm:end-6 lg:end-10">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${i + 1} / ${slides.length}`}
              aria-current={i === index}
              className={cn(
                "h-1.5 cursor-pointer rounded-full transition-all",
                i === index ? "w-8 bg-white" : "w-3 bg-white/40 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
