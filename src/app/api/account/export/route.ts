import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/server/auth/session";
import { logAudit } from "@/server/audit";
import { rateLimit } from "@/server/rate-limit";

/** Portabilité des données (RGPD, art. 20) : export JSON des données du compte. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const limit = await rateLimit(`export:${user.id}`, 5, 3600);
  if (!limit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const supabase = await createSupabaseServerClient();
  const [profile, viewerProfiles, watchlist, progress, history, searches, requests, votes, notifications, subscriptions, invoices, consents, dataRequests] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("viewer_profiles").select("*").eq("account_id", user.id),
      supabase.from("watchlist_items").select("viewer_profile_id, created_at, titles(slug, title)").eq("account_id", user.id),
      supabase.from("watch_progress").select("viewer_profile_id, position_seconds, duration_seconds, completed, updated_at, titles(slug, title)").eq("account_id", user.id),
      supabase.from("watch_history").select("started_at, ended_at, watched_seconds, country_code, device_label, titles(slug, title)").eq("account_id", user.id),
      supabase.from("search_history").select("query, created_at").eq("account_id", user.id),
      supabase.from("content_requests").select("title, release_year, country, director, content_type, comment, info_url, status, created_at").eq("user_id", user.id),
      supabase.from("content_request_votes").select("request_id, created_at").eq("user_id", user.id),
      supabase.from("notifications").select("type, title, body, created_at, read_at").eq("user_id", user.id),
      supabase.from("subscriptions").select("status, unit_amount_cents, currency, current_period_start, current_period_end, cancel_at_period_end, created_at, subscription_plans(name)").eq("user_id", user.id),
      supabase.from("invoices").select("number, status, currency, amount_paid_cents, paid_at, period_start, period_end").eq("user_id", user.id),
      supabase.from("consent_logs").select("choices, policy_version, created_at").eq("user_id", user.id),
      supabase.from("data_requests").select("request_type, status, created_at, completed_at").eq("user_id", user.id),
    ]);
  const { data: authUser } = await createSupabaseAdminClient().auth.admin.getUserById(user.id);

  await logAudit({ actorId: user.id, action: "account.data_exported", entityType: "user", entityId: user.id });
  const payload = {
    generated_at: new Date().toISOString(),
    notice: "Export des données personnelles de votre compte Tamurt Vidéo. Les données de carte bancaire ne sont jamais stockées par Tamurt Vidéo.",
    account: {
      email: authUser?.user?.email ?? user.email,
      created_at: authUser?.user?.created_at ?? null,
      last_sign_in_at: authUser?.user?.last_sign_in_at ?? null,
    },
    profile: profile.data,
    viewer_profiles: viewerProfiles.data,
    watchlist: watchlist.data,
    watch_progress: progress.data,
    watch_history: history.data,
    search_history: searches.data,
    content_requests: requests.data,
    content_request_votes: votes.data,
    notifications: notifications.data,
    subscriptions: subscriptions.data,
    invoices: invoices.data,
    consent_logs: consents.data,
    data_requests: dataRequests.data,
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="tamurt-video-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
