import "server-only";

/**
 * Adresse de Tamurt Services (la maison mère) : active le bouton yaz de l'en-tête.
 * Vide ou invalide : pas de bouton, jamais de lien mort.
 */
export function tamurtServicesUrl(): string | null {
  const value = process.env.TAMURT_SERVICES_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
