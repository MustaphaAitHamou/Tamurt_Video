import type { Database } from "@/lib/supabase/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type PlanTier = Database["public"]["Enums"]["plan_tier"];

/**
 * Miroir de la table public.role_permissions (source de vérité en base).
 * Utilisé pour l'affichage ; chaque action reste vérifiée par le serveur et la RLS.
 * La cohérence est contrôlée par tests/integration/permissions.test.ts.
 */
export const ROLE_PERMISSIONS = {
  admin: [
    "admin.access",
    "catalog.read_all",
    "catalog.write",
    "catalog.publish",
    "media.upload",
    "rights.read",
    "rights.write",
    "rights.documents",
    "takedown.execute",
    "requests.moderate",
    "requests.confirm_acquisition",
    "editorial.write",
    "users.read",
    "users.manage",
    "billing.read",
    "billing.manage",
    "finance.read",
    "finance.write",
    "settings.write",
    "audit.read",
    "hq.manage",
    "ads.manage",
    "messages.read",
  ],
  catalog_editor: [
    "admin.access",
    "catalog.read_all",
    "catalog.write",
    "catalog.publish",
    "media.upload",
    "rights.read",
    "requests.moderate",
    "editorial.write",
  ],
  rights_manager: [
    "admin.access",
    "catalog.read_all",
    "rights.read",
    "rights.write",
    "rights.documents",
    "takedown.execute",
    "requests.confirm_acquisition",
  ],
} as const satisfies Record<AppRole, readonly string[]>;

export type Permission = (typeof ROLE_PERMISSIONS)["admin"][number];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrateur",
  catalog_editor: "Éditeur de catalogue",
  rights_manager: "Gestionnaire des droits",
};

export const TIER_ORDER: readonly PlanTier[] = ["free", "founder", "standard", "premium"];

export function tierAtLeast(tier: PlanTier, minimum: PlanTier) {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(minimum);
}

export function permissionsForRoles(roles: readonly AppRole[]): Set<Permission> {
  const result = new Set<Permission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role]) {
      result.add(permission);
    }
  }
  return result;
}
