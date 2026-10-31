import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Pool } from "pg";

import type { Database } from "@/lib/supabase/database.types";

export type Tier = "free" | "founder" | "standard" | "premium";
export type Role = "admin" | "catalog_editor" | "rights_manager";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
export const sql = async <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
  (await pool.query(text, params)).rows as T[];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
export const admin = createClient<Database>(url, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
export const anon = createClient<Database>(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const createdUsers: string[] = [];
const createdTitles: string[] = [];
const PASSWORD = "Integration-Test-2026";

export type TestUser = { id: string; email: string; client: SupabaseClient<Database> };

/** Compte de test confirmé, avec formule (abonnement attribué) et rôles éventuels. */
export async function createUser(
  options: { tier?: Tier; roles?: Role[]; founderRate?: boolean } = {},
): Promise<TestUser> {
  const email = `it-${randomUUID().slice(0, 8)}@tamurt.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: "Test intégration" },
  });
  if (error || !data.user) throw error ?? new Error("Création du compte impossible");
  const id = data.user.id;
  createdUsers.push(id);
  if (options.tier && options.tier !== "free") {
    const [plan] = await sql<{ id: string; price_cents: number }>(
      "select id, price_cents from public.subscription_plans where tier = $1",
      [options.tier],
    );
    await sql(
      `insert into public.subscriptions (user_id, plan_id, provider, status, unit_amount_cents, currency, current_period_start, current_period_end, is_founder_rate, note)
       values ($1, $2, 'manual', 'active', $3, 'EUR', now() - interval '1 day', now() + interval '29 days', $4, 'test d''intégration')`,
      [id, plan!.id, plan!.price_cents, options.tier === "founder" || Boolean(options.founderRate)],
    );
  }
  for (const role of options.roles ?? [])
    await sql("insert into public.user_roles (user_id, role) values ($1, $2)", [id, role]);
  const client = createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError) throw signInError;
  return { id, email, client };
}

type LicenseInput = {
  status?: "draft" | "signed" | "suspended" | "terminated";
  territories?: string[];
  excluded?: string[];
  modes?: string[];
  startsAt?: string;
  endsAt?: string | null;
};

/** Œuvre de test (non démo) avec licence, vidéo prête et statut demandé. */
export async function createTitle(
  options: {
    minTier?: Tier;
    status?: "draft" | "announced" | "published";
    license?: LicenseInput | null;
    withMedia?: boolean;
  } = {},
) {
  const slug = `it-${randomUUID().slice(0, 12)}`;
  const [title] = await sql<{ id: string }>(
    `insert into public.titles (slug, title, kind, structure, min_tier, status, countries, original_languages, audio_languages)
     values ($1, $2, 'film', 'single', $3, 'draft', '{DZ}', '{kab}', '{kab}') returning id`,
    [slug, `Œuvre de test ${slug}`, options.minTier ?? "standard"],
  );
  const titleId = title!.id;
  createdTitles.push(titleId);
  if (options.license !== null) {
    const license = options.license ?? {};
    const [row] = await sql<{ id: string }>(
      `insert into public.licenses (title_id, license_type, status, exploitation_modes, supports, starts_at, ends_at)
       values ($1, 'non_exclusive_license', $2, $3, '{web}', $4, $5) returning id`,
      [
        titleId,
        license.status ?? "signed",
        license.modes ?? ["svod", "trailer", "free"],
        license.startsAt ?? new Date(Date.now() - 86_400_000 * 30).toISOString(),
        license.endsAt === undefined
          ? new Date(Date.now() + 86_400_000 * 365).toISOString()
          : license.endsAt,
      ],
    );
    for (const country of license.territories ?? ["WW"])
      await sql(
        "insert into public.license_territories (license_id, country_code) values ($1, $2)",
        [row!.id, country],
      );
    for (const country of license.excluded ?? [])
      await sql(
        "insert into public.license_territories (license_id, country_code, is_excluded) values ($1, $2, true)",
        [row!.id, country],
      );
  }
  if (options.withMedia !== false) {
    const [asset] = await sql<{ id: string }>(
      `insert into public.media_assets (provider, provider_asset_id, kind, status, title_id, duration_seconds, ready_at)
       values ('dev_local', $1, 'main', 'ready', $2, 600, now()) returning id`,
      [`demo-feature#${randomUUID()}`, titleId],
    );
    await sql("update public.titles set main_asset_id = $1 where id = $2", [asset!.id, titleId]);
  }
  if (options.status === "published")
    await sql(
      "update public.titles set status = 'published', published_at = now() - interval '1 day' where id = $1",
      [titleId],
    );
  if (options.status === "announced")
    await sql("update public.titles set status = 'announced' where id = $1", [titleId]);
  return { id: titleId, slug };
}

export async function playback(
  userId: string | null,
  titleId: string,
  country: string,
  kind: "main" | "trailer" = "main",
) {
  const { data, error } = await admin.rpc("check_playback", {
    p_user: userId as string,
    p_title: titleId,
    p_episode: null as unknown as string,
    p_viewer_profile: null as unknown as string,
    p_country: country,
    p_kind: kind,
  });
  if (error) throw error;
  return data![0]!;
}

export async function setSetting(key: string, value: unknown) {
  await sql("update public.platform_settings set value = $2::jsonb where key = $1", [
    key,
    JSON.stringify(value),
  ]);
}

/** Supprime les données créées par les tests (base locale uniquement). */
export async function cleanup() {
  for (const id of createdTitles.splice(0)) {
    await sql(
      "update public.titles set main_asset_id = null, trailer_asset_id = null where id = $1",
      [id],
    );
    await sql("delete from public.media_assets where title_id = $1", [id]);
    await sql("delete from public.licenses where title_id = $1", [id]);
    await sql("delete from public.titles where id = $1", [id]);
  }
  for (const id of createdUsers.splice(0)) await admin.auth.admin.deleteUser(id);
}
