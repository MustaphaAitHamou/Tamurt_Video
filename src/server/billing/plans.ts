import "server-only";

import { cache } from "react";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PlanTier } from "@/lib/permissions";

export type PublicPlan = {
  id: string;
  code: string;
  tier: PlanTier;
  name: string;
  tagline: string | null;
  description: string | null;
  features: string[];
  priceCents: number;
  currency: string;
  interval: "month" | "year";
  maxStreams: number;
  maxProfiles: number;
  availableInPhases: ("founder" | "commercial")[];
  isActive: boolean;
};

export const getPublicPlans = cache(async (): Promise<PublicPlan[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .select(
      "id, code, tier, name, tagline, description, features, price_cents, currency, billing_interval, max_streams, max_profiles, available_in_phases, is_active, is_public",
    )
    .eq("is_public", true)
    .order("sort_order");
  if (error) {
    console.error("[plans]", error.message);
    return [];
  }
  return (data ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    tier: p.tier,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    features: Array.isArray(p.features) ? (p.features as string[]) : [],
    priceCents: p.price_cents,
    currency: p.currency,
    interval: p.billing_interval === "year" ? "year" : "month",
    maxStreams: p.max_streams,
    maxProfiles: p.max_profiles,
    availableInPhases: p.available_in_phases as ("founder" | "commercial")[],
    isActive: p.is_active,
  }));
});

/** Nombre de soutiens fondateurs actifs (statistique publique agrégée). */
export const getActiveFounderCount = cache(async (): Promise<number> => {
  const admin = createSupabaseAdminClient();
  const { data: plan } = await admin
    .from("subscription_plans")
    .select("id")
    .eq("tier", "founder")
    .limit(1)
    .maybeSingle();
  if (!plan) return 0;
  const { count } = await admin
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", plan.id)
    .in("status", ["active", "trialing", "past_due"]);
  return count ?? 0;
});
