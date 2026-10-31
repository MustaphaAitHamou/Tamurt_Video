"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/server/auth/session";
import { failure, fromZodError, success, type ActionResult } from "@/server/errors";
import { getClientIp, hashIp } from "@/server/http";
import { sendDirectEmail } from "@/server/email/dispatcher";
import { rateLimit } from "@/server/rate-limit";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  category: z.enum(["general", "support", "billing", "rights", "press", "partnership", "privacy"]),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(0).optional(),
});

export async function submitContactAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const t = await getTranslations("contact");
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const ipHash = hashIp(await getClientIp());
  const limit = await rateLimit(`contact:${ipHash ?? "unknown"}`, 5, 3600);
  if (!limit.allowed) return failure("Trop de messages envoyés. Réessayez plus tard.", "RATE_LIMITED");
  const user = await getSessionUser();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("contact_messages").insert({
    user_id: user?.id ?? null,
    name: parsed.data.name,
    email: parsed.data.email,
    category: parsed.data.category,
    subject: parsed.data.subject,
    message: parsed.data.message,
    ip_hash: ipHash ?? null,
  });
  if (error) return failure("Envoi impossible. Réessayez plus tard.", "STORAGE");
  await admin.rpc("notify_staff", {
    p_permission: "messages.read",
    p_type: "staff.contact_message",
    p_title: `Nouveau message : ${parsed.data.subject.slice(0, 80)}`,
    p_body: `Catégorie : ${parsed.data.category}`,
    p_link: "/admin/messages",
  });
  return success(undefined, t("sent"));
}

const claimSchema = z.object({
  claimantName: z.string().trim().min(1).max(200),
  claimantEmail: z.string().trim().toLowerCase().pipe(z.email()),
  organization: z.string().trim().max(200).optional(),
  titleReference: z.string().trim().min(1).max(300),
  claimType: z.enum(["copyright", "trademark", "privacy", "defamation", "other"]),
  description: z.string().trim().min(10).max(5000),
  sworn: z.literal("on"),
  website: z.string().max(0).optional(),
});

/** Signalement d'un contenu : transmis immédiatement à l'équipe chargée des droits. */
export async function submitClaimAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const t = await getTranslations("report");
  const parsed = claimSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error, "Vérifiez les champs obligatoires et la déclaration sur l'honneur.");
  const ipHash = hashIp(await getClientIp());
  const limit = await rateLimit(`claim:${ipHash ?? "unknown"}`, 5, 3600);
  if (!limit.allowed) return failure("Trop de signalements envoyés. Réessayez plus tard.", "RATE_LIMITED");

  const admin = createSupabaseAdminClient();
  const slugMatch = parsed.data.titleReference.match(/\/titre\/([a-z0-9-]+)/);
  let titleId: string | null = null;
  if (slugMatch?.[1]) {
    const { data } = await admin.from("titles").select("id").eq("slug", slugMatch[1]).maybeSingle();
    titleId = data?.id ?? null;
  }
  const { error } = await admin.from("content_claims").insert({
    title_id: titleId,
    title_reference: parsed.data.titleReference,
    claimant_name: parsed.data.claimantName,
    claimant_email: parsed.data.claimantEmail,
    claimant_organization: parsed.data.organization || null,
    claim_type: parsed.data.claimType,
    description: parsed.data.description,
    sworn_statement: true,
    ip_hash: ipHash ?? null,
  });
  if (error) return failure("Envoi impossible. Écrivez-nous via le formulaire de contact.", "STORAGE");
  await sendDirectEmail({
    to: parsed.data.claimantEmail,
    title: "Nous avons bien reçu votre signalement",
    body: `Bonjour ${parsed.data.claimantName},\n\nVotre signalement concernant « ${parsed.data.titleReference.slice(0, 200)} » a été transmis à l'équipe chargée des droits. Il est examiné dans les meilleurs délais ; en cas d'atteinte manifeste, le contenu est retiré sans attendre la fin de l'examen.\n\nVous serez informé·e par email des suites données.`,
  }).catch((cause) => console.error("[email] accusé de réception", cause));
  await admin.rpc("notify_staff", {
    p_permission: "takedown.execute",
    p_type: "staff.content_claim",
    p_title: `Signalement de contenu (${parsed.data.claimType})`,
    p_body: parsed.data.titleReference.slice(0, 200),
    p_link: "/admin/droits/reclamations",
  });
  return success(undefined, t("sent"));
}
