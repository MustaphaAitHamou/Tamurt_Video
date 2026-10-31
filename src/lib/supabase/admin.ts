import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

let adminClient: ReturnType<typeof createClient<Database>> | undefined;

/**
 * Client à privilèges élevés (contourne la RLS). Réservé au code serveur
 * après vérification explicite des autorisations : webhooks, tâches
 * planifiées, décisions de lecture, envoi d'emails.
 */
export function createSupabaseAdminClient() {
  if (!adminClient) {
    const env = getEnv();
    adminClient = createClient<Database>(env.supabase.url, env.supabase.secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { "X-Client-Info": "tamurt-video-server" } },
    });
  }
  return adminClient;
}

export type AdminSupabaseClient = ReturnType<typeof createSupabaseAdminClient>;
