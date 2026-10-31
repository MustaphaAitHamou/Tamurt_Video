import "server-only";

import { getEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: Date | null };

/**
 * Limitation de débit à fenêtre fixe stockée dans PostgreSQL : fonctionne sur
 * un hébergement serverless sans service supplémentaire. En cas d'indisponibilité
 * de la base, la requête est autorisée (disponibilité privilégiée) et l'incident journalisé.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  if (getEnv().rateLimitDisabled) {
    return { allowed: true, remaining: limit, resetAt: null };
  }
  const { data, error } = await createSupabaseAdminClient()
    .rpc("rate_limit_hit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds })
    .single();
  if (error || !data) {
    console.error("[rate-limit] indisponible", error?.message);
    return { allowed: true, remaining: limit, resetAt: null };
  }
  return {
    allowed: data.allowed,
    remaining: data.remaining,
    resetAt: data.reset_at ? new Date(data.reset_at) : null,
  };
}
