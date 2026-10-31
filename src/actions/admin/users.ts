"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parisInputToIso } from "@/lib/format";
import { adminContext, uuidPattern } from "@/server/admin/guard";
import { logAudit } from "@/server/audit";
import { notifyUser } from "@/server/email/dispatcher";
import { failure, failureFromDb, fromZodError, success, type ActionResult } from "@/server/errors";

const ROLES = ["admin", "catalog_editor", "rights_manager"] as const;

function refresh(userId: string) {
  revalidatePath("/admin/utilisateurs");
  revalidatePath(`/admin/utilisateurs/${userId}`);
}

/** Attribution ou retrait d'un rôle. La base empêche le retrait du dernier administrateur. */
export async function setUserRoleAction(userId: string, role: string, grant: boolean): Promise<ActionResult> {
  const ctx = await adminContext("users.manage");
  if (!ctx.ok) return ctx.result;
  const parsedRole = z.enum(ROLES).safeParse(role);
  if (!uuidPattern.test(userId) || !parsedRole.success) return failure("Requête invalide.", "VALIDATION");
  const { error } = grant
    ? await ctx.supabase.from("user_roles").insert({ user_id: userId, role: parsedRole.data, granted_by: ctx.viewer.user.id })
    : await ctx.supabase.from("user_roles").delete().eq("user_id", userId).eq("role", parsedRole.data);
  if (error) return failureFromDb(error, error.code === "23505" ? "Ce rôle est déjà attribué." : undefined);
  if (grant) {
    await notifyUser({
      userId,
      type: "account.role_granted",
      title: "Nouveaux droits d'accès à l'administration",
      body: "Un rôle d'administration vous a été attribué. La double authentification peut être exigée pour y accéder.",
      link: "/admin",
      email: true,
    });
  }
  refresh(userId);
  return success(undefined, grant ? "Rôle attribué." : "Rôle retiré.");
}

/**
 * Suspension : bloque la lecture et l'accès au compte (vérifiés côté serveur) et
 * empêche le renouvellement de session côté Supabase Auth.
 */
export async function setSuspensionAction(userId: string, suspend: boolean, reason?: string): Promise<ActionResult> {
  const ctx = await adminContext("users.manage");
  if (!ctx.ok) return ctx.result;
  if (!uuidPattern.test(userId)) return failure("Utilisateur invalide.", "VALIDATION");
  if (suspend && (!reason || reason.trim().length < 3)) return failure("Indiquez le motif de la suspension.", "REASON_REQUIRED");
  const { error } = await ctx.supabase.rpc("admin_set_suspension", { p_user: userId, p_suspended: suspend, p_reason: reason ?? "" });
  if (error) return failureFromDb(error);
  const { error: banError } = await createSupabaseAdminClient().auth.admin.updateUserById(userId, { ban_duration: suspend ? "876000h" : "none" });
  if (banError) console.error("[admin] bannissement auth", banError.message);
  refresh(userId);
  return success(undefined, suspend ? "Compte suspendu." : "Suspension levée.");
}

/** Abonnement offert (partenaires, presse, tests) : sans paiement, avec date de fin obligatoire. */
export async function grantManualSubscriptionAction(userId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await adminContext("billing.manage");
  if (!ctx.ok) return ctx.result;
  const parsed = z
    .object({ plan_id: z.uuid(), until: z.string().min(1), note: z.string().trim().min(3, "Motif requis").max(500) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const until = /^\d{4}-\d{2}-\d{2}$/.test(parsed.data.until) ? parisInputToIso(`${parsed.data.until}T23:59`) : null;
  if (!until) return failure("Date de fin invalide.", "VALIDATION", { until: ["Date invalide"] });
  const { error } = await ctx.supabase.rpc("admin_grant_manual_subscription", { p_user: userId, p_plan: parsed.data.plan_id, p_until: until, p_note: parsed.data.note });
  if (error) return failureFromDb(error);
  refresh(userId);
  return success(undefined, "Accès offert enregistré.");
}

export async function endManualSubscriptionAction(subscriptionId: string, userId: string): Promise<ActionResult> {
  const ctx = await adminContext("billing.manage");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase.rpc("admin_end_manual_subscription", { p_subscription: subscriptionId });
  if (error) return failureFromDb(error);
  refresh(userId);
  return success(undefined, "Accès offert terminé.");
}

/** Traitement d'une demande relative aux données personnelles (accès, rectification, effacement…). */
export async function handleDataRequestAction(requestId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await adminContext("users.manage");
  if (!ctx.ok) return ctx.result;
  const parsed = z
    .object({ status: z.enum(["received", "in_progress", "completed", "rejected"]), response: z.string().trim().max(4000).optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const closing = parsed.data.status === "completed" || parsed.data.status === "rejected";
  const { data, error } = await ctx.supabase
    .from("data_requests")
    .update({
      status: parsed.data.status,
      response: parsed.data.response || null,
      handled_by: ctx.viewer.user.id,
      completed_at: closing ? new Date().toISOString() : null,
    })
    .eq("id", requestId)
    .select("user_id")
    .single();
  if (error) return failureFromDb(error);
  if (closing && data.user_id) {
    await notifyUser({
      userId: data.user_id,
      type: "account.data_request",
      title: parsed.data.status === "completed" ? "Votre demande relative à vos données a été traitée" : "Réponse à votre demande relative à vos données",
      body: parsed.data.response ?? undefined,
      link: "/compte/confidentialite",
      email: true,
    });
  }
  await logAudit({ actorId: ctx.viewer.user.id, action: "privacy.data_request_handled", entityType: "data_request", entityId: requestId, metadata: { status: parsed.data.status } });
  revalidatePath("/admin/utilisateurs/donnees");
  return success(undefined, "Demande mise à jour.");
}
