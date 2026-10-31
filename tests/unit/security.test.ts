import { describe, expect, it } from "vitest";

import { parseConsent } from "@/components/legal/consent";
import { safeNextPath } from "@/lib/navigation";
import { buildContentSecurityPolicy } from "@/lib/security/csp";
import { generateHqKey, hashHqKey } from "@/server/hq/auth";
import { resolveCountry } from "@/server/http";

describe("redirections internes (protection contre les redirections ouvertes)", () => {
  it.each([
    ["/compte", "/compte"],
    ["/titre/abc?x=1#y", "/titre/abc?x=1#y"],
    ["//evil.example/x", "/"],
    ["/\\evil.example", "/"],
    ["https://evil.example", "/"],
    ["javascript:alert(1)", "/"],
    ["", "/"],
    [42, "/"],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
  it("utilise la valeur de repli fournie", () => {
    expect(safeNextPath("https://x.y", "/connexion")).toBe("/connexion");
  });
});

describe("pays de la requête", () => {
  it("accepte un code ISO alpha-2 et normalise la casse", () => {
    expect(resolveCountry("dz")).toBe("DZ");
    expect(resolveCountry(" FR ")).toBe("FR");
  });
  it("retombe sur XX (inconnu) pour une valeur absente ou invalide", () => {
    expect(resolveCountry(null)).toBe("XX");
    expect(resolveCountry("FRA")).toBe("XX");
    expect(resolveCountry("XX")).toBe("XX");
    expect(resolveCountry("1A")).toBe("XX");
  });
  it("applique la valeur forcée de développement en priorité", () => {
    expect(resolveCountry("US", "fr")).toBe("FR");
  });
});

describe("politique de sécurité du contenu", () => {
  const prod = buildContentSecurityPolicy({
    nonce: "abc",
    isDev: false,
    supabaseUrl: "https://projet.supabase.co",
    upgradeInsecureRequests: true,
  });
  const dev = buildContentSecurityPolicy({
    nonce: "abc",
    isDev: true,
    supabaseUrl: "http://127.0.0.1:54321",
  });
  it("utilise un nonce et strict-dynamic, sans unsafe-eval en production", () => {
    expect(prod).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(prod).not.toContain("unsafe-eval");
    expect(dev).toContain("'unsafe-eval'");
  });
  it("interdit l'intégration dans un cadre et les objets", () => {
    expect(prod).toContain("frame-ancestors 'none'");
    expect(prod).toContain("object-src 'none'");
    expect(prod).toContain("upgrade-insecure-requests");
    expect(dev).not.toContain("upgrade-insecure-requests");
    const localProduction = buildContentSecurityPolicy({
      nonce: "abc",
      isDev: false,
      supabaseUrl: "http://127.0.0.1:54321",
      upgradeInsecureRequests: false,
    });
    expect(localProduction).not.toContain("upgrade-insecure-requests");
  });
  it("autorise uniquement les origines nécessaires (Supabase, Stream, Stripe)", () => {
    expect(prod).toContain("https://projet.supabase.co");
    expect(prod).toContain("https://*.cloudflarestream.com");
    expect(prod).toMatch(/form-action [^;]*https:\/\/checkout\.stripe\.com/);
  });
});

describe("consentement aux cookies", () => {
  const encode = (value: unknown) => encodeURIComponent(JSON.stringify(value));
  it("lit un consentement valide de la version en vigueur", () => {
    expect(parseConsent(encode({ analytics: true, ads: false, version: "2026-10" }))).toEqual({
      necessary: true,
      analytics: true,
      ads: false,
      version: "2026-10",
    });
  });
  it("ignore une version périmée ou un cookie corrompu", () => {
    expect(parseConsent(encode({ analytics: true, ads: true, version: "2020-01" }))).toBeNull();
    expect(parseConsent("%%%")).toBeNull();
    expect(parseConsent(undefined)).toBeNull();
  });
});

describe("clés Tamurt HQ", () => {
  it("génère une clé préfixée dont seule l'empreinte est conservée", () => {
    const { secret, prefix, hash } = generateHqKey();
    expect(secret).toMatch(/^thq_[A-Za-z0-9_-]{30,}$/);
    expect(prefix).toBe(secret.slice(0, 10));
    expect(hash).toBe(hashHqKey(secret));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(secret);
    expect(generateHqKey().secret).not.toBe(secret);
  });
});
