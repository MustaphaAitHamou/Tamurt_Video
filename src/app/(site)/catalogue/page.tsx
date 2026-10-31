import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SlidersHorizontalIcon } from "lucide-react";

import { AutoSubmitSelect } from "@/components/catalog/auto-submit-select";
import { EmptyState } from "@/components/catalog/empty-state";
import { TitleGrid } from "@/components/catalog/title-grid";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CONTENT_LANGUAGES, COUNTRIES, TITLE_KINDS, type TitleKind } from "@/lib/constants";
import { genreLabel, getGenres, listCatalog, type CatalogFilters } from "@/server/catalog/queries";

export const metadata: Metadata = {
  title: "Catalogue",
  description: "Films, séries, documentaires et émissions disponibles sur Tamurt Vidéo.",
  alternates: { canonical: "/catalogue" },
};

const PAGE_SIZE = 30;
const SORTS = { popularite: "popular", nouveautes: "new", annee: "year", titre: "title" } as const;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CataloguePage({ searchParams }: PageProps<"/catalogue">) {
  const params = await searchParams;
  const kind = one(params.type);
  const genre = one(params.genre);
  const country = one(params.pays);
  const language = one(params.langue);
  const tag = one(params.tag);
  const collection = one(params.collection);
  const decade = one(params.decennie);
  const sortKey = (one(params.tri) ?? "popularite") as keyof typeof SORTS;
  const page = Math.max(1, Number(one(params.page)) || 1);

  const filters: CatalogFilters = {
    kind: TITLE_KINDS.includes(kind as TitleKind) ? (kind as TitleKind) : undefined,
    genre: genre && /^[a-z0-9-]{1,40}$/.test(genre) ? genre : undefined,
    originCountry: country && /^[A-Z]{2}$/.test(country) ? country : undefined,
    language: language && /^[a-z]{2,3}$/.test(language) ? language : undefined,
    tag: tag && /^[a-z0-9-]{1,40}$/.test(tag) ? tag : undefined,
    collection: collection && /^[a-z0-9-]{1,60}$/.test(collection) ? collection : undefined,
    yearMin: decade && /^\d{4}$/.test(decade) ? Number(decade) : undefined,
    yearMax: decade && /^\d{4}$/.test(decade) ? Number(decade) + 9 : undefined,
    sort: SORTS[sortKey] ?? "popular",
    limit: PAGE_SIZE * page,
  };

  const [items, genres, t, tk, rawLocale] = await Promise.all([
    listCatalog(filters),
    getGenres(),
    getTranslations("browse"),
    getTranslations("kindsPlural"),
    getLocale(),
  ]);
  const hasMore = items.length >= PAGE_SIZE * page;
  const currentYear = new Date().getFullYear();
  const decades = Array.from({ length: 8 }, (_, i) => Math.floor(currentYear / 10) * 10 - i * 10);
  const nextParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const v = one(value);
    if (v && key !== "page") nextParams.set(key, v);
  }
  nextParams.set("page", String(page + 1));
  const heading = filters.kind ? tk(filters.kind) : t("title");

  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-28 pb-10 sm:px-6 lg:px-10">
      <h1 className="mb-6 text-3xl font-bold sm:text-4xl">{heading}</h1>
      <form
        method="get"
        className="mb-10 grid grid-cols-2 gap-3 rounded-2xl border bg-card/60 p-4 md:grid-cols-3 lg:grid-cols-6"
        aria-label={t("filters")}
      >
        <div className="space-y-1.5">
          <Label htmlFor="f-type">{t("type")}</Label>
          <AutoSubmitSelect id="f-type" name="type" defaultValue={filters.kind ?? ""}>
            <option value="">{t("allTypes")}</option>
            {TITLE_KINDS.map((k) => (
              <option key={k} value={k}>
                {tk(k)}
              </option>
            ))}
          </AutoSubmitSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-genre">{t("genre")}</Label>
          <AutoSubmitSelect id="f-genre" name="genre" defaultValue={filters.genre ?? ""}>
            <option value="">{t("allGenres")}</option>
            {genres.map((g) => (
              <option key={g.slug} value={g.slug}>
                {genreLabel(g.labels, rawLocale)}
              </option>
            ))}
          </AutoSubmitSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-pays">{t("country")}</Label>
          <AutoSubmitSelect id="f-pays" name="pays" defaultValue={filters.originCountry ?? ""}>
            <option value="">{t("allCountries")}</option>
            {Object.entries(COUNTRIES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </AutoSubmitSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-langue">{t("language")}</Label>
          <AutoSubmitSelect id="f-langue" name="langue" defaultValue={filters.language ?? ""}>
            <option value="">{t("allLanguages")}</option>
            {Object.entries(CONTENT_LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </AutoSubmitSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-decennie">{t("year")}</Label>
          <AutoSubmitSelect id="f-decennie" name="decennie" defaultValue={decade ?? ""}>
            <option value="">{t("allYears")}</option>
            {decades.map((d) => (
              <option key={d} value={d}>
                {d} – {d + 9}
              </option>
            ))}
          </AutoSubmitSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-tri">{t("sort")}</Label>
          <AutoSubmitSelect id="f-tri" name="tri" defaultValue={sortKey}>
            <option value="popularite">{t("sortPopular")}</option>
            <option value="nouveautes">{t("sortNew")}</option>
            <option value="annee">{t("sortYear")}</option>
            <option value="titre">{t("sortTitle")}</option>
          </AutoSubmitSelect>
        </div>
        {filters.tag && <input type="hidden" name="tag" value={filters.tag} />}
        {filters.collection && <input type="hidden" name="collection" value={filters.collection} />}
        <noscript>
          <Button type="submit" size="sm">
            <SlidersHorizontalIcon /> {t("apply")}
          </Button>
        </noscript>
        <div className="col-span-full flex justify-end">
          <Link href="/catalogue" className="text-sm text-muted-foreground hover:text-foreground">
            {t("reset")}
          </Link>
        </div>
      </form>

      {items.length === 0 ? (
        <EmptyState title={t("empty")} action={{ href: "/demandes", label: t("emptyCta") }} />
      ) : (
        <>
          <TitleGrid items={items} />
          {hasMore && (
            <div className="mt-12 flex justify-center">
              <Button asChild variant="secondary" size="lg">
                <Link href={`/catalogue?${nextParams.toString()}`} scroll={false}>
                  {t("loadMore")}
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
