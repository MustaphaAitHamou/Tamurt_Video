"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminContext, uuidPattern } from "@/server/admin/guard";
import { logAudit } from "@/server/audit";
import { sendDirectEmail } from "@/server/email/dispatcher";
import { failure, failureFromDb, fromZodError, success, type ActionResult } from "@/server/errors";
import { generateHqKey } from "@/server/hq/auth";
import { SETTINGS_CACHE_TAG } from "@/server/settings";

const euros = (value: FormDataEntryValue | null) =>
  Math.round(Number(String(value ?? "").replace(",", ".")) * 100);

/** Écrit des paramètres de plateforme (RLS : settings.write) puis invalide le cache. */
async function writeSettings(
  ctx: Extract<Awaited<ReturnType<typeof adminContext>>, { ok: true }>,
  values: Record<string, unknown>,
) {
  for (const [key, value] of Object.entries(values)) {
    const { error } = await ctx.supabase
      .from("platform_settings")
      .update({ value: value as never, updated_by: ctx.viewer.user.id })
      .eq("key", key);
    if (error) return failureFromDb(error);
  }
  updateTag(SETTINGS_CACHE_TAG);
  return null;
}

// --- Finances ---------------------------------------------------------------------

const CATEGORIES = [
  "subscription_revenue",
  "ad_revenue",
  "other_revenue",
  "payment_fees",
  "hosting",
  "streaming",
  "storage",
  "email",
  "tools",
  "content_licenses",
  "other_cost",
] as const;

export async function addFinanceEntryAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await adminContext("finance.write");
  if (!ctx.ok) return ctx.result;
  const parsed = z
    .object({
      period_month: z.string().regex(/^\d{4}-\d{2}$/, "Mois attendu"),
      category: z.enum(CATEGORIES),
      description: z.string().trim().max(300).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const amount = euros(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000)
    return failure("Montant invalide (en euros, positif).", "VALIDATION", {
      amount: ["Montant invalide"],
    });
  const { error } = await ctx.supabase.from("finance_entries").insert({
    period_month: `${parsed.data.period_month}-01`,
    category: parsed.data.category,
    amount_cents: amount,
    currency: "EUR",
    description: parsed.data.description || null,
    source: "manual",
    created_by: ctx.viewer.user.id,
  });
  if (error) return failureFromDb(error);
  revalidatePath("/admin/finances");
  return success(undefined, "Écriture ajoutée.");
}

export async function deleteFinanceEntryAction(entryId: string): Promise<ActionResult> {
  const ctx = await adminContext("finance.write");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase.from("finance_entries").delete().eq("id", entryId);
  if (error) return failureFromDb(error);
  revalidatePath("/admin/finances");
  return success(undefined, "Écriture supprimée.");
}

/** Hypothèses de coûts utilisées par les estimations (tarifs fournisseurs à vérifier régulièrement). */
export async function updateCostSettingsAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await adminContext("settings.write");
  if (!ctx.ok) return ctx.result;
  const num = (name: string, min: number, max: number) => {
    const value = Number(String(formData.get(name) ?? "").replace(",", "."));
    return Number.isFinite(value) && value >= min && value <= max ? value : null;
  };
  const delivered = num("delivered", 0, 1000);
  const stored = num("stored", 0, 1000);
  const rate = num("usd_eur", 0.1, 10);
  const percent = num("fee_percent", 0, 20);
  const fixed = num("fee_fixed", 0, 500);
  if ([delivered, stored, rate, percent, fixed].some((v) => v === null))
    return failure("Valeurs numériques invalides.", "VALIDATION");
  const fixedCosts: Record<string, number> = {};
  for (const key of ["hosting", "database", "email", "domain", "other"]) {
    const cents = euros(formData.get(`fixed_${key}`));
    if (Number.isFinite(cents) && cents > 0) fixedCosts[key] = cents;
  }
  const error = await writeSettings(ctx, {
    cost_stream_delivered_usd_per_1000_min: delivered,
    cost_stream_stored_usd_per_1000_min: stored,
    usd_to_eur_rate: rate,
    payment_fee_percent: percent,
    payment_fee_fixed_cents: Math.round(fixed ?? 0),
    fixed_monthly_costs_cents: fixedCosts,
  });
  if (error) return error;
  revalidatePath("/admin/finances");
  return success(undefined, "Hypothèses de coûts enregistrées.");
}

// --- Publicité ----------------------------------------------------------------------

export async function setAdsEnabledAction(enabled: boolean): Promise<ActionResult> {
  const ctx = await adminContext("ads.manage");
  if (!ctx.ok) return ctx.result;
  // L'interrupteur général est un paramètre de plateforme : écrit après contrôle « ads.manage ».
  const { error } = await createSupabaseAdminClient()
    .from("platform_settings")
    .update({ value: enabled, updated_by: ctx.viewer.user.id })
    .eq("key", "ads_enabled");
  if (error) return failureFromDb(error);
  updateTag(SETTINGS_CACHE_TAG);
  await logAudit({
    actorId: ctx.viewer.user.id,
    action: enabled ? "ads.enabled" : "ads.disabled",
    entityType: "platform_settings",
    entityId: "ads_enabled",
  });
  revalidatePath("/admin/publicite");
  revalidatePath("/", "layout");
  return success(
    undefined,
    enabled
      ? "Publicité activée (abonnés payants toujours exclus)."
      : "Publicité désactivée partout.",
  );
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function updateAdSlotAction(
  slotId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await adminContext("ads.manage");
  if (!ctx.ok) return ctx.result;
  const parsed = z
    .object({
      audience: z.enum(["visitors", "non_paying"]),
      href: z
        .string()
        .trim()
        .optional()
        .refine(
          (v) => !v || /^\/[^/]/.test(v) || v.startsWith("https://"),
          "Lien interne ou https://",
        ),
      alt: z.string().trim().max(160).optional(),
      label: z.string().trim().max(40).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { data: slot } = await ctx.supabase
    .from("ad_slots")
    .select("config")
    .eq("id", slotId)
    .maybeSingle();
  if (!slot) return failure("Emplacement introuvable.", "NOT_FOUND");
  const config: Record<string, unknown> = {
    ...((slot.config ?? {}) as Record<string, unknown>),
    href: parsed.data.href || null,
    alt: parsed.data.alt || null,
    label: parsed.data.label || "Annonce",
  };
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (!IMAGE_TYPES.has(file.type) || file.size > 3_900_000)
      return failure("Image JPEG, PNG, WebP ou AVIF de moins de 4 Mo.", "VALIDATION");
    const path = `ads/${slotId}-${Date.now()}.${file.type.split("/")[1]}`;
    const { error } = await ctx.supabase.storage
      .from("media-public")
      .upload(path, file, { contentType: file.type });
    if (error) return failure(`Envoi impossible : ${error.message}`, "STORAGE");
    config.image_path = path;
  }
  const enabled = formData.get("is_enabled") === "on";
  if (enabled && (!config.image_path || !config.href))
    return failure("Un emplacement actif nécessite une image et un lien.", "VALIDATION");
  const { error } = await ctx.supabase
    .from("ad_slots")
    .update({
      is_enabled: enabled,
      audience: parsed.data.audience,
      provider: "house",
      config: config as never,
    })
    .eq("id", slotId);
  if (error) return failureFromDb(error);
  revalidatePath("/admin/publicite");
  revalidatePath("/", "layout");
  return success(undefined, "Emplacement enregistré.");
}

// --- Messages --------------------------------------------------------------------------

export async function updateContactMessageAction(
  messageId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await adminContext("messages.read");
  if (!ctx.ok) return ctx.result;
  const status = z.enum(["new", "in_progress", "closed"]).safeParse(formData.get("status"));
  if (!uuidPattern.test(messageId) || !status.success)
    return failure("Requête invalide.", "VALIDATION");
  const reply = String(formData.get("reply") ?? "")
    .trim()
    .slice(0, 5000);
  const { data: message, error } = await ctx.supabase
    .from("contact_messages")
    .update({
      status: status.data,
      handled_by: ctx.viewer.user.id,
      handled_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .select("email, name, subject")
    .single();
  if (error) return failureFromDb(error);
  let note = "";
  if (reply) {
    const result = await sendDirectEmail({
      to: message.email,
      title: `Re : ${message.subject}`,
      body: `Bonjour ${message.name},\n\n${reply}`,
    });
    note = result === "failed" ? " La réponse n'a pas pu être envoyée." : " Réponse envoyée.";
    await logAudit({
      actorId: ctx.viewer.user.id,
      action: "contact.replied",
      entityType: "contact_message",
      entityId: messageId,
    });
  }
  revalidatePath("/admin/messages");
  return success(undefined, `Message mis à jour.${note}`);
}

// --- Tamurt HQ ---------------------------------------------------------------------------

/** Crée une clé d'API pour Tamurt HQ. La clé n'est affichée qu'une fois ; seule son empreinte est stockée. */
export async function createHqKeyAction(
  _prev: ActionResult<{ key: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ key: string }>> {
  const ctx = await adminContext("hq.manage");
  if (!ctx.ok) return ctx.result;
  const name = String(formData.get("name") ?? "").trim();
  const days = Number(formData.get("days") ?? 365);
  if (name.length < 2 || name.length > 80)
    return failure("Nom de 2 à 80 caractères.", "VALIDATION");
  if (!Number.isInteger(days) || days < 1 || days > 730)
    return failure("Durée de validité : 1 à 730 jours.", "VALIDATION");
  const { secret: key, hash, prefix } = generateHqKey();
  const { error } = await createSupabaseAdminClient()
    .from("hq_api_keys")
    .insert({
      name,
      key_hash: hash,
      key_prefix: prefix,
      scopes: ["metrics:read"],
      expires_at: new Date(Date.now() + days * 86_400_000).toISOString(),
      created_by: ctx.viewer.user.id,
    });
  if (error) return failureFromDb(error);
  await logAudit({
    actorId: ctx.viewer.user.id,
    action: "hq.key_created",
    entityType: "hq_api_key",
    metadata: { name, prefix },
  });
  revalidatePath("/admin/hq");
  return success({ key }, "Clé créée : copiez-la maintenant, elle ne sera plus affichée.");
}

export async function revokeHqKeyAction(keyId: string): Promise<ActionResult> {
  const ctx = await adminContext("hq.manage");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase
    .from("hq_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .is("revoked_at", null);
  if (error) return failureFromDb(error);
  await logAudit({
    actorId: ctx.viewer.user.id,
    action: "hq.key_revoked",
    entityType: "hq_api_key",
    entityId: keyId,
  });
  revalidatePath("/admin/hq");
  return success(undefined, "Clé révoquée.");
}

// --- Paramètres ----------------------------------------------------------------------------

const settingsSchema = z.object({
  grace_period_days: z.coerce.number().int().min(0).max(30),
  eur_to_dzd_rate: z.coerce.number().min(1).max(10000),
  premium_requests_per_month: z.coerce.number().int().min(0).max(100),
  stream_heartbeat_timeout_seconds: z.coerce.number().int().min(30).max(600),
  license_alert_days: z.string().regex(/^\s*\d{1,3}(\s*,\s*\d{1,3})*\s*$/, "Ex. : 30, 7, 1"),
  support_email: z.email(),
});

export async function updatePlatformSettingsAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await adminContext("settings.write");
  if (!ctx.ok) return ctx.result;
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { data: current } = await ctx.supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "eur_to_dzd_rate")
    .maybeSingle();
  const rateChanged = Number(current?.value) !== parsed.data.eur_to_dzd_rate;
  const alertDays = [
    ...new Set(
      parsed.data.license_alert_days
        .split(",")
        .map((d) => Number(d.trim()))
        .filter((d) => d > 0),
    ),
  ].sort((a, b) => b - a);
  const error = await writeSettings(ctx, {
    founder_signups_open: formData.get("founder_signups_open") === "on",
    grace_period_days: parsed.data.grace_period_days,
    dzd_display_enabled: formData.get("dzd_display_enabled") === "on",
    eur_to_dzd_rate: parsed.data.eur_to_dzd_rate,
    ...(rateChanged ? { eur_to_dzd_rate_updated_at: new Date().toISOString().slice(0, 10) } : {}),
    admin_mfa_required: formData.get("admin_mfa_required") === "on",
    hide_unlicensed_titles: formData.get("hide_unlicensed_titles") === "on",
    show_demo_content: formData.get("show_demo_content") === "on",
    maintenance_mode: formData.get("maintenance_mode") === "on",
    premium_requests_per_month: parsed.data.premium_requests_per_month,
    stream_heartbeat_timeout_seconds: parsed.data.stream_heartbeat_timeout_seconds,
    license_alert_days: alertDays,
    support_email: parsed.data.support_email,
  });
  if (error) return error;
  revalidatePath("/", "layout");
  return success(undefined, "Paramètres enregistrés.");
}

export async function updateLegalEntityAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await adminContext("settings.write");
  if (!ctx.ok) return ctx.result;
  const fields = [
    "name",
    "form",
    "address",
    "registration",
    "vat",
    "publication_director",
    "host",
  ] as const;
  const entity: Record<string, string> = {};
  for (const field of fields) {
    const value = String(formData.get(field) ?? "")
      .trim()
      .slice(0, 300);
    entity[field] = value || "À compléter";
  }
  const error = await writeSettings(ctx, { legal_entity: entity });
  if (error) return error;
  revalidatePath("/", "layout");
  return success(
    undefined,
    "Informations légales enregistrées. Elles alimentent les pages légales (brouillons à faire valider).",
  );
}

/**
 * Passage en phase commerciale (ou retour en phase fondateur). Les fondateurs
 * actifs accèdent alors au catalogue Standard à leur tarif, sans hausse.
 */
export async function setLaunchPhaseAction(
  phase: "founder" | "commercial",
  confirmation?: string,
): Promise<ActionResult> {
  const ctx = await adminContext("settings.write");
  if (!ctx.ok) return ctx.result;
  if (phase === "commercial" && confirmation?.trim().toUpperCase() !== "LANCEMENT")
    return failure("Saisissez LANCEMENT pour confirmer.", "CONFIRMATION_REQUIRED");
  const error = await writeSettings(ctx, { launch_phase: phase });
  if (error) return error;
  await logAudit({
    actorId: ctx.viewer.user.id,
    action: "platform.launch_phase_changed",
    entityType: "platform_settings",
    entityId: "launch_phase",
    metadata: { phase },
  });
  revalidatePath("/", "layout");
  return success(
    undefined,
    phase === "commercial" ? "Phase commerciale activée." : "Retour en phase fondateur.",
  );
}

// --- Incidents --------------------------------------------------------------------------------

export async function saveIncidentAction(
  incidentId: string | null,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await adminContext("settings.write");
  if (!ctx.ok) return ctx.result;
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(160),
      description: z.string().trim().max(4000).optional(),
      component: z.enum(["platform", "streaming", "payments", "auth", "email", "database"]),
      severity: z.enum(["minor", "major", "critical"]),
      status: z.enum(["open", "monitoring", "resolved"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const values = {
    ...parsed.data,
    description: parsed.data.description || null,
    resolved_at: parsed.data.status === "resolved" ? new Date().toISOString() : null,
  };
  const { error } = incidentId
    ? await ctx.supabase.from("incidents").update(values).eq("id", incidentId)
    : await ctx.supabase.from("incidents").insert({ ...values, created_by: ctx.viewer.user.id });
  if (error) return failureFromDb(error);
  revalidatePath("/admin/parametres");
  revalidatePath("/admin");
  return success(undefined, incidentId ? "Incident mis à jour." : "Incident déclaré.");
}
