import { describe, expect, it } from "vitest";

import {
  GenreAffinityEngine,
  genreAffinity,
  type Candidate,
  type ViewingSignal,
} from "@/server/recommendations/engine";

const signals: ViewingSignal[] = [
  { titleId: "a", genres: ["drame"], kind: "film", engagement: 1, ageDays: 1, source: "history" },
  {
    titleId: "b",
    genres: ["drame", "histoire"],
    kind: "film",
    engagement: 0.8,
    ageDays: 3,
    source: "history",
  },
  {
    titleId: "c",
    genres: ["comedie"],
    kind: "series",
    engagement: 0.1,
    ageDays: 200,
    source: "history",
  },
];
const now = new Date("2026-10-31T12:00:00Z");
const candidates: Candidate[] = [
  {
    titleId: "drame-1",
    genres: ["drame"],
    kind: "film",
    popularity: 10,
    publishedAt: "2026-01-01T00:00:00Z",
  },
  {
    titleId: "comedie-1",
    genres: ["comedie"],
    kind: "series",
    popularity: 100,
    publishedAt: "2026-01-01T00:00:00Z",
  },
  {
    titleId: "nouveau",
    genres: ["documentaire"],
    kind: "documentary",
    popularity: 5,
    publishedAt: "2026-10-25T00:00:00Z",
  },
  { titleId: "a", genres: ["drame"], kind: "film", popularity: 50, publishedAt: null },
];

describe("moteur de recommandation déterministe", () => {
  it("normalise l'affinité au genre préféré", () => {
    const affinity = genreAffinity(signals);
    expect(affinity.get("drame")).toBe(1);
    expect(affinity.get("comedie")!).toBeLessThan(0.2);
  });

  it("privilégie les genres regardés, exclut les œuvres déjà vues et explique son choix", () => {
    const engine = new GenreAffinityEngine();
    const result = engine.recommend({
      signals,
      candidates,
      exclude: new Set(["a"]),
      limit: 10,
      now,
    });
    expect(result.map((r) => r.titleId)).not.toContain("a");
    expect(result[0]!.titleId).toBe("drame-1");
    expect(result[0]!.reason).toEqual({ type: "genre", genre: "drame" });
    expect(result.find((r) => r.titleId === "nouveau")!.reason).toEqual({ type: "new" });
  });

  it("produit un résultat stable pour des entrées identiques", () => {
    const engine = new GenreAffinityEngine();
    const first = engine.recommend({ signals, candidates, exclude: new Set(), limit: 3, now });
    const second = engine.recommend({
      signals,
      candidates: [...candidates].reverse(),
      exclude: new Set(),
      limit: 3,
      now,
    });
    expect(second).toEqual(first);
  });

  it("retombe sur la popularité sans historique", () => {
    const engine = new GenreAffinityEngine();
    const result = engine.recommend({ signals: [], candidates, exclude: new Set(), limit: 2, now });
    expect(result[0]!.titleId).toBe("comedie-1");
    expect(result[0]!.reason.type).toBe("popular");
  });
});
