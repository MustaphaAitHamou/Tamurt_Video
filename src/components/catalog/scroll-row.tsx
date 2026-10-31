"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Rangée défilante horizontale avec boutons accessibles et défilement fluide. */
export function ScrollRow({
  children,
  labelPrev,
  labelNext,
  className,
}: {
  children: React.ReactNode;
  labelPrev: string;
  labelNext: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const scrollStart = rtl ? -el.scrollLeft : el.scrollLeft;
    setCanPrev(scrollStart > 8);
    setCanNext(scrollStart + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [update]);

  const scroll = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: direction * (rtl ? -1 : 1) * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <div className={cn("group/row relative", className)}>
      <div
        ref={ref}
        className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pt-1 pb-4 sm:gap-4 sm:px-6 lg:px-10 [&>*]:snap-start"
      >
        {children}
      </div>
      <button
        type="button"
        aria-label={labelPrev}
        onClick={() => scroll(-1)}
        className={cn(
          "absolute inset-y-0 start-0 z-10 hidden w-10 cursor-pointer items-center justify-center bg-gradient-to-r from-background/90 to-transparent text-white opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 sm:flex lg:w-12 rtl:bg-gradient-to-l",
          !canPrev && "pointer-events-none !opacity-0",
        )}
        tabIndex={canPrev ? 0 : -1}
      >
        <ChevronLeftIcon className="size-7 rtl:rotate-180" />
      </button>
      <button
        type="button"
        aria-label={labelNext}
        onClick={() => scroll(1)}
        className={cn(
          "absolute inset-y-0 end-0 z-10 hidden w-10 cursor-pointer items-center justify-center bg-gradient-to-l from-background/90 to-transparent text-white opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 sm:flex lg:w-12 rtl:bg-gradient-to-r",
          !canNext && "pointer-events-none !opacity-0",
        )}
        tabIndex={canNext ? 0 : -1}
      >
        <ChevronRightIcon className="size-7 rtl:rotate-180" />
      </button>
    </div>
  );
}
