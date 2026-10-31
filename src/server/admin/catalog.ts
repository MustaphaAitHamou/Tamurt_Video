import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Fiche complète d'une œuvre pour l'administration (lecture sous RLS « catalog.read_all »). */
export async function getAdminTitle(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: title } = await supabase.from("titles").select("*").eq("id", id).maybeSingle();
  if (!title) return null;
  const [genres, credits, seasons, episodes, assets, licenses] = await Promise.all([
    supabase.from("title_genres").select("genre_id").eq("title_id", id),
    supabase.from("credits").select("id, role, character_name, position, people(full_name, slug)").eq("title_id", id).order("position"),
    supabase.from("seasons").select("id, season_number, name").eq("title_id", id).order("season_number"),
    supabase
      .from("episodes")
      .select("id, season_id, episode_number, name, synopsis, runtime_minutes, intro_start_seconds, intro_end_seconds, credits_start_seconds, status, main_asset_id")
      .eq("title_id", id)
      .is("deleted_at", null)
      .order("episode_number"),
    supabase
      .from("media_assets")
      .select("id, kind, status, provider, episode_id, duration_seconds, height, qualities, original_filename, error_message, created_at, ready_at, rights_attestation, subtitles(id, language, label, kind, is_machine_generated)")
      .eq("title_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("licenses")
      .select("id, status, license_type, starts_at, ends_at, exploitation_modes, supports, is_exclusive, rights_holders(name), license_territories(country_code, is_excluded)")
      .eq("title_id", id)
      .order("starts_at", { ascending: false }),
  ]);
  const now = Date.now();
  const licenseRows = licenses.data ?? [];
  const validLicenses = licenseRows.filter(
    (l) => l.status === "signed" && Date.parse(l.starts_at) <= now && (!l.ends_at || Date.parse(l.ends_at) > now) && l.license_territories.some((t) => !t.is_excluded),
  );
  return {
    title,
    genreIds: (genres.data ?? []).map((g) => g.genre_id),
    credits: credits.data ?? [],
    seasons: seasons.data ?? [],
    episodes: episodes.data ?? [],
    assets: assets.data ?? [],
    licenses: licenseRows,
    hasValidLicense: validLicenses.length > 0,
  };
}

export type AdminTitle = NonNullable<Awaited<ReturnType<typeof getAdminTitle>>>;
