import "server-only";

import { cache } from "react";

import { tierAtLeast } from "@/lib/permissions";
import { resolveImageUrl } from "@/lib/images";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { getViewer, type Viewer } from "@/server/auth/session";
import { getRequestCountry } from "@/server/http";
import { toTitleCard } from "@/server/catalog/mappers";
import {
  TITLE_CARD_COLUMNS,
  type HeroSlide,
  type HomeSectionData,
  type HomeSectionLayout,
  type SeasonData,
  type TitleCardData,
  type TitleDetail,
  type TitleKind,
} from "@/server/catalog/types";
import {
  defaultRecommendationEngine,
  type Candidate,
  type ViewingSignal,
} from "@/server/recommendations/engine";

type ListArgs = Database["public"]["Functions"]["list_catalog"]["Args"];

export type CatalogFilters = {
  kind?: TitleKind;
  genre?: string;
  originCountry?: string;
  language?: string;
  yearMin?: number;
  yearMax?: number;
  tag?: string;
  collection?: string;
  isOriginal?: boolean;
  status?: "published" | "announced" | "any";
  sort?: "popular" | "new" | "year" | "title" | "collection";
  limit?: number;
  offset?: number;
};

/** Contexte d'affichage : pays de la requête et restriction d'âge du profil actif. */
export const getCatalogContext = cache(async () => {
  const [viewer, country] = await Promise.all([getViewer(), getRequestCountry()]);
  return {
    viewer,
    country,
    maxAge: viewer?.activeProfile.maxAgeRating ?? null,
  };
});

export async function listCatalog(filters: CatalogFilters = {}): Promise<TitleCardData[]> {
  const { country, maxAge } = await getCatalogContext();
  const supabase = await createSupabaseServerClient();
  const args: ListArgs = {
    p_country: country,
    p_sort: filters.sort ?? "popular",
    p_status: filters.status ?? "published",
    p_limit: filters.limit ?? 24,
    p_offset: filters.offset ?? 0,
  };
  if (filters.kind) args.p_kind = filters.kind;
  if (filters.genre) args.p_genre = filters.genre;
  if (filters.originCountry) args.p_origin_country = filters.originCountry;
  if (filters.language) args.p_language = filters.language;
  if (filters.yearMin) args.p_year_min = filters.yearMin;
  if (filters.yearMax) args.p_year_max = filters.yearMax;
  if (filters.tag) args.p_tag = filters.tag;
  if (filters.collection) args.p_collection = filters.collection;
  if (typeof filters.isOriginal === "boolean") args.p_is_original = filters.isOriginal;
  if (maxAge !== null) args.p_max_age = maxAge;

  const { data, error } = await supabase.rpc("list_catalog", args).select(TITLE_CARD_COLUMNS);
  if (error) {
    console.error("[catalog] list_catalog", error.message);
    return [];
  }
  return (data ?? []).map(toTitleCard);
}

export const getGenres = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("genres").select("id, slug, labels").order("position");
  return (data ?? []).map((g) => ({
    id: g.id,
    slug: g.slug,
    labels: g.labels as Record<string, string>,
  }));
});

export function genreLabel(labels: Record<string, string>, locale: string) {
  return labels[locale] ?? labels.fr ?? "";
}

async function fetchTitlesByIds(ids: string[]): Promise<Map<string, TitleCardData>> {
  if (ids.length === 0) return new Map();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("titles").select(TITLE_CARD_COLUMNS).in("id", ids);
  return new Map((data ?? []).map((row) => [row.id, toTitleCard(row)]));
}

export async function getContinueWatching(viewer: Viewer, limit = 20): Promise<TitleCardData[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("continue_watching", {
    p_viewer_profile: viewer.activeProfile.id,
    p_limit: limit,
  });
  if (error || !data?.length) return [];
  const titles = await fetchTitlesByIds(data.map((row) => row.title_id));
  const episodeIds = data.map((row) => row.episode_id).filter((id): id is string => Boolean(id));
  const episodes = new Map<string, { label: string }>();
  if (episodeIds.length) {
    const { data: rows } = await supabase
      .from("episodes")
      .select("id, episode_number, seasons(season_number)")
      .in("id", episodeIds);
    for (const row of rows ?? []) {
      const season = (row.seasons as { season_number: number } | null)?.season_number ?? 1;
      episodes.set(row.id, { label: `S${season} · É${row.episode_number}` });
    }
  }
  const result: TitleCardData[] = [];
  for (const row of data) {
    const title = titles.get(row.title_id);
    if (!title) continue;
    result.push({
      ...title,
      progress: {
        positionSeconds: row.position_seconds ?? 0,
        durationSeconds: row.duration_seconds ?? null,
        episodeId: row.episode_id ?? null,
        episodeLabel: row.episode_id ? (episodes.get(row.episode_id)?.label ?? null) : null,
        isNextEpisode: row.is_next_episode,
      },
    });
  }
  return result;
}

export async function getWatchlist(viewer: Viewer, limit = 50): Promise<TitleCardData[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("watchlist_items")
    .select(`created_at, titles(${TITLE_CARD_COLUMNS})`)
    .eq("viewer_profile_id", viewer.activeProfile.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? [])
    .map((row) => row.titles)
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map(toTitleCard)
    .filter(
      (t) =>
        viewer.activeProfile.maxAgeRating === null ||
        t.ageRating <= viewer.activeProfile.maxAgeRating,
    );
}

export async function getWatchlistIds(viewer: Viewer | null): Promise<Set<string>> {
  if (!viewer) return new Set();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("watchlist_items")
    .select("title_id")
    .eq("viewer_profile_id", viewer.activeProfile.id);
  return new Set((data ?? []).map((row) => row.title_id));
}

/** Suggestions personnalisées (moteur déterministe, voir src/server/recommendations). */
export async function getRecommendations(viewer: Viewer, limit = 20): Promise<TitleCardData[]> {
  const supabase = await createSupabaseServerClient();
  const profileId = viewer.activeProfile.id;

  const [history, list, candidatesRaw] = await Promise.all([
    supabase
      .from("watch_progress")
      .select("title_id, position_seconds, duration_seconds, completed, updated_at")
      .eq("viewer_profile_id", profileId)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("watchlist_items")
      .select("title_id, created_at")
      .eq("viewer_profile_id", profileId)
      .limit(100),
    listCatalog({ sort: "popular", limit: 100 }),
  ]);

  const historyRows = history.data ?? [];
  const listRows = list.data ?? [];
  const signalTitleIds = [
    ...new Set([...historyRows.map((r) => r.title_id), ...listRows.map((r) => r.title_id)]),
  ];
  const allIds = [...new Set([...signalTitleIds, ...candidatesRaw.map((c) => c.id)])];

  const genreMap = new Map<string, string[]>();
  const kindMap = new Map<string, string>(candidatesRaw.map((c) => [c.id, c.kind]));
  if (allIds.length) {
    const [{ data: genreRows }, { data: kindRows }] = await Promise.all([
      supabase.from("title_genres").select("title_id, genres(slug)").in("title_id", allIds),
      supabase
        .from("titles")
        .select("id, kind")
        .in(
          "id",
          signalTitleIds.length ? signalTitleIds : ["00000000-0000-0000-0000-000000000000"],
        ),
    ]);
    for (const row of genreRows ?? []) {
      const slug = (row.genres as { slug: string } | null)?.slug;
      if (!slug) continue;
      genreMap.set(row.title_id, [...(genreMap.get(row.title_id) ?? []), slug]);
    }
    for (const row of kindRows ?? []) kindMap.set(row.id, row.kind);
  }

  const now = Date.now();
  const signals: ViewingSignal[] = [
    ...historyRows.map((row) => ({
      titleId: row.title_id,
      genres: genreMap.get(row.title_id) ?? [],
      kind: kindMap.get(row.title_id) ?? "film",
      engagement: row.completed
        ? 1
        : row.duration_seconds
          ? row.position_seconds / row.duration_seconds
          : 0.2,
      ageDays: (now - new Date(row.updated_at).getTime()) / 86_400_000,
      source: "history" as const,
    })),
    ...listRows.map((row) => ({
      titleId: row.title_id,
      genres: genreMap.get(row.title_id) ?? [],
      kind: kindMap.get(row.title_id) ?? "film",
      engagement: 0,
      ageDays: (now - new Date(row.created_at).getTime()) / 86_400_000,
      source: "watchlist" as const,
    })),
  ];

  const candidates: Candidate[] = candidatesRaw.map((c, index) => ({
    titleId: c.id,
    genres: genreMap.get(c.id) ?? [],
    kind: c.kind,
    // list_catalog est déjà trié par popularité : on en dérive un score décroissant.
    popularity: candidatesRaw.length - index,
    publishedAt: c.publishedAt,
  }));

  const exclude = new Set<string>([
    ...historyRows.filter((r) => r.completed).map((r) => r.title_id),
    ...listRows.map((r) => r.title_id),
  ]);
  const recommendations = viewer.profile.personalizedRecommendations
    ? defaultRecommendationEngine.recommend({ signals, candidates, exclude, limit })
    : defaultRecommendationEngine.recommend({ signals: [], candidates, exclude, limit });

  const byId = new Map(candidatesRaw.map((c) => [c.id, c]));
  const result: TitleCardData[] = [];
  for (const rec of recommendations) {
    const card = byId.get(rec.titleId);
    if (card)
      result.push({
        ...card,
        reason: rec.reason.type === "genre" ? rec.reason.genre : rec.reason.type,
      });
  }
  return result;
}

function withinWindow(startsAt: string | null, endsAt: string | null, now = Date.now()) {
  return (!startsAt || Date.parse(startsAt) <= now) && (!endsAt || Date.parse(endsAt) > now);
}

function audienceAllowed(audience: string, viewer: Viewer | null) {
  switch (audience) {
    case "visitors":
      return viewer === null;
    case "members":
      return viewer !== null;
    case "subscribers":
      return viewer !== null && tierAtLeast(viewer.entitlements.tier, "founder");
    default:
      return true;
  }
}

function sectionHref(source: string, config: Record<string, unknown>): string | null {
  const params = new URLSearchParams();
  if (source === "coming_soon") return "/prochainement";
  if (source === "watchlist") return "/compte/ma-liste";
  if (source === "new") params.set("tri", "nouveautes");
  if (typeof config.kind === "string") params.set("type", config.kind);
  if (typeof config.genre === "string") params.set("genre", config.genre);
  if (typeof config.country === "string") params.set("pays", config.country);
  if (typeof config.tag === "string") params.set("tag", config.tag);
  if (typeof config.collection === "string") params.set("collection", config.collection);
  if (source === "continue_watching" || source === "recommended") return null;
  const query = params.toString();
  return `/catalogue${query ? `?${query}` : ""}`;
}

/** Sections de l'accueil, entièrement pilotées par la table home_sections. */
export async function getHomeSections(): Promise<HomeSectionData[]> {
  const { viewer } = await getCatalogContext();
  const supabase = await createSupabaseServerClient();
  const { data: sections, error } = await supabase
    .from("home_sections")
    .select(
      "id, slug, title, title_i18n, source, config, layout, max_items, audience, starts_at, ends_at",
    )
    .eq("is_active", true)
    .order("position");
  if (error) {
    console.error("[catalog] home_sections", error.message);
    return [];
  }

  // La RLS applique déjà la fenêtre de diffusion aux visiteurs ; le filtre est répété
  // ici pour que l'équipe éditoriale voie l'accueil tel que le public le voit.
  const visible = (sections ?? []).filter(
    (s) => audienceAllowed(s.audience, viewer) && withinWindow(s.starts_at, s.ends_at),
  );
  const results = await Promise.all(
    visible.map(async (section): Promise<HomeSectionData | null> => {
      const config = (section.config ?? {}) as Record<string, unknown>;
      const limit = section.max_items;
      let items: TitleCardData[] = [];
      switch (section.source) {
        case "continue_watching":
          items = viewer ? await getContinueWatching(viewer, limit) : [];
          break;
        case "watchlist":
          items = viewer ? await getWatchlist(viewer, limit) : [];
          break;
        case "recommended":
          items = viewer ? await getRecommendations(viewer, limit) : [];
          break;
        case "new":
          items = await listCatalog({
            sort: "new",
            limit,
            kind: config.kind as TitleKind | undefined,
          });
          break;
        case "popular":
          items = await listCatalog({
            sort: "popular",
            limit,
            kind: config.kind as TitleKind | undefined,
          });
          break;
        case "coming_soon":
          items = await listCatalog({ status: "announced", sort: "new", limit });
          break;
        case "collection":
          items = await listCatalog({
            collection: typeof config.collection === "string" ? config.collection : undefined,
            sort: "collection",
            limit,
          });
          break;
        case "filter":
          items = await listCatalog({
            kind: config.kind as TitleKind | undefined,
            genre: typeof config.genre === "string" ? config.genre : undefined,
            originCountry: typeof config.country === "string" ? config.country : undefined,
            language: typeof config.language === "string" ? config.language : undefined,
            tag: typeof config.tag === "string" ? config.tag : undefined,
            isOriginal: typeof config.original === "boolean" ? config.original : undefined,
            sort: (config.sort as CatalogFilters["sort"]) ?? "popular",
            limit,
          });
          break;
      }
      if (items.length === 0) return null;
      return {
        id: section.id,
        slug: section.slug,
        title: section.title,
        layout: section.layout as HomeSectionLayout,
        source: section.source,
        href: sectionHref(section.source, config),
        items,
      };
    }),
  );
  return results.filter((s): s is HomeSectionData => s !== null);
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  const { viewer } = await getCatalogContext();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("home_banners")
    .select(
      `id, headline, subheadline, cta_label, cta_href, image_path, audience, starts_at, ends_at, titles(${TITLE_CARD_COLUMNS})`,
    )
    .eq("is_active", true)
    .order("position")
    .limit(12);

  const slides: HeroSlide[] = (data ?? [])
    .filter((b) => audienceAllowed(b.audience, viewer) && withinWindow(b.starts_at, b.ends_at))
    .slice(0, 6)
    .map((b) => {
      const title = b.titles ? toTitleCard(b.titles) : null;
      return {
        id: b.id,
        headline: b.headline,
        subheadline: b.subheadline,
        ctaLabel: b.cta_label,
        ctaHref: b.cta_href,
        imageUrl: resolveImageUrl(b.image_path) ?? title?.backdropUrl ?? null,
        title,
      };
    });

  if (slides.length > 0) return slides;

  // À défaut de bannière éditoriale : œuvres mises en avant, puis les plus populaires.
  const featured = await listCatalog({ sort: "popular", limit: 12 });
  return featured
    .filter((t) => t.backdropUrl)
    .slice(0, 4)
    .map((title) => ({
      id: `title-${title.id}`,
      headline: title.title,
      subheadline: title.synopsisShort,
      ctaLabel: null,
      ctaHref: null,
      imageUrl: title.backdropUrl,
      title,
    }));
}

export async function searchCatalog(query: string, limit = 20): Promise<TitleCardData[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const { country, maxAge } = await getCatalogContext();
  const supabase = await createSupabaseServerClient();
  const args: Database["public"]["Functions"]["search_titles"]["Args"] = {
    p_query: trimmed.slice(0, 200),
    p_country: country,
    p_limit: limit,
  };
  if (maxAge !== null) args.p_max_age = maxAge;
  const { data, error } = await supabase.rpc("search_titles", args);
  if (error) {
    console.error("[catalog] search_titles", error.message);
    return [];
  }
  const ids = (data ?? []).map((row) => row.id);
  const titles = await fetchTitlesByIds(ids);
  return ids.map((id) => titles.get(id)).filter((t): t is TitleCardData => Boolean(t));
}

export async function getTitleDetail(slug: string): Promise<TitleDetail | null> {
  const { viewer, country } = await getCatalogContext();
  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("titles")
    .select(
      "*, title_genres(genres(slug, labels)), credits(id, role, character_name, position, people(id, slug, full_name))",
    )
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (!row) return null;

  const isVisible =
    row.status === "announced" || (row.status === "published" && row.published_at !== null);
  if (!isVisible && !viewer?.staff.permissions.includes("catalog.read_all")) return null;

  const [availableResult, seasonsResult, progressResult] = await Promise.all([
    supabase.rpc("title_is_available", { p_title: row.id, p_country: country }),
    row.structure === "episodic"
      ? supabase
          .from("seasons")
          .select(
            "id, season_number, name, episodes(id, episode_number, name, synopsis, runtime_minutes, still_path, status, published_at, deleted_at, main_asset_id)",
          )
          .eq("title_id", row.id)
          .order("season_number")
      : Promise.resolve({ data: [] as never[] }),
    viewer
      ? supabase
          .from("watch_progress")
          .select("episode_id, position_seconds, duration_seconds, completed")
          .eq("viewer_profile_id", viewer.activeProfile.id)
          .eq("title_id", row.id)
      : Promise.resolve({
          data: [] as {
            episode_id: string | null;
            position_seconds: number;
            duration_seconds: number | null;
            completed: boolean;
          }[],
        }),
  ]);

  const progressByEpisode = new Map(
    (progressResult.data ?? []).map((p) => [p.episode_id ?? "title", p]),
  );
  const now = Date.now();
  const seasons: SeasonData[] = (seasonsResult.data ?? [])
    .map((season) => ({
      id: season.id,
      number: season.season_number,
      name: season.name,
      episodes: (season.episodes ?? [])
        .filter(
          (e) =>
            e.deleted_at === null &&
            e.status === "published" &&
            e.published_at !== null &&
            new Date(e.published_at).getTime() <= now,
        )
        .sort((a, b) => a.episode_number - b.episode_number)
        .map((e) => {
          const p = progressByEpisode.get(e.id);
          return {
            id: e.id,
            number: e.episode_number,
            name: e.name,
            synopsis: e.synopsis,
            runtimeMinutes: e.runtime_minutes,
            stillUrl: resolveImageUrl(e.still_path),
            progress: p
              ? {
                  positionSeconds: p.position_seconds,
                  durationSeconds: p.duration_seconds,
                  completed: p.completed,
                }
              : null,
          };
        }),
    }))
    .filter((s) => s.episodes.length > 0);

  // Langues de sous-titres : lecture via le rôle serveur (table réservée à l'équipe).
  const assetIds = [
    row.main_asset_id,
    ...((seasonsResult.data ?? []) as { episodes: { main_asset_id: string | null }[] }[]).flatMap(
      (s) => s.episodes.map((e) => e.main_asset_id),
    ),
  ].filter((id): id is string => Boolean(id));
  let subtitleLanguages: string[] = [];
  if (assetIds.length) {
    const { data: subs } = await createSupabaseAdminClient()
      .from("subtitles")
      .select("language")
      .in("media_asset_id", assetIds);
    subtitleLanguages = [...new Set((subs ?? []).map((s) => s.language))].sort();
  }

  const titleProgress = progressByEpisode.get("title");
  const card = toTitleCard(row);
  if (titleProgress && !titleProgress.completed) {
    card.progress = {
      positionSeconds: titleProgress.position_seconds,
      durationSeconds: titleProgress.duration_seconds,
      episodeId: null,
      episodeLabel: null,
      isNextEpisode: false,
    };
  }

  const takenDown = row.takedown_at !== null;
  const availability: TitleDetail["availability"] = takenDown
    ? "taken_down"
    : row.status === "announced"
      ? "coming_soon"
      : availableResult.data
        ? "available"
        : "unavailable_territory";

  const credits = (row.credits ?? [])
    .map((c) => ({
      personId: c.people?.id ?? "",
      name: c.people?.full_name ?? "",
      slug: c.people?.slug ?? "",
      role: c.role,
      character: c.character_name,
      position: c.position,
    }))
    .filter((c) => c.personId)
    .sort((a, b) => a.position - b.position)
    .map(({ position: _position, ...rest }) => rest);

  return {
    ...card,
    originalTitle: row.original_title,
    alternativeTitles: row.alternative_titles,
    tagline: row.tagline,
    descriptionLong: row.description_long,
    countries: row.countries,
    originalLanguages: row.original_languages,
    audioLanguages: row.audio_languages,
    contentWarnings: row.content_warnings,
    tags: row.tags,
    genres: (row.title_genres ?? [])
      .map((tg) => tg.genres)
      .filter((g) => g !== null)
      .map((g) => ({ slug: g.slug, label: genreLabel(g.labels as Record<string, string>, "fr") })),
    credits,
    seasons,
    hasTrailer: row.trailer_asset_id !== null,
    subtitleLanguages,
    availability,
    takenDown,
  };
}

/** Œuvres similaires : mêmes genres, hors œuvre courante. */
export async function getSimilarTitles(detail: TitleDetail, limit = 12): Promise<TitleCardData[]> {
  const genre = detail.genres[0]?.slug;
  const items = await listCatalog({ genre, sort: "popular", limit: limit + 1 });
  return items.filter((t) => t.id !== detail.id).slice(0, limit);
}
