"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminContext, uuidPattern } from "@/server/admin/guard";
import { logAudit } from "@/server/audit";
import { sendDirectEmail } from "@/server/email/dispatcher";
import { failure, failureFromDb, fromZodError, success, type ActionResult } from "@/server/errors";

const LICENSE_TYPES = ["owned_production", "exclusive_license", "non_exclusive_license", "public_domain_verified", "open_license", "promotional"] as const;
const PERPETUAL_TYPES = new Set(["owned_production", "public_domain_verified", "open_license"]);
const MODES = ["svod", "avod", "free", "trailer", "promo"] as const;
const SUPPORTS = ["web", "mobile_app", "tv_app", "download"] as const;

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

const licenseSchema = z
  .object({
    title_id: z.uuid(),
    rights_holder_id: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
    license_type: z.enum(LICENSE_TYPES),
    status: z.enum(["draft", "pending_signature", "signed", "suspended", "terminated"]),
    starts_at: z.string().min(1, "Date de début requise"),
    ends_at: z.string().optional(),
    max_quality: z.union([z.enum(["sd", "hd", "fhd", "uhd"]), z.literal("")]).transform((v) => v || null),
    contract_reference: optionalText(120),
    fee_terms: optionalText(2000),
    restrictions: optionalText(2000),
    notes: optionalText(4000),
  })
  .superRefine((value, ctx) => {
    if (Number.isNaN(Date.parse(value.starts_at))) ctx.addIssue({ code: "custom", path: ["starts_at"], message: "Date invalide" });
    if (value.ends_at && Number.isNaN(Date.parse(value.ends_at))) ctx.addIssue({ code: "custom", path: ["ends_at"], message: "Date invalide" });
    if (value.ends_at && Date.parse(value.ends_at) <= Date.parse(value.starts_at)) ctx.addIssue({ code: "custom", path: ["ends_at"], message: "La fin doit suivre le début" });
    if (!value.ends_at && !PERPETUAL_TYPES.has(value.license_type)) {
      ctx.addIssue({ code: "custom", path: ["ends_at"], message: "Une licence concédée doit avoir une date de fin" });
    }
  });

const countryList = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split(/[\s,;]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

/** Les dates saisies sont des jours calendaires : début à 00:00 et fin à 23:59:59 (heure de Paris approximée en UTC). */
function toTimestamp(date: string, endOfDay: boolean) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T${endOfDay ? "23:59:59" : "00:00:00"}Z` : new Date(date).toISOString();
}

/** Crée ou met à jour une licence et ses territoires ; la dépublication automatique s'applique aussitôt. */
export async function saveLicenseAction(licenseId: string | null, _prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const ctx = await adminContext("rights.write");
  if (!ctx.ok) return ctx.result;
  if (licenseId && !uuidPattern.test(licenseId)) return failure("Licence invalide.", "VALIDATION");
  const parsed = licenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const modes = formData.getAll("modes").map(String).filter((m): m is (typeof MODES)[number] => (MODES as readonly string[]).includes(m));
  const supports = formData.getAll("supports").map(String).filter((s): s is (typeof SUPPORTS)[number] => (SUPPORTS as readonly string[]).includes(s));
  if (modes.length === 0) return failure("Sélectionnez au moins un mode d'exploitation.", "VALIDATION", { modes: ["Requis"] });
  if (supports.length === 0) return failure("Sélectionnez au moins un support.", "VALIDATION", { supports: ["Requis"] });
  const territories = countryList(formData.get("territories"));
  const excluded = countryList(formData.get("excluded"));
  if (territories.length === 0) return failure("Indiquez au moins un territoire (WW pour le monde entier).", "VALIDATION", { territories: ["Requis"] });
  if ([...territories, ...excluded].some((c) => !/^([A-Z]{2}|WW)$/.test(c)) || excluded.includes("WW")) {
    return failure("Territoires : codes pays ISO à deux lettres, ou WW pour le monde entier.", "VALIDATION", { territories: ["Format invalide"] });
  }
  if (excluded.length && !territories.includes("WW")) return failure("Les exclusions ne s'appliquent qu'à une licence mondiale (WW).", "VALIDATION", { excluded: ["Réservé à WW"] });

  const d = parsed.data;
  const values = {
    title_id: d.title_id,
    rights_holder_id: d.rights_holder_id,
    license_type: d.license_type,
    status: d.status,
    starts_at: toTimestamp(d.starts_at, false),
    ends_at: d.ends_at ? toTimestamp(d.ends_at, true) : null,
    exploitation_modes: modes,
    supports,
    is_exclusive: formData.get("is_exclusive") === "on",
    max_quality: d.max_quality,
    contract_reference: d.contract_reference,
    fee_terms: d.fee_terms,
    restrictions: d.restrictions,
    notes: d.notes,
  };
  const result = licenseId
    ? await ctx.supabase.from("licenses").update(values).eq("id", licenseId).select("id").single()
    : await ctx.supabase.from("licenses").insert({ ...values, created_by: ctx.viewer.user.id }).select("id").single();
  if (result.error) return failureFromDb(result.error);
  const id = result.data.id;

  // Remplacement des territoires.
  const { error: deleteError } = await ctx.supabase.from("license_territories").delete().eq("license_id", id);
  if (deleteError) return failureFromDb(deleteError);
  const rows = [
    ...[...new Set(territories)].map((country_code) => ({ license_id: id, country_code, is_excluded: false })),
    ...[...new Set(excluded)].filter((c) => !territories.includes(c)).map((country_code) => ({ license_id: id, country_code, is_excluded: true })),
  ];
  const { error: territoryError } = await ctx.supabase.from("license_territories").insert(rows);
  if (territoryError) return failureFromDb(territoryError);

  // Filet de sécurité : une œuvre publiée sans licence valide est dépubliée immédiatement.
  const { data: unpublished } = await createSupabaseAdminClient().rpc("unpublish_titles_without_rights");
  revalidatePath("/admin/droits");
  revalidatePath(`/admin/catalogue/${d.title_id}`);
  revalidatePath("/", "layout");
  const note = unpublished?.length ? ` ${unpublished.length} œuvre(s) dépubliée(s) faute de licence valide.` : "";
  return success({ id }, (licenseId ? "Licence mise à jour." : "Licence enregistrée.") + note);
}

/** Marque la licence comme vérifiée (contrôle documentaire effectué par un gestionnaire des droits). */
export async function verifyLicenseAction(licenseId: string): Promise<ActionResult> {
  const ctx = await adminContext("rights.write");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase.from("licenses").update({ verified_at: new Date().toISOString(), verified_by: ctx.viewer.user.id }).eq("id", licenseId);
  if (error) return failureFromDb(error);
  revalidatePath(`/admin/droits/licences/${licenseId}`);
  return success(undefined, "Vérification enregistrée.");
}

// --- Justificatifs (stockage privé) -------------------------------------------

const DOCUMENT_TYPES = ["contract", "amendment", "chain_of_title", "public_domain_proof", "license_text", "correspondence", "other"] as const;
const DOCUMENT_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/** URL d'envoi signée (valable 2 h) : le fichier part directement du navigateur vers le stockage privé. */
export async function createLicenseDocumentUploadAction(input: { licenseId: string; fileName: string; mimeType: string; sizeBytes: number }): Promise<ActionResult<{ signedUrl: string; path: string }>> {
  const ctx = await adminContext("rights.documents");
  if (!ctx.ok) return ctx.result;
  if (!uuidPattern.test(input.licenseId)) return failure("Licence invalide.", "VALIDATION");
  if (!DOCUMENT_MIME.has(input.mimeType)) return failure("Formats acceptés : PDF, JPEG, PNG, Word.", "VALIDATION");
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > 25 * 1024 * 1024) return failure("25 Mo maximum.", "VALIDATION");
  const extension = input.fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
  const path = `${input.licenseId}/${randomUUID()}.${extension}`;
  const { data, error } = await ctx.supabase.storage.from("rights-documents").createSignedUploadUrl(path);
  if (error || !data) return failure("Envoi impossible pour le moment.", "STORAGE");
  return success({ signedUrl: data.signedUrl, path });
}

/** Enregistre le justificatif une fois le fichier effectivement présent dans le stockage. */
export async function registerLicenseDocumentAction(input: { licenseId: string; path: string; fileName: string; mimeType: string; sizeBytes: number; documentType: string }): Promise<ActionResult> {
  const ctx = await adminContext("rights.documents");
  if (!ctx.ok) return ctx.result;
  const documentType = z.enum(DOCUMENT_TYPES).safeParse(input.documentType);
  if (!uuidPattern.test(input.licenseId) || !documentType.success || !input.path.startsWith(`${input.licenseId}/`)) return failure("Requête invalide.", "VALIDATION");
  const folder = input.path.split("/")[0] ?? "";
  const { data: objects } = await ctx.supabase.storage.from("rights-documents").list(folder, { search: input.path.split("/")[1] });
  if (!objects?.length) return failure("Le fichier n'a pas été reçu par le stockage.", "STORAGE");
  const { error } = await ctx.supabase.from("license_documents").insert({
    license_id: input.licenseId,
    document_type: documentType.data,
    storage_path: input.path,
    file_name: input.fileName.slice(0, 200),
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    uploaded_by: ctx.viewer.user.id,
  });
  if (error) return failureFromDb(error);
  revalidatePath(`/admin/droits/licences/${input.licenseId}`);
  return success(undefined, "Justificatif archivé.");
}

/** Lien de consultation temporaire (60 s), chaque accès étant journalisé. */
export async function getLicenseDocumentUrlAction(documentId: string): Promise<ActionResult<{ url: string }>> {
  const ctx = await adminContext("rights.documents");
  if (!ctx.ok) return ctx.result;
  if (!uuidPattern.test(documentId)) return failure("Document invalide.", "VALIDATION");
  const { data: document } = await ctx.supabase.from("license_documents").select("storage_path, file_name, license_id").eq("id", documentId).maybeSingle();
  if (!document) return failure("Document introuvable.", "NOT_FOUND");
  const { data, error } = await ctx.supabase.storage.from("rights-documents").createSignedUrl(document.storage_path, 60, { download: document.file_name });
  if (error || !data) return failure("Lien indisponible.", "STORAGE");
  await logAudit({ actorId: ctx.viewer.user.id, action: "rights.document_accessed", entityType: "license_document", entityId: documentId, metadata: { license_id: document.license_id } });
  return success({ url: data.signedUrl });
}

export async function deleteLicenseDocumentAction(documentId: string, licenseId: string): Promise<ActionResult> {
  const ctx = await adminContext("rights.documents");
  if (!ctx.ok) return ctx.result;
  const { data: document } = await ctx.supabase.from("license_documents").select("storage_path").eq("id", documentId).maybeSingle();
  if (!document) return failure("Document introuvable.", "NOT_FOUND");
  await ctx.supabase.storage.from("rights-documents").remove([document.storage_path]);
  const { error } = await ctx.supabase.from("license_documents").delete().eq("id", documentId);
  if (error) return failureFromDb(error);
  revalidatePath(`/admin/droits/licences/${licenseId}`);
  return success(undefined, "Justificatif supprimé.");
}

// --- Ayants droit ---------------------------------------------------------------

const holderSchema = z.object({
  name: z.string().trim().min(1).max(200),
  legal_name: optionalText(200),
  kind: z.enum(["producer", "distributor", "broadcaster", "author", "estate", "institution", "other"]),
  contact_name: optionalText(160),
  contact_email: z.union([z.email(), z.literal("")]).transform((v) => v || null),
  contact_phone: optionalText(40),
  country_code: z.union([z.string().regex(/^[A-Za-z]{2}$/), z.literal("")]).transform((v) => (v ? v.toUpperCase() : null)),
  address: optionalText(500),
  notes: optionalText(4000),
});

export async function saveRightsHolderAction(holderId: string | null, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await adminContext("rights.write");
  if (!ctx.ok) return ctx.result;
  const parsed = holderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { error } = holderId
    ? await ctx.supabase.from("rights_holders").update(parsed.data).eq("id", holderId)
    : await ctx.supabase.from("rights_holders").insert({ ...parsed.data, created_by: ctx.viewer.user.id });
  if (error) return failureFromDb(error);
  revalidatePath("/admin/droits/ayants-droit");
  return success(undefined, holderId ? "Ayant droit mis à jour." : "Ayant droit ajouté.");
}

// --- Réclamations ---------------------------------------------------------------

const CLAIM_STATUS_MESSAGES: Record<string, string> = {
  reviewing: "Votre signalement est en cours d'examen par notre équipe chargée des droits.",
  content_disabled: "Le contenu signalé a été retiré de la plateforme à titre conservatoire, le temps d'achever l'examen.",
  rejected: "Après examen, nous n'avons pas donné suite à votre signalement.",
  resolved: "Votre signalement a été traité.",
};

export async function updateClaimAction(claimId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await adminContext("takedown.execute");
  if (!ctx.ok) return ctx.result;
  const parsed = z
    .object({
      status: z.enum(["received", "reviewing", "content_disabled", "rejected", "resolved"]),
      action_taken: optionalText(4000),
      title_id: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
      message: optionalText(3000),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const closing = parsed.data.status === "resolved" || parsed.data.status === "rejected";
  const { data: claim, error } = await ctx.supabase
    .from("content_claims")
    .update({
      status: parsed.data.status,
      action_taken: parsed.data.action_taken,
      title_id: parsed.data.title_id,
      handled_by: ctx.viewer.user.id,
      resolved_at: closing ? new Date().toISOString() : null,
    })
    .eq("id", claimId)
    .select("claimant_email, claimant_name, title_reference")
    .single();
  if (error) return failureFromDb(error);
  let note = "";
  if (formData.get("notify") === "on") {
    const status = await sendDirectEmail({
      to: claim.claimant_email,
      title: "Suite donnée à votre signalement",
      body: [
        `Bonjour ${claim.claimant_name},`,
        `Signalement concernant : ${claim.title_reference ?? "contenu Tamurt Vidéo"}.`,
        CLAIM_STATUS_MESSAGES[parsed.data.status] ?? "Le statut de votre signalement a évolué.",
        parsed.data.message ?? "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    note = status === "failed" ? " L'email n'a pas pu être envoyé." : " Le déclarant a été informé.";
  }
  revalidatePath("/admin/droits/reclamations");
  revalidatePath(`/admin/droits/reclamations/${claimId}`);
  return success(undefined, `Réclamation mise à jour.${note}`);
}

/** Retrait immédiat lié à une réclamation (le statut de la réclamation est mis à jour par la base). */
export async function takedownForClaimAction(claimId: string, titleId: string, reason?: string): Promise<ActionResult> {
  const ctx = await adminContext("takedown.execute");
  if (!ctx.ok) return ctx.result;
  if (!uuidPattern.test(claimId) || !uuidPattern.test(titleId)) return failure("Requête invalide.", "VALIDATION");
  const { error } = await ctx.supabase.rpc("takedown_title", { p_title: titleId, p_reason: reason ?? "", p_claim: claimId });
  if (error) return failureFromDb(error);
  revalidatePath(`/admin/droits/reclamations/${claimId}`);
  revalidatePath("/", "layout");
  return success(undefined, "Contenu retiré : la lecture est bloquée immédiatement.");
}
