"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { SearchIcon, XIcon, Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

type Suggestion = { id: string; slug: string; title: string; kind: string; year: number | null; poster: string | null };

/** Recherche instantanée accessible (combobox ARIA, navigation au clavier). */
export function SearchBox({ className, autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const t = useTranslations("search");
  const tk = useTranslations("kinds");
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (response.ok) {
          const body = (await response.json()) as { results: Suggestion[] };
          setResults(body.results);
          setActive(-1);
          setOpen(true);
        }
      } catch {
        // Requête annulée ou réseau indisponible : la page de résultats reste accessible.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  function goToResults() {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setOpen(false);
    router.push(`/recherche?q=${encodeURIComponent(trimmed)}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, -1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = results[active];
      if (selected) {
        setOpen(false);
        router.push(`/titre/${selected.slug}`);
      } else {
        goToResults();
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          goToResults();
        }}
        className="relative"
      >
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 z-10 size-4 -translate-y-1/2 text-white/60" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={query}
          autoFocus={autoFocus}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder={t("placeholder")}
          aria-label={t("label")}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          maxLength={200}
          className="h-10 w-full rounded-full border border-white/10 bg-black/40 ps-9 pe-9 text-sm backdrop-blur-md transition outline-none placeholder:text-muted-foreground focus:border-white/30 focus:bg-black/60 [&::-webkit-search-cancel-button]:hidden"
        />
        {loading ? (
          <Loader2Icon className="absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            aria-label="Effacer"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </form>
      {open && query.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-12 z-50 overflow-hidden rounded-xl border bg-popover/95 shadow-2xl backdrop-blur-xl">
          <ul id={listId} role="listbox" aria-label={t("suggestions")} className="max-h-96 overflow-y-auto p-1.5">
            {results.length === 0 && !loading && (
              <li className="px-3 py-4 text-sm text-muted-foreground">{t("noResults", { query: query.trim() })}</li>
            )}
            {results.map((item, index) => (
              <li
                key={item.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => {
                  event.preventDefault();
                  setOpen(false);
                  router.push(`/titre/${item.slug}`);
                }}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5",
                  index === active && "bg-accent",
                )}
              >
                <span className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-muted">
                  {item.poster && <Image src={item.poster} alt="" fill sizes="32px" className="object-cover" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {tk(item.kind)}
                    {item.year ? ` · ${item.year}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {results.length > 0 && (
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                goToResults();
              }}
              className="w-full border-t px-4 py-2.5 text-start text-sm font-medium text-primary hover:bg-accent"
            >
              {t("seeAllResults")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
