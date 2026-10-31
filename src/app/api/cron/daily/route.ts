import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { getEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { dispatchPendingEmails } from "@/server/email/dispatcher";
import { getPaymentProvider } from "@/server/payments";
import { syncSubscription } from "@/server/payments/sync";
import { getSettings } from "@/server/settings";

export const maxDuration = 300;

function authorized(request: NextRequest) {
  const secret = getEnv().cronSecret;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Tâche quotidienne (Vercel Cron) : alertes d'expiration des licences,
 * dépublication des œuvres sans droits, publications programmées,
 * popularité, nettoyage, envoi des emails en attente, rattrapage des
 * abonnements dont le renouvellement n'a pas été reçu.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const settings = await getSettings();
  const report: Record<string, unknown> = {};
  const errors: string[] = [];

  async function step(name: string, fn: () => Promise<unknown>) {
    try {
      report[name] = await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${name}: ${message}`);
      report[name] = { error: message };
    }
  }

  await step("license_alerts", async () => {
    let sent = 0;
    for (const days of settings.licenseAlertDays) {
      const from = new Date(Date.now() + (days - 1) * 86_400_000).toISOString();
      const to = new Date(Date.now() + days * 86_400_000).toISOString();
      const { data: licenses } = await admin
        .from("licenses")
        .select("id, ends_at, contract_reference, titles(id, title)")
        .eq("status", "signed")
        .gte("ends_at", from)
        .lt("ends_at", to);
      for (const license of licenses ?? []) {
        const title = license.titles as { id: string; title: string } | null;
        const { count } = await admin
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("type", "staff.license_expiring")
          .contains("data", { license_id: license.id, threshold: days });
        if (count) continue;
        await admin.rpc("notify_staff", {
          p_permission: "rights.read",
          p_type: "staff.license_expiring",
          p_title: `Licence expirant dans ${days} jour${days > 1 ? "s" : ""} : ${title?.title ?? license.contract_reference ?? license.id}`,
          p_body: `Fin des droits le ${new Date(license.ends_at as string).toLocaleDateString("fr-FR")}. La lecture sera bloquée automatiquement à cette date.`,
          p_link: `/admin/droits/licences/${license.id}`,
          p_data: { license_id: license.id, threshold: days },
        });
        sent += 1;
      }
    }
    return { sent };
  });

  await step("unpublished_without_rights", async () => {
    const { data } = await admin.rpc("unpublish_titles_without_rights");
    for (const title of data ?? []) {
      await admin.rpc("notify_staff", {
        p_permission: "catalog.write",
        p_type: "staff.title_unpublished",
        p_title: `Œuvre dépubliée faute de droits valides : ${title.title}`,
        p_link: `/admin/catalogue/${title.title_id}`,
      });
    }
    return { count: data?.length ?? 0 };
  });

  await step("due_publications", async () => ({
    notified: (await admin.rpc("notify_due_publications")).data ?? 0,
  }));
  await step("popularity", async () => ({
    updated: (await admin.rpc("refresh_popularity")).data ?? 0,
  }));
  await step("stale_sessions", async () => ({
    closed: (await admin.rpc("close_stale_watch_sessions")).data ?? 0,
  }));
  await step("rate_limits", async () => ({
    purged: (await admin.rpc("purge_rate_limits")).data ?? 0,
  }));

  await step("subscription_reconciliation", async () => {
    const provider = getPaymentProvider();
    if (!provider) return { skipped: "payments_disabled" };
    const { data } = await admin.rpc("subscriptions_needing_reconciliation", { p_limit: 50 });
    let synced = 0;
    for (const row of data ?? []) {
      await syncSubscription(provider, admin, row.provider_subscription_id);
      synced += 1;
    }
    return { synced };
  });

  await step("emails", async () => dispatchPendingEmails(200));

  if (errors.length) {
    await admin.from("incidents").insert({
      title: "Tâche quotidienne : étapes en échec",
      description: errors.join("\n").slice(0, 4000),
      component: "platform",
      severity: "minor",
    });
  }
  return NextResponse.json(
    { ok: errors.length === 0, report, errors },
    { status: errors.length ? 207 : 200 },
  );
}
