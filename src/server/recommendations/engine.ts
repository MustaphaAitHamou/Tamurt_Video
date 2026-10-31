/**
 * Recommandations déterministes et explicables.
 *
 * Signaux : genres des œuvres regardées (pondérés par l'implication), genres
 * de la liste, popularité et nouveauté. L'interface permet de brancher plus
 * tard un moteur avancé (filtrage collaboratif, service externe) sans changer
 * les appelants.
 */

export type ViewingSignal = {
  titleId: string;
  genres: string[];
  kind: string;
  /** 0 à 1 : part de l'œuvre regardée (1 = terminée). */
  engagement: number;
  /** Ancienneté du signal en jours. */
  ageDays: number;
  source: "history" | "watchlist";
};

export type Candidate = {
  titleId: string;
  genres: string[];
  kind: string;
  popularity: number;
  publishedAt: string | null;
};

export type Recommendation = {
  titleId: string;
  score: number;
  /** Explication lisible : genre déterminant ou popularité. */
  reason: { type: "genre"; genre: string } | { type: "popular" } | { type: "new" };
};

export interface RecommendationEngine {
  readonly name: string;
  recommend(input: {
    signals: ViewingSignal[];
    candidates: Candidate[];
    exclude: Set<string>;
    limit: number;
    now?: Date;
  }): Recommendation[];
}

const HALF_LIFE_DAYS = 45;
const NEW_RELEASE_DAYS = 30;

function decay(ageDays: number) {
  return Math.pow(0.5, Math.max(ageDays, 0) / HALF_LIFE_DAYS);
}

/** Affinité par genre, normalisée à 1 pour le genre préféré. */
export function genreAffinity(signals: ViewingSignal[]): Map<string, number> {
  const weights = new Map<string, number>();
  for (const signal of signals) {
    const base =
      signal.source === "watchlist" ? 0.6 : 0.4 + 0.6 * Math.min(Math.max(signal.engagement, 0), 1);
    const weight = base * decay(signal.ageDays);
    for (const genre of signal.genres) {
      weights.set(genre, (weights.get(genre) ?? 0) + weight);
    }
  }
  const max = Math.max(0, ...weights.values());
  if (max > 0) {
    for (const [genre, value] of weights) weights.set(genre, value / max);
  }
  return weights;
}

export class GenreAffinityEngine implements RecommendationEngine {
  readonly name = "genre-affinity-v1";

  recommend({
    signals,
    candidates,
    exclude,
    limit,
    now = new Date(),
  }: {
    signals: ViewingSignal[];
    candidates: Candidate[];
    exclude: Set<string>;
    limit: number;
    now?: Date;
  }): Recommendation[] {
    const affinity = genreAffinity(signals);
    const kindWeights = new Map<string, number>();
    for (const signal of signals) {
      kindWeights.set(signal.kind, (kindWeights.get(signal.kind) ?? 0) + decay(signal.ageDays));
    }
    const maxKind = Math.max(0, ...kindWeights.values());
    const maxPopularity = Math.max(1, ...candidates.map((c) => c.popularity));

    const scored: Recommendation[] = [];
    for (const candidate of candidates) {
      if (exclude.has(candidate.titleId)) continue;

      let genreScore = 0;
      let bestGenre: string | null = null;
      let bestGenreValue = 0;
      for (const genre of candidate.genres) {
        const value = affinity.get(genre) ?? 0;
        genreScore += value;
        if (value > bestGenreValue) {
          bestGenreValue = value;
          bestGenre = genre;
        }
      }
      if (candidate.genres.length > 0) genreScore /= Math.sqrt(candidate.genres.length);

      const popularity = candidate.popularity / maxPopularity;
      const ageDays = candidate.publishedAt
        ? (now.getTime() - new Date(candidate.publishedAt).getTime()) / 86_400_000
        : Infinity;
      const isNew = ageDays >= 0 && ageDays <= NEW_RELEASE_DAYS;
      const kindScore = maxKind > 0 ? (kindWeights.get(candidate.kind) ?? 0) / maxKind : 0;

      const score = genreScore * 1.0 + kindScore * 0.25 + popularity * 0.3 + (isNew ? 0.2 : 0);
      const reason: Recommendation["reason"] =
        bestGenre && bestGenreValue >= 0.3
          ? { type: "genre", genre: bestGenre }
          : isNew
            ? { type: "new" }
            : { type: "popular" };
      scored.push({ titleId: candidate.titleId, score: Math.round(score * 1e6) / 1e6, reason });
    }

    // Tri stable : score décroissant puis identifiant (résultat déterministe).
    scored.sort((a, b) => b.score - a.score || a.titleId.localeCompare(b.titleId));
    return scored.slice(0, Math.max(0, limit));
  }
}

export const defaultRecommendationEngine: RecommendationEngine = new GenreAffinityEngine();
