import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { AppRole, Permission, PlanTier } from "@/lib/permissions";

export const VIEWER_PROFILE_COOKIE = "tv_profile";

export type SessionUser = {
  id: string;
  email: string;
  aal: "aal1" | "aal2";
  provider: string | undefined;
};

export type Entitlements = {
  tier: PlanTier;
  planTier: PlanTier | null;
  planCode: string | null;
  planName: string | null;
  subscriptionId: string | null;
  provider: string | null;
  status: Database["public"]["Enums"]["subscription_status"] | null;
  currentPeriodEnd: string | null;
  accessUntil: string | null;
  inGrace: boolean;
  cancelAtPeriodEnd: boolean;
  isFounderRate: boolean;
  unitAmountCents: number | null;
  currency: string | null;
  founderSince: string | null;
  founderNumber: number | null;
  maxStreams: number;
  maxProfiles: number;
  maxQuality: string;
  includesAds: boolean;
  suspended: boolean;
  launchPhase: "founder" | "commercial";
};

export type StaffContext = {
  roles: AppRole[];
  permissions: Permission[];
  mfaRequired: boolean;
  mfaSatisfied: boolean;
};

export type ViewerProfile = {
  id: string;
  name: string;
  avatarKey: string;
  isKids: boolean;
  maxAgeRating: number | null;
  isDefault: boolean;
};

export type Viewer = {
  user: SessionUser;
  profile: {
    displayName: string | null;
    avatarKey: string;
    preferredLocale: string;
    subtitleLocale: string | null;
    autoplayNext: boolean;
    searchHistoryEnabled: boolean;
    personalizedRecommendations: boolean;
    founderSince: string | null;
    founderNumber: number | null;
    suspendedAt: string | null;
  };
  entitlements: Entitlements;
  staff: StaffContext;
  viewerProfiles: ViewerProfile[];
  activeProfile: ViewerProfile;
};

/** Identité vérifiée (signature et expiration du JWT contrôlées par Supabase). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const claims = data.claims;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    aal: claims.aal === "aal2" ? "aal2" : "aal1",
    provider: typeof claims.app_metadata?.provider === "string" ? claims.app_metadata.provider : undefined,
  };
});

function mapEntitlements(row: Database["public"]["Functions"]["get_my_entitlements"]["Returns"][number] | null): Entitlements {
  return {
    tier: row?.tier ?? "free",
    planTier: row?.plan_tier ?? null,
    planCode: row?.plan_code ?? null,
    planName: row?.plan_name ?? null,
    subscriptionId: row?.subscription_id ?? null,
    provider: row?.provider ?? null,
    status: row?.status ?? null,
    currentPeriodEnd: row?.current_period_end ?? null,
    accessUntil: row?.access_until ?? null,
    inGrace: row?.in_grace ?? false,
    cancelAtPeriodEnd: row?.cancel_at_period_end ?? false,
    isFounderRate: row?.is_founder_rate ?? false,
    unitAmountCents: row?.unit_amount_cents ?? null,
    currency: row?.currency ?? null,
    founderSince: row?.founder_since ?? null,
    founderNumber: row?.founder_number ?? null,
    maxStreams: row?.max_streams ?? 1,
    maxProfiles: row?.max_profiles ?? 1,
    maxQuality: row?.max_quality ?? "hd",
    includesAds: row?.includes_ads ?? true,
    suspended: row?.suspended ?? false,
    launchPhase: row?.launch_phase === "commercial" ? "commercial" : "founder",
  };
}

/** Contexte complet de l'utilisateur connecté, mis en cache pour la requête. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();

  const [profileResult, entitlementsResult, staffResult, profilesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "display_name, avatar_key, preferred_locale, subtitle_locale, autoplay_next, search_history_enabled, personalized_recommendations, founder_since, founder_number, suspended_at",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("get_my_entitlements").maybeSingle(),
    supabase.rpc("my_staff_context"),
    supabase
      .from("viewer_profiles")
      .select("id, name, avatar_key, is_kids, max_age_rating, is_default")
      .eq("account_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at"),
  ]);

  const profile = profileResult.data;
  if (!profile) return null;

  const staffRaw = (staffResult.data ?? {}) as {
    roles?: AppRole[];
    permissions?: Permission[];
    mfa_required?: boolean;
    mfa_satisfied?: boolean;
  };

  const viewerProfiles: ViewerProfile[] = (profilesResult.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    avatarKey: p.avatar_key,
    isKids: p.is_kids,
    maxAgeRating: p.max_age_rating,
    isDefault: p.is_default,
  }));
  const selectedId = (await cookies()).get(VIEWER_PROFILE_COOKIE)?.value;
  const activeProfile =
    viewerProfiles.find((p) => p.id === selectedId) ??
    viewerProfiles.find((p) => p.isDefault) ??
    viewerProfiles[0];
  if (!activeProfile) return null;

  return {
    user,
    profile: {
      displayName: profile.display_name,
      avatarKey: profile.avatar_key,
      preferredLocale: profile.preferred_locale,
      subtitleLocale: profile.subtitle_locale,
      autoplayNext: profile.autoplay_next,
      searchHistoryEnabled: profile.search_history_enabled,
      personalizedRecommendations: profile.personalized_recommendations,
      founderSince: profile.founder_since,
      founderNumber: profile.founder_number,
      suspendedAt: profile.suspended_at,
    },
    entitlements: mapEntitlements(entitlementsResult.data ?? null),
    staff: {
      roles: staffRaw.roles ?? [],
      permissions: staffRaw.permissions ?? [],
      mfaRequired: staffRaw.mfa_required ?? true,
      mfaSatisfied: staffRaw.mfa_satisfied ?? false,
    },
    viewerProfiles,
    activeProfile,
  };
});

/** Redirige vers la connexion si nécessaire et renvoie le contexte utilisateur. */
export async function requireViewer(nextPath = "/"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect(`/connexion?next=${encodeURIComponent(nextPath)}`);
  }
  if (viewer.profile.suspendedAt) {
    redirect("/compte-suspendu");
  }
  return viewer;
}

export function hasPermission(viewer: Viewer | null, permission: Permission): boolean {
  return Boolean(viewer && viewer.staff.mfaSatisfied && viewer.staff.permissions.includes(permission));
}

/**
 * Accès au back-office : l'existence des pages est masquée aux non-membres de
 * l'équipe ; l'authentification renforcée est exigée lorsque configurée.
 */
export async function requireStaff(permission: Permission, nextPath = "/admin"): Promise<Viewer> {
  const viewer = await requireViewer(nextPath);
  if (viewer.staff.roles.length === 0) {
    notFound();
  }
  if (viewer.staff.mfaRequired && viewer.user.aal !== "aal2") {
    redirect(`/compte/securite/double-authentification?next=${encodeURIComponent(nextPath)}`);
  }
  if (!viewer.staff.permissions.includes(permission)) {
    redirect("/admin/acces-refuse");
  }
  return viewer;
}
