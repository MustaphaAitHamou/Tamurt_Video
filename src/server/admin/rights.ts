import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Listes de choix des formulaires de licence. */
export async function getLicenseFormOptions() {
  const supabase = await createSupabaseServerClient();
  const [titles, holders] = await Promise.all([
    supabase.from("titles").select("id, title").is("deleted_at", null).order("title").limit(2000),
    supabase.from("rights_holders").select("id, name").order("name").limit(2000),
  ]);
  return { titles: titles.data ?? [], holders: holders.data ?? [] };
}
