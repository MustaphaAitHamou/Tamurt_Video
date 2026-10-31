/** Avatars proposés (pas d'envoi d'images personnelles : rien à modérer). */
export const AVATARS = [
  { key: "ochre", label: "Ocre", from: "#f2a541", to: "#b45309", symbol: "ⵣ" },
  { key: "carmine", label: "Carmin", from: "#ff5a6b", to: "#a3122a", symbol: "◆" },
  { key: "olive", label: "Olivier", from: "#9cc46b", to: "#3f6212", symbol: "✦" },
  { key: "indigo", label: "Indigo", from: "#8b9cff", to: "#3730a3", symbol: "⬥" },
  { key: "turquoise", label: "Turquoise", from: "#5eead4", to: "#0f766e", symbol: "✧" },
  { key: "sand", label: "Sable", from: "#e7d3a8", to: "#8a6a35", symbol: "◇" },
  { key: "night", label: "Nuit", from: "#94a3b8", to: "#1e293b", symbol: "✶" },
  { key: "coral", label: "Corail", from: "#fda4af", to: "#be123c", symbol: "❖" },
] as const;

export type AvatarKey = (typeof AVATARS)[number]["key"];

export const AGE_RATINGS = [0, 10, 12, 16, 18] as const;

export const TITLE_KINDS = ["film", "series", "documentary", "short", "show", "interview"] as const;
export type TitleKind = (typeof TITLE_KINDS)[number];

/** Langues de contenu courantes (codes ISO 639). */
export const CONTENT_LANGUAGES: Record<string, string> = {
  kab: "Kabyle (taqbaylit)",
  ar: "Arabe",
  arq: "Arabe algérien (darija)",
  fr: "Français",
  tzm: "Tamazight du Maroc central",
  shi: "Tachelhit",
  rif: "Tarifit",
  shy: "Chaoui (tacawit)",
  taq: "Tamasheq (touareg)",
  mzb: "Mozabite (tumzabt)",
  en: "Anglais",
  es: "Espagnol",
};

/** Pays fréquents pour le catalogue et les territoires (ISO 3166-1 alpha-2). */
export const COUNTRIES: Record<string, string> = {
  DZ: "Algérie",
  FR: "France",
  MA: "Maroc",
  TN: "Tunisie",
  LY: "Libye",
  ML: "Mali",
  NE: "Niger",
  BE: "Belgique",
  CH: "Suisse",
  CA: "Canada",
  DE: "Allemagne",
  ES: "Espagne",
  IT: "Italie",
  NL: "Pays-Bas",
  GB: "Royaume-Uni",
  US: "États-Unis",
  LU: "Luxembourg",
  SE: "Suède",
  QA: "Qatar",
  AE: "Émirats arabes unis",
};

export function countryName(code: string) {
  if (code === "WW") return "Monde entier";
  return COUNTRIES[code] ?? code;
}

export function languageName(code: string) {
  return CONTENT_LANGUAGES[code] ?? code;
}
