import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";

import { getEnv } from "@/lib/env";

/** Adresse IP du client telle que transmise par l'hébergeur. */
export async function getClientIp(): Promise<string | undefined> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || undefined;
  return h.get("x-real-ip") ?? undefined;
}

/** Empreinte non réversible d'une adresse IP (journalisation minimisée). */
export function hashIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  return createHmac("sha256", getEnv().logHashSalt).update(ip).digest("hex").slice(0, 32);
}

/** Pays de la requête d'après l'en-tête de géolocalisation de confiance (ISO 3166-1 alpha-2). */
export function resolveCountry(headerValue: string | null | undefined, override?: string): string {
  const candidate = (override ?? headerValue ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(candidate) && candidate !== "XX" ? candidate : "XX";
}

export async function getRequestCountry(): Promise<string> {
  const env = getEnv();
  const h = await headers();
  return resolveCountry(h.get(env.geo.header), env.geo.devOverride);
}

export async function getUserAgent(): Promise<string | undefined> {
  return (await headers()).get("user-agent") ?? undefined;
}

/** Libellé d'appareil lisible, sans conserver la chaîne User-Agent complète. */
export function describeDevice(userAgent: string | undefined): string {
  if (!userAgent) return "Appareil inconnu";
  const ua = userAgent.toLowerCase();
  const browser = ua.includes("edg/")
    ? "Edge"
    : ua.includes("firefox/")
      ? "Firefox"
      : ua.includes("chrome/")
        ? "Chrome"
        : ua.includes("safari/")
          ? "Safari"
          : "Navigateur";
  const os = ua.includes("android")
    ? "Android"
    : ua.includes("iphone") || ua.includes("ipad")
      ? "iOS"
      : ua.includes("mac os")
        ? "macOS"
        : ua.includes("windows")
          ? "Windows"
          : ua.includes("linux")
            ? "Linux"
            : "Système inconnu";
  return `${browser} · ${os}`;
}
