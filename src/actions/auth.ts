"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { getEnv } from "@/lib/env";
import { TERMS_VERSION } from "@/lib/legal";
import { safeNextPath } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser, VIEWER_PROFILE_COOKIE } from "@/server/auth/session";
import { logAudit } from "@/server/audit";
import { failure, success, type ActionResult } from "@/server/errors";
import { getClientIp, hashIp } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

const passwordSchema = z
  .string()
  .min(10)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/);

const emailSchema = z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(254));

async function limitByIp(action: string, limit: number, windowSeconds: number) {
  const ipHash = hashIp(await getClientIp()) ?? "unknown";
  return rateLimit(`${action}:ip:${ipHash}`, limit, windowSeconds);
}

export async function signInAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const t = await getTranslations("auth.errors");
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1).max(128), next: z.string().optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(t("invalidCredentials"), "VALIDATION");

  const [ipLimit, emailLimit] = await Promise.all([
    limitByIp("signin", 20, 600),
    rateLimit(`signin:email:${parsed.data.email}`, 8, 600),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) return failure(t("rateLimited"), "RATE_LIMITED");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") return failure(t("emailNotConfirmed"), "EMAIL_NOT_CONFIRMED");
    return failure(t("invalidCredentials"), "INVALID_CREDENTIALS");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_locale")
    .eq("id", data.user.id)
    .maybeSingle();
  const cookieStore = await cookies();
  if (profile?.preferred_locale) {
    cookieStore.set("NEXT_LOCALE", profile.preferred_locale, { path: "/", maxAge: 31536000, sameSite: "lax" });
  }
  cookieStore.delete(VIEWER_PROFILE_COOKIE);
  await logAudit({ actorId: data.user.id, action: "auth.sign_in", entityType: "user", entityId: data.user.id });

  const next = safeNextPath(parsed.data.next, "/");
  // Double authentification activée : le code est exigé avant d'accéder au site.
  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
    redirect(`/connexion/double-authentification?next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function signUpAction(_prev: ActionResult<{ email: string }> | null, formData: FormData): Promise<ActionResult<{ email: string }>> {
  const t = await getTranslations("auth.errors");
  const raw = Object.fromEntries(formData);
  const parsed = z
    .object({
      displayName: z.string().trim().min(1).max(60),
      email: emailSchema,
      password: passwordSchema,
      confirmPassword: z.string(),
      acceptTerms: z.literal("on"),
      marketingOptIn: z.string().optional(),
      locale: z.enum(["fr", "en", "ar", "kab"]).optional(),
    })
    .safeParse(raw);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.path[0]);
    if (issues.includes("acceptTerms")) return failure(t("termsRequired"), "TERMS_REQUIRED");
    if (issues.includes("password")) return failure(t("weakPassword"), "WEAK_PASSWORD");
    return failure(t("generic"), "VALIDATION");
  }
  if (parsed.data.password !== parsed.data.confirmPassword) {
    return failure(t("passwordMismatch"), "PASSWORD_MISMATCH");
  }

  const limit = await limitByIp("signup", 5, 3600);
  if (!limit.allowed) return failure(t("rateLimited"), "RATE_LIMITED");

  const env = getEnv();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env.siteUrl}/auth/confirm?next=/compte`,
      data: {
        display_name: parsed.data.displayName,
        locale: parsed.data.locale ?? "fr",
        marketing_opt_in: parsed.data.marketingOptIn === "on",
        terms_version: TERMS_VERSION,
      },
    },
  });

  if (error) {
    if (error.code === "weak_password") return failure(t("weakPassword"), "WEAK_PASSWORD");
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return failure(t("rateLimited"), "RATE_LIMITED");
    }
    // Message volontairement générique : ne révèle pas si l'adresse existe déjà.
    console.error("[auth] signUp", error.code, error.message);
    return failure(t("generic"), "SIGNUP_FAILED");
  }

  return success({ email: parsed.data.email });
}

export async function forgotPasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const t = await getTranslations("auth");
  const parsed = emailSchema.safeParse(formData.get("email"));
  // Réponse identique que l'adresse existe ou non.
  if (!parsed.success) return success(undefined, t("resetSent"));

  const [ipLimit, emailLimit] = await Promise.all([
    limitByIp("forgot", 10, 3600),
    rateLimit(`forgot:email:${parsed.data}`, 3, 3600),
  ]);
  if (ipLimit.allowed && emailLimit.allowed) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${getEnv().siteUrl}/auth/confirm?next=/reinitialiser-mot-de-passe`,
    });
    if (error) console.error("[auth] resetPasswordForEmail", error.code, error.message);
  }
  return success(undefined, t("resetSent"));
}

export async function updatePasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const t = await getTranslations("auth");
  const user = await getSessionUser();
  if (!user) return failure(t("linkInvalid"), "UNAUTHENTICATED");

  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return failure(t("errors.weakPassword"), "WEAK_PASSWORD");
  if (formData.get("password") !== formData.get("confirmPassword")) {
    return failure(t("errors.passwordMismatch"), "PASSWORD_MISMATCH");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) {
    if (error.code === "same_password") return failure(t("errors.weakPassword"), "SAME_PASSWORD");
    if (error.code === "reauthentication_needed") return failure(t("linkInvalid"), "REAUTH");
    return failure(t("errors.generic"), error.code ?? "UPDATE_FAILED");
  }
  await logAudit({ actorId: user.id, action: "auth.password_changed", entityType: "user", entityId: user.id });
  return success(undefined, t("passwordUpdated"));
}

export async function googleSignInAction(formData: FormData) {
  const next = safeNextPath(formData.get("next"), "/");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${getEnv().siteUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/connexion?erreur=oauth");
  redirect(data.url);
}

export async function signOutAction(formData?: FormData) {
  const scope = formData?.get("scope");
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser();
  await supabase.auth.signOut({ scope: scope === "global" ? "global" : scope === "others" ? "others" : "local" });
  if (user) {
    await logAudit({ actorId: user.id, action: `auth.sign_out_${typeof scope === "string" ? scope : "local"}`, entityType: "user", entityId: user.id });
  }
  if (scope === "others") {
    revalidatePath("/compte/securite");
    return;
  }
  (await cookies()).delete(VIEWER_PROFILE_COOKIE);
  revalidatePath("/", "layout");
  redirect("/");
}
