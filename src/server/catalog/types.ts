import type { Database } from "@/lib/supabase/database.types";

export type TitleKind = Database["public"]["Enums"]["title_kind"];
export type PublicationStatus = Database["public"]["Enums"]["publication_status"];
export type PlanTier = Database["public"]["Enums"]["plan_tier"];
export type TitleRow = Database["public"]["Tables"]["titles"]["Row"];

export type TitleCardData = {
  id: string;
  slug: string;
  title: string;
  kind: TitleKind;
  structure: "single" | "episodic";
  releaseYear: number | null;
  ageRating: number;
  minTier: PlanTier;
  status: PublicationStatus;
  isOriginal: boolean;
  isDemo: boolean;
  posterUrl: string | null;
  backdropUrl: string | null;
  synopsisShort: string | null;
  runtimeMinutes: number | null;
  publishedAt: string | null;
  progress?: {
    positionSeconds: number;
    durationSeconds: number | null;
    episodeId: string | null;
    episodeLabel: string | null;
    isNextEpisode: boolean;
  };
  reason?: string | null;
};

export type HomeSectionLayout = "poster" | "landscape" | "top10" | "large";

export type HomeSectionData = {
  id: string;
  slug: string;
  title: string;
  layout: HomeSectionLayout;
  source: Database["public"]["Enums"]["home_section_source"];
  href: string | null;
  items: TitleCardData[];
};

export type HeroSlide = {
  id: string;
  headline: string;
  subheadline: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
  title: TitleCardData | null;
};

export type EpisodeData = {
  id: string;
  number: number;
  name: string;
  synopsis: string | null;
  runtimeMinutes: number | null;
  stillUrl: string | null;
  progress: { positionSeconds: number; durationSeconds: number | null; completed: boolean } | null;
};

export type SeasonData = {
  id: string;
  number: number;
  name: string | null;
  episodes: EpisodeData[];
};

export type CreditData = {
  personId: string;
  name: string;
  slug: string;
  role: string;
  character: string | null;
};

export type TitleDetail = TitleCardData & {
  originalTitle: string | null;
  alternativeTitles: string[];
  tagline: string | null;
  descriptionLong: string | null;
  countries: string[];
  originalLanguages: string[];
  audioLanguages: string[];
  contentWarnings: string[];
  tags: string[];
  genres: { slug: string; label: string }[];
  credits: CreditData[];
  seasons: SeasonData[];
  hasTrailer: boolean;
  subtitleLanguages: string[];
  availability: "available" | "coming_soon" | "unavailable_territory" | "taken_down";
  takenDown: boolean;
};

/** Colonnes nécessaires aux cartes (évite de transférer les textes longs). */
export const TITLE_CARD_COLUMNS =
  "id, slug, title, kind, structure, release_year, age_rating, min_tier, status, is_original, is_demo, poster_path, backdrop_path, synopsis_short, runtime_minutes, published_at" as const;
