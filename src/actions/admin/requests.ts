"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { adminContext, uuidPattern } from "@/server/admin/guard";
import { dispatchPendingEmails } from "@/server/email/dispatcher";
import { failure, failureFromDb, fromZodError, success, type ActionResult } from "@/server/errors";

const STATUSES = ["received", "under_review", "rights_search", "negotiation", "acquisition_confirmed", "publication_planned", "available", "rejected", "impossible"] as const;
const ACQUISITION = new Set(["acquisition_confirmed", "publication_planned", "available"]);

function refresh(requestId: string) {
  revalidatePath("/admin/demandes");
  revalidatePath(`/admin/demandes/${requestId}`);
  revalidatePath(`/demandes/${requestId}`);
  revalidatePath("/demandes");
}

/**
 * Change le statut d'une demande. La base vérifie l'habilitation (une acquisition
 * ne peut être confirmée que par l'équipe des droits) et notifie les votants.
 */
export async function setRequestStatusAction(requestId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      status: z.enum(STATUSES),
      public_note: z.string().trim().max(1000).optional(),
      internal_note: z.string().trim().max(4000).optional(),
      linked_title_id: z.union([z.uuid(), z.literal("")]).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const ctx = await adminContext(ACQUISITION.has(parsed.data.status) ? "requests.confirm_acquisition" : "requests.moderate");
  if (!ctx.ok) return ctx.result;
  if (!uuidPattern.test(requestId)) return failure("Demande invalide.", "VALIDATION");
  const { error } = await ctx.supabase.rpc("set_request_status", {
    p_request: requestId,
    p_status: parsed.data.status,
    p_public_note: parsed.data.public_note ?? "",
    p_internal_note: parsed.data.internal_note ?? "",
    ...(parsed.data.linked_title_id ? { p_linked_title: parsed.data.linked_title_id } : {}),
  });
  if (error) return failureFromDb(error);
  // Envoi immédiat des emails de suivi aux votants (la tâche quotidienne reprend les échecs).
  await dispatchPendingEmails(200).catch((cause) => console.error("[requests] emails", cause));
  refresh(requestId);
  return success(undefined, "Statut mis à jour ; les votants sont notifiés.");
}

export async function moderateRequestAction(requestId: string, hidden: boolean, note?: string): Promise<ActionResult> {
  const ctx = await adminContext("requests.moderate");
  if (!ctx.ok) return ctx.result;
  const { error } = await ctx.supabase.rpc("moderate_content_request", { p_request: requestId, p_hidden: hidden, p_note: note ?? "" });
  if (error) return failureFromDb(error);
  refresh(requestId);
  return success(undefined, hidden ? "Demande masquée du public." : "Demande de nouveau visible.");
}

export async function mergeRequestAction(requestId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await adminContext("requests.moderate");
  if (!ctx.ok) return ctx.result;
  const target = String(formData.get("target") ?? "");
  if (!uuidPattern.test(requestId) || !uuidPattern.test(target)) return failure("Choisissez la demande principale.", "VALIDATION");
  const { error } = await ctx.supabase.rpc("merge_content_requests", { p_duplicate: requestId, p_target: target });
  if (error) return failureFromDb(error);
  refresh(requestId);
  refresh(target);
  return success(undefined, "Doublon fusionné : les votes ont été reportés sur la demande principale.");
}

export async function addRequestNoteAction(requestId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  // Modération ou équipe des droits : l'une ou l'autre habilitation suffit.
  let ctx = await adminContext("requests.moderate");
  if (!ctx.ok) ctx = await adminContext("requests.confirm_acquisition");
  if (!ctx.ok) return ctx.result;
  const note = String(formData.get("note") ?? "").trim();
  if (note.length < 2 || note.length > 4000) return failure("Note vide ou trop longue.", "VALIDATION");
  const { error } = await ctx.supabase.from("content_request_notes").insert({ request_id: requestId, note, author_id: ctx.viewer.user.id });
  if (error) return failureFromDb(error);
  refresh(requestId);
  return success(undefined, "Note interne ajoutée.");
}
