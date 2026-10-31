import { describe, expect, it } from "vitest";

import {
  ageRatingLabel,
  daysUntil,
  formatIndicativeDzd,
  formatPrice,
  parisInputToIso,
  slugify,
  toParisInputValue,
} from "@/lib/format";
import { permissionsForRoles, ROLE_PERMISSIONS, tierAtLeast } from "@/lib/permissions";

describe("formatage", () => {
  it("affiche les prix en euros, avec centimes seulement si nécessaire", () => {
    expect(formatPrice(200)).toMatch(/^2\s€$/);
    expect(formatPrice(1050)).toMatch(/^10,50\s€$/);
  });
  it("donne une conversion indicative en dinars arrondie à la dizaine", () => {
    expect(formatIndicativeDzd(200, 151.3)).toMatch(/^≈ 300 DA$/);
    expect(formatIndicativeDzd(1000, 0)).toBeNull();
  });
  it("convertit l'heure de Paris en UTC (été/hiver) et inversement", () => {
    expect(parisInputToIso("2026-07-14T21:00")).toBe("2026-07-14T19:00:00.000Z");
    expect(parisInputToIso("2026-12-25T08:30")).toBe("2026-12-25T07:30:00.000Z");
    expect(toParisInputValue("2026-12-25T07:30:00.000Z")).toBe("2026-12-25T08:30");
    expect(parisInputToIso("25/12/2026")).toBeNull();
  });
  it("produit des slugs ASCII stables", () => {
    expect(slugify("Ombres sur la Casbah — Épisode 2")).toBe("ombres-sur-la-casbah-episode-2");
  });
  it("calcule les échéances et les classifications", () => {
    expect(daysUntil("2026-11-10T00:00:00Z", new Date("2026-11-01T00:00:00Z"))).toBe(9);
    expect(ageRatingLabel(12)).toBe("-12");
  });
});

describe("rôles et formules", () => {
  it("ordonne les formules", () => {
    expect(tierAtLeast("premium", "standard")).toBe(true);
    expect(tierAtLeast("founder", "standard")).toBe(false);
    expect(tierAtLeast("free", "free")).toBe(true);
  });
  it("sépare les habilitations par rôle", () => {
    const editor = permissionsForRoles(["catalog_editor"]);
    expect(editor.has("catalog.publish")).toBe(true);
    expect(editor.has("rights.write")).toBe(false);
    expect(editor.has("requests.confirm_acquisition")).toBe(false);
    const rights = permissionsForRoles(["rights_manager"]);
    expect(rights.has("takedown.execute")).toBe(true);
    expect(rights.has("catalog.publish")).toBe(false);
    expect(rights.has("billing.manage")).toBe(false);
  });
  it("réserve les réglages et la facturation à l'administrateur", () => {
    for (const permission of [
      "settings.write",
      "billing.manage",
      "users.manage",
      "hq.manage",
    ] as const) {
      expect(ROLE_PERMISSIONS.catalog_editor as readonly string[]).not.toContain(permission);
      expect(ROLE_PERMISSIONS.rights_manager as readonly string[]).not.toContain(permission);
      expect(ROLE_PERMISSIONS.admin as readonly string[]).toContain(permission);
    }
  });
});
