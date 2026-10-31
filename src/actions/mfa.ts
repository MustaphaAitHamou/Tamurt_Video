"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { safeNextPath } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/server/auth/session";
import { logAudit } from "@/server/audit";
import { failure, success, type ActionResult } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";

const codeSchema = z.string().regex(/^\d{6}$/);

export type MfaEnrollment = { factorId: string; qrCode: string; secret: string };

/** Démarre l'inscription d'une application d'authentification (TOTP). */
export async function startMfaEnrollmentAction(): Promise<ActionResult<MfaEnrollment>> {
  const user = await getSessionUser();
  if (!user) return failure("Connexion requise.", "UNAUTHENTICATED");
  const supabase = await createSupabaseServerClient();
  // Nettoie les facteurs non vérifiés d'une tentative précédente.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Tamurt ${new Date().toISOString().slice(0, 10)}` });
  if (error || !data) return failure("L'inscription de la double authentification a échoué.", error?.code ?? "MFA_ENROLL");
  return success({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
}

/** Vérifie le premier code : active le facteur et élève la session au niveau aal2. */
export async function verifyMfaEnrollmentAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return failure("Connexion requise.", "UNAUTHENTICATED");
  const factorId = z.uuid().safeParse(formData.get("factorId"));
  const code = codeSchema.safeParse(formData.get("code"));
  if (!factorId.success || !code.success) return failure("Code à 6 chiffres attendu.", "VALIDATION");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factorId.data, code: code.data });
  if (error) return failure("Code invalide ou expiré.", "MFA_INVALID");
  await logAudit({ actorId: user.id, action: "auth.mfa_enabled", entityType: "user", entityId: user.id });
  revalidatePath("/", "layout");
  const next = safeNextPath(formData.get("next"), "");
  if (next) redirect(next);
  return success(undefined, "Double authentification activée.");
}

/** Second facteur demandé à la connexion lorsque l'utilisateur en a activé un. */
export async function verifyMfaLoginAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return failure("Session expirée : reconnectez-vous.", "UNAUTHENTICATED");
  const code = codeSchema.safeParse(formData.get("code"));
  if (!code.success) return failure("Code à 6 chiffres attendu.", "VALIDATION");
  const limit = await rateLimit(`mfa:${user.id}`, 10, 600);
  if (!limit.allowed) return failure("Trop de tentatives. Réessayez dans quelques minutes.", "RATE_LIMITED");
  const supabase = await createSupabaseServerClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp.find((f) => f.status === "verified");
  if (!totp) return failure("Aucun facteur d'authentification actif.", "MFA_NONE");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code: code.data });
  if (error) return failure("Code invalide ou expiré.", "MFA_INVALID");
  await logAudit({ actorId: user.id, action: "auth.mfa_verified", entityType: "user", entityId: user.id });
  redirect(safeNextPath(formData.get("next"), "/"));
}

export async function removeMfaFactorAction(factorId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return failure("Connexion requise.", "UNAUTHENTICATED");
  if (user.aal !== "aal2") return failure("Confirmez d'abord votre identité avec un code.", "AAL2_REQUIRED");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return failure("Suppression impossible.", error.code ?? "MFA_UNENROLL");
  await logAudit({ actorId: user.id, action: "auth.mfa_disabled", entityType: "user", entityId: user.id });
  revalidatePath("/compte/securite");
  return success(undefined, "Double authentification désactivée.");
}
