export const locales = ["fr", "en", "ar", "kab"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";
export const localeCookieName = "NEXT_LOCALE";

export const rtlLocales: readonly Locale[] = ["ar"];

/**
 * Statut des traductions. Seul le français est la langue de référence ;
 * les autres fichiers sont des brouillons à faire valider par des
 * traducteurs natifs avant toute communication publique.
 */
export const localeStatus: Record<Locale, "reference" | "draft" | "partial-draft"> = {
  fr: "reference",
  en: "draft",
  ar: "draft",
  kab: "partial-draft",
};

export const localeLabels: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
  kab: "Taqbaylit",
};

/** Balise BCP 47 utilisée pour le formatage (dates, nombres). */
export const localeIntlTag: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-GB",
  ar: "ar-DZ",
  kab: "fr-DZ",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function directionFor(locale: Locale): "rtl" | "ltr" {
  return rtlLocales.includes(locale) ? "rtl" : "ltr";
}

/** Choisit la langue préférée à partir de l'en-tête Accept-Language. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return defaultLocale;
  const candidates = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, quality] = part.trim().split(";q=");
      return { tag: (tag ?? "").toLowerCase(), q: quality ? Number(quality) : 1 };
    })
    .filter((entry) => entry.tag && !Number.isNaN(entry.q))
    .sort((a, b) => b.q - a.q);
  for (const { tag } of candidates) {
    const base = tag.split("-")[0];
    if (isLocale(base) && localeStatus[base] === "reference") return base;
  }
  return defaultLocale;
}
