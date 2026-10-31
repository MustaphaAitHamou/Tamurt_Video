import "server-only";

import type { Permission } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer, type Viewer } from "@/server/auth/session";
import { failure, type ActionResult } from "@/server/errors";

/**
 * Contrôle d'accès des actions d'administration. Les écritures utilisent le
 * client lié à la session : la RLS s'applique et les triggers d'audit
 * enregistrent l'auteur de chaque modification.
 */
export async function adminContext(
  permission: Permission,
): Promise<
  | { ok: true; viewer: Viewer; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> }
  | { ok: false; result: ActionResult<never> }
> {
  const viewer = await getViewer();
  if (!viewer)
    return { ok: false, result: failure("Session expirée : reconnectez-vous.", "UNAUTHENTICATED") };
  if (viewer.staff.mfaRequired && viewer.user.aal !== "aal2") {
    return { ok: false, result: failure("Double authentification requise.", "MFA_REQUIRED") };
  }
  if (!viewer.staff.permissions.includes(permission)) {
    return {
      ok: false,
      result: failure("Vous n'avez pas l'autorisation d'effectuer cette action.", "FORBIDDEN"),
    };
  }
  return { ok: true, viewer, supabase: await createSupabaseServerClient() };
}

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
