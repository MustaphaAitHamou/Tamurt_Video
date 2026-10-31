/** Montant en centimes vers chaîne localisée (devise réellement facturée). */
export function formatPrice(cents: number, currency = "EUR", locale = "fr-FR") {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Conversion indicative en dinars algériens (jamais utilisée pour facturer).
 * Arrondi à la dizaine pour ne pas suggérer une précision trompeuse.
 */
export function formatIndicativeDzd(cents: number, rate: number, locale = "fr-FR") {
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const dzd = Math.round(((cents / 100) * rate) / 10) * 10;
  return `≈ ${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(dzd)} DA`;
}

export function formatRuntime(minutes: number | null | undefined) {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m.toString().padStart(2, "0")}`;
}

/** Durée de lecture façon lecteur vidéo : 1:02:05 ou 4:05. */
export function formatClock(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? m.toString().padStart(2, "0") : m.toString();
  return `${h > 0 ? `${h}:` : ""}${mm}:${sec.toString().padStart(2, "0")}`;
}

export function formatDate(value: string | Date | null | undefined, locale = "fr-FR", options?: Intl.DateTimeFormatOptions) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, options ?? { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined, locale = "fr-FR") {
  return formatDate(value, locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

export function formatNumber(value: number, locale = "fr-FR", options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale, options).format(value);
}

/** Classification d'âge (repères de la signalétique française). */
export function ageRatingLabel(rating: number) {
  return rating === 0 ? "Tous publics" : `-${rating}`;
}

export function daysUntil(value: string | Date, now = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
