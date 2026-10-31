import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Correspondance identifiant → email pour un lot de comptes (fonction SQL contrôlée par permission). */
export async function getUserEmails(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map<string, string>();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("admin_user_emails", { p_ids: unique });
  return new Map((data ?? []).map((row) => [row.id, row.email]));
}
