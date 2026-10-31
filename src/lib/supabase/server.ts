import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Client Supabase lié à la session de l'utilisateur (cookies). Toutes les
 * requêtes passent par la RLS avec l'identité de l'utilisateur.
 */
export async function createSupabaseServerClient() {
  const env = getEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabase.url, env.supabase.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Appel depuis un Server Component : le proxy rafraîchit déjà la session.
        }
      },
    },
  });
}

export type ServerSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
