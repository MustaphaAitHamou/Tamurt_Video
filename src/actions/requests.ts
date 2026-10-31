"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth/session";
import {
  dbErrorCode,
  failure,
  failureFromDb,
  fromZodError,
  success,
  type ActionResult,
} from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";

const requestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  releaseYear: z.union([z.literal(""), z.coerce.number().int().min(1888).max(2100)]),
  country: z.string().trim().max(80).optional(),
  director: z.string().trim().max(160).optional(),
  contentType: z.enum(["film", "series", "documentary", "short", "show", "other"]),
  comment: z.string().trim().max(2000).optional(),
  infoUrl: z.union([z.literal(""), z.url({ protocol: /^https?$/ }).max(500)]),
  confirmed: z.string().optional(),
});

export type SimilarRequest = {
  id: string;
  title: string;
  releaseYear: number | null;
  votes: number;
  status: string;
};
export type CreateRequestResult = ActionResult<{ id?: string; similar?: SimilarRequest[] }>;

/** Nouvelle demande (Premium). Les doublons approchants sont proposés avant envoi. */
export async function createRequestAction(
  _prev: CreateRequestResult | null,
  formData: FormData,
): Promise<CreateRequestResult> {
  const t = await getTranslations("requests");
  const viewer = await getViewer();
  if (!viewer) return failure("Connexion requise.", "UNAUTHENTICATED");
  if (viewer.entitlements.tier !== "premium") return failure(t("premiumOnly"), "PREMIUM_REQUIRED");

  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const limit = await rateLimit(`request:${viewer.user.id}`, 20, 3600);
  if (!limit.allowed) return failure("Trop de demandes en peu de temps.", "RATE_LIMITED");

  const supabase = await createSupabaseServerClient();
  const year = parsed.data.releaseYear === "" ? null : parsed.data.releaseYear;

  if (parsed.data.confirmed !== "1") {
    const { data: similar } = await supabase.rpc("find_similar_requests", {
      p_title: parsed.data.title,
      ...(year ? { p_year: year } : {}),
    });
    if (similar?.length) {
      return success(
        {
          similar: similar.map((s) => ({
            id: s.id,
            title: s.title,
            releaseYear: s.release_year,
            votes: s.vote_count,
            status: s.status,
          })),
        },
        t("similarFound"),
      );
    }
  }

  const { data, error } = await supabase
    .from("content_requests")
    .insert({
      user_id: viewer.user.id,
      title: parsed.data.title,
      release_year: year,
      country: parsed.data.country || null,
      director: parsed.data.director || null,
      content_type: parsed.data.contentType,
      comment: parsed.data.comment || null,
      info_url: parsed.data.infoUrl || null,
    })
    .select("id")
    .single();
  if (error) {
    if (dbErrorCode(error) === "DUPLICATE_REQUEST" && error.details) {
      return {
        ok: false,
        error: t("similarFound"),
        code: "DUPLICATE_REQUEST",
        fieldErrors: { existing: [error.details] },
      };
    }
    return failureFromDb(error);
  }
  revalidatePath("/demandes");
  return success({ id: data.id }, t("submitted"));
}

export async function toggleVoteAction(
  requestId: string,
): Promise<ActionResult<{ voted: boolean }>> {
  if (!/^[0-9a-f-]{36}$/.test(requestId)) return failure("Demande invalide.", "VALIDATION");
  const t = await getTranslations("requests");
  const viewer = await getViewer();
  if (!viewer) return failure("Connexion requise.", "UNAUTHENTICATED");
  if (viewer.entitlements.tier !== "premium") return failure(t("premiumOnly"), "PREMIUM_REQUIRED");
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("content_request_votes")
    .select("request_id")
    .eq("request_id", requestId)
    .eq("user_id", viewer.user.id)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("content_request_votes")
      .delete()
      .eq("request_id", requestId)
      .eq("user_id", viewer.user.id);
    if (error) return failureFromDb(error);
    revalidatePath("/demandes");
    return success({ voted: false });
  }
  const { error } = await supabase
    .from("content_request_votes")
    .insert({ request_id: requestId, user_id: viewer.user.id });
  if (error) return failureFromDb(error, "Vote impossible pour cette demande.");
  revalidatePath("/demandes");
  return success({ voted: true });
}

export async function withdrawRequestAction(requestId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || !/^[0-9a-f-]{36}$/.test(requestId))
    return failure("Requête invalide.", "VALIDATION");
  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase
    .from("content_requests")
    .delete({ count: "exact" })
    .eq("id", requestId)
    .eq("user_id", viewer.user.id)
    .eq("status", "received");
  if (error) return failureFromDb(error);
  if (!count) return failure("Cette demande ne peut plus être retirée.", "NOT_ALLOWED");
  revalidatePath("/demandes");
  return success(undefined);
}
