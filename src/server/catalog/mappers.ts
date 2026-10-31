import { resolveImageUrl } from "@/lib/images";
import type { TitleCardData, TitleRow } from "@/server/catalog/types";

type CardRow = Pick<
  TitleRow,
  | "id"
  | "slug"
  | "title"
  | "kind"
  | "structure"
  | "release_year"
  | "age_rating"
  | "min_tier"
  | "status"
  | "is_original"
  | "is_demo"
  | "poster_path"
  | "backdrop_path"
  | "synopsis_short"
  | "runtime_minutes"
  | "published_at"
>;

export function toTitleCard(row: CardRow): TitleCardData {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    kind: row.kind,
    structure: row.structure,
    releaseYear: row.release_year,
    ageRating: row.age_rating,
    minTier: row.min_tier,
    status: row.status,
    isOriginal: row.is_original,
    isDemo: row.is_demo,
    posterUrl: resolveImageUrl(row.poster_path),
    backdropUrl: resolveImageUrl(row.backdrop_path),
    synopsisShort: row.synopsis_short,
    runtimeMinutes: row.runtime_minutes,
    publishedAt: row.published_at,
  };
}
