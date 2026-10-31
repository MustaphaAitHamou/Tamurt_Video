import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const SETTINGS_CACHE_TAG = "platform-settings";

export type LegalEntity = {
  name: string;
  form: string;
  address: string;
  registration: string;
  vat: string;
  publication_director: string;
  host: string;
};

export type PlatformSettings = {
  launchPhase: "founder" | "commercial";
  founderSignupsOpen: boolean;
  gracePeriodDays: number;
  dzdDisplayEnabled: boolean;
  eurToDzdRate: number;
  eurToDzdRateUpdatedAt: string;
  adminMfaRequired: boolean;
  hideUnlicensedTitles: boolean;
  showDemoContent: boolean;
  adsEnabled: boolean;
  maintenanceMode: boolean;
  premiumRequestsPerMonth: number;
  streamHeartbeatTimeoutSeconds: number;
  licenseAlertDays: number[];
  costStreamDeliveredUsdPer1000Min: number;
  costStreamStoredUsdPer1000Min: number;
  usdToEurRate: number;
  paymentFeePercent: number;
  paymentFeeFixedCents: number;
  fixedMonthlyCostsCents: Record<string, number>;
  legalEntity: LegalEntity;
  supportEmail: string;
};

export type PublicSettings = Pick<
  PlatformSettings,
  | "launchPhase"
  | "founderSignupsOpen"
  | "dzdDisplayEnabled"
  | "eurToDzdRate"
  | "eurToDzdRateUpdatedAt"
  | "showDemoContent"
  | "adsEnabled"
  | "maintenanceMode"
  | "legalEntity"
  | "supportEmail"
>;

const DEFAULTS: PlatformSettings = {
  launchPhase: "founder",
  founderSignupsOpen: true,
  gracePeriodDays: 7,
  dzdDisplayEnabled: true,
  eurToDzdRate: 150,
  eurToDzdRateUpdatedAt: "",
  adminMfaRequired: true,
  hideUnlicensedTitles: true,
  showDemoContent: false,
  adsEnabled: false,
  maintenanceMode: false,
  premiumRequestsPerMonth: 10,
  streamHeartbeatTimeoutSeconds: 90,
  licenseAlertDays: [30, 7, 1],
  costStreamDeliveredUsdPer1000Min: 1,
  costStreamStoredUsdPer1000Min: 5,
  usdToEurRate: 0.86,
  paymentFeePercent: 1.5,
  paymentFeeFixedCents: 25,
  fixedMonthlyCostsCents: {},
  legalEntity: {
    name: "À compléter",
    form: "À compléter",
    address: "À compléter",
    registration: "À compléter",
    vat: "À compléter",
    publication_director: "À compléter",
    host: "À compléter",
  },
  supportEmail: "contact@tamurt.example",
};

const KEY_MAP: Record<string, keyof PlatformSettings> = {
  launch_phase: "launchPhase",
  founder_signups_open: "founderSignupsOpen",
  grace_period_days: "gracePeriodDays",
  dzd_display_enabled: "dzdDisplayEnabled",
  eur_to_dzd_rate: "eurToDzdRate",
  eur_to_dzd_rate_updated_at: "eurToDzdRateUpdatedAt",
  admin_mfa_required: "adminMfaRequired",
  hide_unlicensed_titles: "hideUnlicensedTitles",
  show_demo_content: "showDemoContent",
  ads_enabled: "adsEnabled",
  maintenance_mode: "maintenanceMode",
  premium_requests_per_month: "premiumRequestsPerMonth",
  stream_heartbeat_timeout_seconds: "streamHeartbeatTimeoutSeconds",
  license_alert_days: "licenseAlertDays",
  cost_stream_delivered_usd_per_1000_min: "costStreamDeliveredUsdPer1000Min",
  cost_stream_stored_usd_per_1000_min: "costStreamStoredUsdPer1000Min",
  usd_to_eur_rate: "usdToEurRate",
  payment_fee_percent: "paymentFeePercent",
  payment_fee_fixed_cents: "paymentFeeFixedCents",
  fixed_monthly_costs_cents: "fixedMonthlyCostsCents",
  legal_entity: "legalEntity",
  support_email: "supportEmail",
};

export function mapSettingsRows(rows: { key: string; value: unknown }[]): PlatformSettings {
  const result: PlatformSettings = { ...DEFAULTS };
  for (const row of rows) {
    const target = KEY_MAP[row.key];
    if (target && row.value !== null && row.value !== undefined) {
      (result as Record<string, unknown>)[target] = row.value;
    }
  }
  if (result.launchPhase !== "commercial") result.launchPhase = "founder";
  return result;
}

const loadSettings = unstable_cache(
  async () => {
    const { data, error } = await createSupabaseAdminClient().from("platform_settings").select("key, value");
    if (error) {
      console.error("[settings] lecture impossible", error.message);
      return DEFAULTS;
    }
    return mapSettingsRows(data ?? []);
  },
  ["platform-settings"],
  { tags: [SETTINGS_CACHE_TAG], revalidate: 60 },
);

/** Paramètres complets (usage serveur uniquement). */
export const getSettings = cache(async (): Promise<PlatformSettings> => loadSettings());

/** Sous-ensemble publiable vers le navigateur. */
export const getPublicSettings = cache(async (): Promise<PublicSettings> => {
  const s = await getSettings();
  return {
    launchPhase: s.launchPhase,
    founderSignupsOpen: s.founderSignupsOpen,
    dzdDisplayEnabled: s.dzdDisplayEnabled,
    eurToDzdRate: s.eurToDzdRate,
    eurToDzdRateUpdatedAt: s.eurToDzdRateUpdatedAt,
    showDemoContent: s.showDemoContent,
    adsEnabled: s.adsEnabled,
    maintenanceMode: s.maintenanceMode,
    legalEntity: s.legalEntity,
    supportEmail: s.supportEmail,
  };
});
