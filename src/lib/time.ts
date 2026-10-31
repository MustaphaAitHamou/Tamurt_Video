/**
 * Horloge des composants serveur. Ces composants sont rendus à chaque requête :
 * lire l'heure courante y est légitime. La fonction est centralisée pour pouvoir
 * être remplacée dans les tests.
 */
export function nowMs() {
  return Date.now();
}

/** Vrai si la date est dans le futur. */
export function isFuture(value: string | null | undefined, now = nowMs()) {
  return Boolean(value) && Date.parse(value as string) > now;
}

/** Vrai si la date est passée (ou maintenant). */
export function isPast(value: string | null | undefined, now = nowMs()) {
  return Boolean(value) && Date.parse(value as string) <= now;
}
