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

const PARIS = "Europe/Paris";

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** Décalage (minutes) d'un fuseau par rapport à UTC à un instant donné. */
export function timeZoneOffsetMinutes(date: Date, timeZone = PARIS) {
  const p = zonedParts(date, timeZone);
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000) / 60_000;
}

/** Valeur d'un champ « datetime-local » exprimée à l'heure de Paris. */
export function toParisInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const p = zonedParts(date, PARIS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Interprète une saisie « AAAA-MM-JJTHH:MM » comme une heure de Paris et renvoie l'instant UTC (ISO). */
export function parisInputToIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number) as [number, number, number, number, number, number];
  const naiveUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Deux passes pour tenir compte d'un changement d'heure proche.
  let instant = naiveUtc - timeZoneOffsetMinutes(new Date(naiveUtc)) * 60_000;
  instant = naiveUtc - timeZoneOffsetMinutes(new Date(instant)) * 60_000;
  return new Date(instant).toISOString();
}
