/** Consentement aux cookies : stocké dans un cookie lisible par le site (pas de traceur tiers). */
export const CONSENT_COOKIE = "tv_consent";
export const CONSENT_POLICY_VERSION = "2026-10";
export const CONSENT_EVENT = "tamurt:consent-changed";
export const OPEN_CONSENT_EVENT = "tamurt:open-consent";

export type ConsentChoices = { necessary: true; analytics: boolean; ads: boolean };

export function parseConsent(raw: string | undefined | null): (ConsentChoices & { version: string }) | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentChoices & { version: string }>;
    if (value.version !== CONSENT_POLICY_VERSION) return null;
    return { necessary: true, analytics: Boolean(value.analytics), ads: Boolean(value.ads), version: value.version };
  } catch {
    return null;
  }
}

export function readConsentFromDocument(): (ConsentChoices & { version: string }) | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsent(match?.slice(CONSENT_COOKIE.length + 1));
}
