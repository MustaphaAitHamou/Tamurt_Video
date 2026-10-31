"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { isLocale, localeCookieName } from "@/i18n/config";
import { getEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser, getViewer, VIEWER_PROFILE_COOKIE } from "@/server/auth/session";
import { logAudit } from "@/server/audit";
import { failure, failureFromDb, fromZodError, success, type ActionResult } from "@/server/errors";
import { getPaymentProvider } from "@/server/payments";
import { rateLimit } from "@/server/rate-limit";

const checkbox = (formData: FormData, name: string) => formData.get(name) === "on";

async function requireUserForAction() {
  const user = await getSessionUser();
  if (!user) return null;
  return user;
}

export async function updateAccountSettingsAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUserForAction();
  if (!user) return failure("Connexion requise.", "UNAUTHENTICATED");
  const parsed = z
    .object({
      displayName: z.string().trim().min(1).max(60),
      countryCode: z.union([z.literal(""), z.string().regex(/^[A-Z]{2}$/)]),
      preferredLocale: z.string().refine(isLocale),
      subtitleLocale: z.union([z.literal(""), z.string().regex(/^[a-z]{2,3}$/)]),
    })
    .safeParse({
      displayName: formData.get("displayName"),
      countryCode: formData.get("countryCode") ?? "",
      preferredLocale: formData.get("preferredLocale"),
      subtitleLocale: formData.get("subtitleLocale") ?? "",
    });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      country_code: parsed.data.countryCode || null,
      preferred_locale: parsed.data.preferredLocale,
      subtitle_locale: parsed.data.subtitleLocale || null,
      autoplay_next: checkbox(formData, "autoplayNext"),
    })
    .eq("id", user.id);
  if (error) return failureFromDb(error);
  (await cookies()).set(localeCookieName, parsed.data.preferredLocale, { path: "/", maxAge: 31536000, sameSite: "lax" });
  revalidatePath("/", "layout");
  const t = await getTranslations("account");
  return success(undefined, t("saved"));
}

export async function updateNotificationPreferencesAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUserForAction();
  if (!user) return failure("Connexion requise.", "UNAUTHENTICATED");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      notification_preferences: {
        email_billing: true,
        email_requests: checkbox(formData, "email_requests"),
        email_catalog: checkbox(formData, "email_catalog"),
        email_news: checkbox(formData, "email_news"),
      },
    })
    .eq("id", user.id);
  if (error) return failureFromDb(error);
  revalidatePath("/compte/notifications");
  const t = await getTranslations("account");
  return success(undefined, t("saved"));
}

export async function updatePrivacyAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUserForAction();
  if (!user) return failure("Connexion requise.", "UNAUTHENTICATED");
  const searchHistory = checkbox(formData, "searchHistoryEnabled");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      marketing_opt_in: checkbox(formData, "marketingOptIn"),
      personalized_recommendations: checkbox(formData, "personalizedRecommendations"),
      search_history_enabled: searchHistory,
    })
    .eq("id", user.id);
  if (error) return failureFromDb(error);
  if (!searchHistory) {
    await supabase.from("search_history").delete().eq("account_id", user.id);
  }
  revalidatePath("/compte/confidentialite");
  const t = await getTranslations("account");
  return success(undefined, t("saved"));
}

export async function changeEmailAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUserForAction();
  if (!user) return failure("Connexion requise.", "UNAUTHENTICATED");
  const email = z.string().trim().toLowerCase().pipe(z.email()).safeParse(formData.get("email"));
  if (!email.success) return failure("Adresse email invalide.", "VALIDATION");
  const limit = await rateLimit(`email-change:${user.id}`, 3, 3600);
  if (!limit.allowed) return failure("Trop de demandes. Réessayez plus tard.", "RATE_LIMITED");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser(
    { email: email.data },
    { emailRedirectTo: `${getEnv().siteUrl}/auth/confirm?next=/compte/profil` },
  );
  if (error) return failure("Le changement d'adresse n'a pas pu être demandé.", error.code ?? "EMAIL_CHANGE");
  await logAudit({ actorId: user.id, action: "account.email_change_requested", entityType: "user", entityId: user.id });
  const t = await getTranslations("account");
  return success(undefined, t("emailChangeSent"));
}

export async function changePasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUserForAction();
  if (!user) return failure("Connexion requise.", "UNAUTHENTICATED");
  const t = await getTranslations("auth");
  const parsed = z
    .object({
      currentPassword: z.string().min(1).max(128),
      password: z.string().min(10).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
      confirmPassword: z.string(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(t("errors.weakPassword"), "WEAK_PASSWORD");
  if (parsed.data.password !== parsed.data.confirmPassword) return failure(t("errors.passwordMismatch"), "PASSWORD_MISMATCH");

  const limit = await rateLimit(`password-change:${user.id}`, 5, 3600);
  if (!limit.allowed) return failure(t("errors.rateLimited"), "RATE_LIMITED");

  // Ré-authentification : le mot de passe actuel doit être correct.
  const supabase = await createSupabaseServerClient();
  const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: parsed.data.currentPassword });
  if (reauthError) return failure(t("errors.invalidCredentials"), "INVALID_CREDENTIALS");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return failure(t("errors.generic"), error.code ?? "UPDATE_FAILED");
  await logAudit({ actorId: user.id, action: "auth.password_changed", entityType: "user", entityId: user.id });
  return success(undefined, t("passwordUpdated"));
}

export async function markNotificationsReadAction(ids?: string[]): Promise<ActionResult> {
  const user = await requireUserForAction();
  if (!user) return failure("Connexion requise.", "UNAUTHENTICATED");
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  if (ids?.length) query = query.in("id", ids.filter((id) => /^[0-9a-f-]{36}$/.test(id)));
  const { error } = await query;
  if (error) return failureFromDb(error);
  revalidatePath("/", "layout");
  return success(undefined);
}

export async function clearWatchHistoryAction(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return failure("Connexion requise.", "UNAUTHENTICATED");
  const supabase = await createSupabaseServerClient();
  await supabase.from("watch_history").delete().eq("viewer_profile_id", viewer.activeProfile.id).not("ended_at", "is", null);
  await supabase.from("watch_progress").delete().eq("viewer_profile_id", viewer.activeProfile.id);
  revalidatePath("/compte/historique");
  revalidatePath("/");
  return success(undefined);
}

export async function removeFromContinueWatchingAction(titleId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || !/^[0-9a-f-]{36}$/.test(titleId)) return failure("Requête invalide.", "VALIDATION");
  const supabase = await createSupabaseServerClient();
  await supabase.from("watch_progress").delete().eq("viewer_profile_id", viewer.activeProfile.id).eq("title_id", titleId);
  revalidatePath("/");
  return success(undefined);
}

const dataRequestSchema = z.object({
  requestType: z.enum(["access", "export", "rectification", "erasure", "restriction", "objection"]),
  details: z.string().trim().max(2000).optional(),
});

/** Demande relative aux données personnelles (RGPD), traitée par l'équipe. */
export async function submitDataRequestAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUserForAction();
  if (!user) return failure("Connexion requise.", "UNAUTHENTICATED");
  const parsed = dataRequestSchema.safeParse({ requestType: formData.get("requestType"), details: formData.get("details") ?? undefined });
  if (!parsed.success) return fromZodError(parsed.error);
  const limit = await rateLimit(`data-request:${user.id}`, 5, 86400);
  if (!limit.allowed) return failure("Trop de demandes aujourd'hui.", "RATE_LIMITED");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("data_requests").insert({
    user_id: user.id,
    request_type: parsed.data.requestType,
    details: parsed.data.details || null,
  });
  if (error) return failureFromDb(error);
  await createSupabaseAdminClient().rpc("notify_staff", {
    p_permission: "users.manage",
    p_type: "staff.data_request",
    p_title: "Nouvelle demande relative aux données personnelles",
    p_body: `Type : ${parsed.data.requestType}. Délai légal de réponse : un mois.`,
    p_link: "/admin/utilisateurs/demandes-rgpd",
  });
  return success(undefined, "Votre demande a été enregistrée. Nous y répondrons dans un délai d'un mois au plus.");
}

/**
 * Suppression définitive du compte : résiliation immédiate de l'abonnement,
 * effacement des données personnelles (cascade en base). Les factures sont
 * conservées sans lien avec le compte (obligations comptables).
 */
export async function deleteAccountAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUserForAction();
  if (!user) return failure("Connexion requise.", "UNAUTHENTICATED");
  const t = await getTranslations("account");
  if (formData.get("confirmation") !== t("deleteConfirmWord")) return failure(t("deleteConfirmLabel"), "CONFIRMATION_REQUIRED");

  const supabase = await createSupabaseServerClient();
  const password = String(formData.get("password") ?? "");
  if (user.provider === "email" || password) {
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password });
    if (reauthError) return failure("Mot de passe incorrect.", "INVALID_CREDENTIALS");
  }

  const admin = createSupabaseAdminClient();
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
  if (roles?.some((r) => r.role === "admin")) {
    const { count } = await admin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) return failure("Vous êtes le dernier administrateur : nommez-en un autre avant de supprimer votre compte.", "LAST_ADMIN");
  }

  const { data: subscriptions } = await admin
    .from("subscriptions")
    .select("provider_subscription_id")
    .eq("user_id", user.id)
    .eq("provider", "stripe")
    .in("status", ["active", "trialing", "past_due", "unpaid", "incomplete"]);
  const provider = getPaymentProvider();
  for (const subscription of subscriptions ?? []) {
    if (!subscription.provider_subscription_id) continue;
    if (!provider) return failure("Résiliation impossible : prestataire de paiement indisponible. Contactez-nous.", "PAYMENTS_DISABLED");
    try {
      await provider.cancelImmediately(subscription.provider_subscription_id);
    } catch (error) {
      console.error("[account] résiliation avant suppression", error);
      return failure("La résiliation de l'abonnement a échoué : le compte n'a pas été supprimé.", "PROVIDER_ERROR");
    }
  }

  await logAudit({ actorId: user.id, action: "account.deleted", entityType: "user", entityId: user.id });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account] suppression", error.message);
    return failure("La suppression a échoué. Contactez-nous.", "DELETE_FAILED");
  }
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(VIEWER_PROFILE_COOKIE);
  redirect("/?compte=supprime");
}
