import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { planEconomics, profitabilityRisks, storageCostCents, streamingCostCents, totalFixedCostsCents, type CostModel } from "@/server/finance/economics";
import { getSettings } from "@/server/settings";

export type PlatformMetrics = {
  period: { from: string; to: string };
  users: { total: number; new_in_period: number; suspended: number; founders_ever: number };
  subscriptions: {
    active_total: number;
    founder: number;
    standard: number;
    premium: number;
    past_due: number;
    cancel_scheduled: number;
    manual: number;
    mrr_cents: number;
    mrr_by_tier_cents: Record<string, number>;
    canceled_in_period: number;
  };
  revenue: {
    gross_paid_cents: number;
    refunded_cents: number;
    fees_cents: number;
    tax_cents: number;
    invoices_paid: number;
    payment_failures: number;
    webhook_failures: number;
  };
  catalog: Record<string, number>;
  streaming: { sessions: number; minutes_watched: number; unique_viewers: number; active_streams_now: number; minutes_by_tier: Record<string, number> };
  requests: { open: number; new_in_period: number; votes_in_period: number };
  incidents: { open: number; critical_open: number };
  finance_entries: Record<string, number>;
};

export async function getPlatformMetrics(from: Date, to: Date): Promise<PlatformMetrics> {
  const { data, error } = await createSupabaseAdminClient().rpc("platform_metrics", { p_from: from.toISOString(), p_to: to.toISOString() });
  if (error || !data) throw new Error(`Indicateurs indisponibles : ${error?.message}`);
  return data as unknown as PlatformMetrics;
}

export async function getCostModel(): Promise<CostModel> {
  const s = await getSettings();
  return {
    streamDeliveredUsdPer1000Min: s.costStreamDeliveredUsdPer1000Min,
    streamStoredUsdPer1000Min: s.costStreamStoredUsdPer1000Min,
    usdToEurRate: s.usdToEurRate,
    paymentFeePercent: s.paymentFeePercent,
    paymentFeeFixedCents: s.paymentFeeFixedCents,
    fixedMonthlyCostsCents: s.fixedMonthlyCostsCents,
  };
}

/** Synthèse financière d'une période (revenus séparés des coûts, estimations explicites). */
export async function getFinanceSummary(from: Date, to: Date) {
  const [metrics, model, settings] = await Promise.all([getPlatformMetrics(from, to), getCostModel(), getSettings()]);
  const { data: plans } = await createSupabaseAdminClient()
    .from("subscription_plans")
    .select("code, name, tier, price_cents")
    .order("sort_order");
  const usage = (plans ?? []).map((plan) => ({
    code: plan.code,
    name: plan.name,
    priceCents: plan.price_cents,
    activeSubscribers: (metrics.subscriptions as unknown as Record<string, number>)[plan.tier] ?? 0,
    minutesWatched: metrics.streaming.minutes_by_tier[plan.tier] ?? 0,
  }));
  const economics = planEconomics(usage, model, metrics.finance_entries.hosting ?? 0);
  const streamingCost = streamingCostCents(metrics.streaming.minutes_watched, model);
  const storageCost = storageCostCents(metrics.catalog.media_minutes_stored ?? 0, model);
  const fixedCosts = totalFixedCostsCents(model);
  const manual = metrics.finance_entries;
  const revenue = {
    subscriptions: metrics.revenue.gross_paid_cents - metrics.revenue.refunded_cents,
    ads: manual.ad_revenue ?? 0,
    other: manual.other_revenue ?? 0,
  };
  const costs = {
    paymentFees: metrics.revenue.fees_cents + (manual.payment_fees ?? 0),
    hosting: (model.fixedMonthlyCostsCents.hosting ?? 0) + (model.fixedMonthlyCostsCents.database ?? 0) + (manual.hosting ?? 0),
    streaming: streamingCost + (manual.streaming ?? 0),
    storage: storageCost + (manual.storage ?? 0),
    email: (model.fixedMonthlyCostsCents.email ?? 0) + (manual.email ?? 0),
    contentLicenses: manual.content_licenses ?? 0,
    other: (model.fixedMonthlyCostsCents.domain ?? 0) + (model.fixedMonthlyCostsCents.other ?? 0) + (manual.tools ?? 0) + (manual.other_cost ?? 0),
  };
  const totalRevenue = revenue.subscriptions + revenue.ads + revenue.other;
  const totalCosts = Object.values(costs).reduce((a, b) => a + b, 0);
  const activeUsers = metrics.streaming.unique_viewers;
  const subscribers = metrics.subscriptions.active_total;
  const founderPlan = (plans ?? []).find((p) => p.tier === "founder");
  const standardPlan = (plans ?? []).find((p) => p.tier === "standard");
  return {
    metrics,
    model,
    revenue,
    costs,
    totalRevenue,
    totalCosts,
    result: totalRevenue - totalCosts,
    fixedCosts,
    costPerActiveUserCents: activeUsers > 0 ? Math.round(totalCosts / activeUsers) : null,
    costPerSubscriberCents: subscribers > 0 ? Math.round(totalCosts / subscribers) : null,
    economics,
    risks: profitabilityRisks({
      economics,
      model,
      founderPriceCents: founderPlan?.price_cents ?? 200,
      standardPriceCents: standardPlan?.price_cents ?? 1000,
      launchPhase: settings.launchPhase,
    }),
  };
}
