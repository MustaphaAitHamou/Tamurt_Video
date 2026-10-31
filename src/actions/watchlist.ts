"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth/session";
import { failure, failureFromDb, success, type ActionResult } from "@/server/errors";

/** Ajoute ou retire une œuvre de la liste du profil actif. */
export async function toggleWatchlistAction(
  titleId: string,
): Promise<ActionResult<{ inList: boolean }>> {
  const parsed = z.uuid().safeParse(titleId);
  if (!parsed.success) return failure("Œuvre invalide.", "VALIDATION");
  const viewer = await getViewer();
  if (!viewer) return failure("Connexion requise.", "UNAUTHENTICATED");
  const t = await getTranslations("title");
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("watchlist_items")
    .select("title_id")
    .eq("viewer_profile_id", viewer.activeProfile.id)
    .eq("title_id", parsed.data)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("watchlist_items")
      .delete()
      .eq("viewer_profile_id", viewer.activeProfile.id)
      .eq("title_id", parsed.data);
    if (error) return failureFromDb(error);
    revalidatePath("/compte/ma-liste");
    return success({ inList: false }, t("removedFromList"));
  }

  const { error } = await supabase.from("watchlist_items").insert({
    viewer_profile_id: viewer.activeProfile.id,
    account_id: viewer.user.id,
    title_id: parsed.data,
  });
  if (error) return failureFromDb(error);
  revalidatePath("/compte/ma-liste");
  return success({ inList: true }, t("addedToList"));
}
