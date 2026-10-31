import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { compareLocale, placeholders, type Messages } from "@/i18n/check";
import { directionFor, localeStatus, locales, negotiateLocale } from "@/i18n/config";
import { mergeMessages } from "@/i18n/merge";

const load = (locale: string) =>
  JSON.parse(
    readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8"),
  ) as Messages;

describe("traductions", () => {
  const reference = load("fr");
  it.each(locales.filter((l) => l !== "fr"))(
    "%s : clés connues, ICU valide, variables conservées",
    (locale) => {
      const report = compareLocale(reference, load(locale), {
        partial: localeStatus[locale] === "partial-draft",
      });
      expect(report).toEqual({ missing: [], unknown: [], invalid: [], placeholderMismatch: [] });
    },
  );
  it("détecte une variable perdue", () => {
    expect(placeholders("Bonjour {name}")).toEqual(["{name}"]);
    const report = compareLocale({ a: "Bonjour {name}" }, { a: "Hello" });
    expect(report.placeholderMismatch).toEqual(["a"]);
  });
  it("seul le français est la langue de référence ; les autres restent des brouillons", () => {
    expect(localeStatus.fr).toBe("reference");
    for (const locale of locales.filter((l) => l !== "fr"))
      expect(localeStatus[locale]).not.toBe("reference");
  });
});

describe("langue et direction", () => {
  it("n'adopte automatiquement que la langue de référence", () => {
    expect(negotiateLocale("ar-DZ,ar;q=0.9")).toBe("fr");
    expect(negotiateLocale("fr-FR,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(negotiateLocale(null)).toBe("fr");
  });
  it("utilise la direction RTL pour l'arabe", () => {
    expect(directionFor("ar")).toBe("rtl");
    expect(directionFor("kab")).toBe("ltr");
  });
  it("complète une traduction partielle par le français", () => {
    const merged = mergeMessages(
      { a: { b: "fr-b", c: "fr-c" }, d: "fr-d" },
      { a: { b: "kab-b", c: "" } },
    );
    expect(merged).toEqual({ a: { b: "kab-b", c: "fr-c" }, d: "fr-d" });
  });
});
