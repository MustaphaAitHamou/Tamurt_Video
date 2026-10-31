import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateHqRequest } from "@/server/hq/auth";
import { getFinanceSummary } from "@/server/metrics";
import { rateLimit } from "@/server/rate-limit";

/**
 * API Tamurt HQ (lecture seule, agrégats sans données personnelles).
 * Authentification : Authorization: Bearer <clé thq_…> créée dans l'administration.
 * Paramètre facultatif : ?jours=30 (1 à 365).
 */
export async function GET(request: NextRequest) {
  const key = await authenticateHqRequest(request.headers.get("authorization"), "metrics:read");
  if (!key) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  const limit = await rateLimit(`hq:${key.id}`, 60, 3600);
  if (!limit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get("jours")) || 30, 1), 365);
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const summary = await getFinanceSummary(from, to);
  const { data: incidents } = await createSupabaseAdminClient()
    .from("incidents")
    .select("id, title, component, severity, status, started_at, resolved_at")
    .neq("status", "resolved")
    .order("started_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    service: "tamurt-video",
    version: 1,
    generated_at: new Date().toISOString(),
    period: { from: from.toISOString(), to: to.toISOString(), days },
    users: summary.metrics.users,
    subscriptions: summary.metrics.subscriptions,
    revenue: { ...summary.revenue, total_cents: summary.totalRevenue, currency: "EUR" },
    costs: { ...summary.costs, total_cents: summary.totalCosts, currency: "EUR", estimated: true },
    result_cents: summary.result,
    catalog: summary.metrics.catalog,
    streaming: summary.metrics.streaming,
    requests: summary.metrics.requests,
    incidents: { ...summary.metrics.incidents, items: incidents ?? [] },
  });
}
