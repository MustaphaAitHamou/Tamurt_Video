import type { NextRequest } from "next/server";

/**
 * Protection CSRF des routes POST authentifiées par cookie : la requête doit
 * provenir du même site (en plus des cookies SameSite=Lax de la session).
 */
export function isSameOriginRequest(request: NextRequest | Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
