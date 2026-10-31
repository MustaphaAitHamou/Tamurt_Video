"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { AVATARS } from "@/lib/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer, VIEWER_PROFILE_COOKIE } from "@/server/auth/session";
import { failure, failureFromDb, fromZodError, success, type ActionResult } from "@/server/errors";

const avatarKeys = AVATARS.map((a) => a.key) as [string, ...string[]];

const profileSchema = z.object({
  name: z.string().trim().min(1).max(30),
  avatarKey: z.enum(avatarKeys),
  isKids: z.boolean(),
  maxAgeRating: z
    .union([z.literal(0), z.literal(10), z.literal(12), z.literal(16), z.literal(18)])
    .nullable(),
});

function parseProfileForm(formData: FormData) {
  const isKids = formData.get("isKids") === "on";
  const rawAge = formData.get("maxAgeRating");
  return profileSchema.safeParse({
    name: formData.get("name"),
    avatarKey: formData.get("avatarKey") ?? "ochre",
    isKids,
    maxAgeRating: rawAge === null || rawAge === "" ? (isKids ? 10 : null) : Number(rawAge),
  });
}

/** Active un profil de visionnage (vérifie qu'il appartient au compte). */
export async function switchProfileAction(profileId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return failure("Connexion requise.", "UNAUTHENTICATED");
  const profile = viewer.viewerProfiles.find((p) => p.id === profileId);
  if (!profile) return failure("Profil introuvable.", "NOT_FOUND");
  (await cookies()).set(VIEWER_PROFILE_COOKIE, profile.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  return success(undefined);
}

export async function createProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return failure("Connexion requise.", "UNAUTHENTICATED");
  const parsed = parseProfileForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("viewer_profiles").insert({
    account_id: viewer.user.id,
    name: parsed.data.name,
    avatar_key: parsed.data.avatarKey,
    is_kids: parsed.data.isKids,
    max_age_rating: parsed.data.maxAgeRating,
  });
  if (error) return failureFromDb(error);
  revalidatePath("/profils");
  const t = await getTranslations("account");
  return success(undefined, t("saved"));
}

export async function updateProfileAction(
  profileId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return failure("Connexion requise.", "UNAUTHENTICATED");
  const parsed = parseProfileForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("viewer_profiles")
    .update({
      name: parsed.data.name,
      avatar_key: parsed.data.avatarKey,
      is_kids: parsed.data.isKids,
      max_age_rating: parsed.data.maxAgeRating,
    })
    .eq("id", profileId)
    .eq("account_id", viewer.user.id);
  if (error) return failureFromDb(error);
  revalidatePath("/", "layout");
  const t = await getTranslations("account");
  return success(undefined, t("saved"));
}

export async function deleteProfileAction(profileId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return failure("Connexion requise.", "UNAUTHENTICATED");
  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase
    .from("viewer_profiles")
    .delete({ count: "exact" })
    .eq("id", profileId)
    .eq("account_id", viewer.user.id)
    .eq("is_default", false);
  if (error) return failureFromDb(error);
  if (!count) return failure("Le profil principal ne peut pas être supprimé.", "DEFAULT_PROFILE");
  const cookieStore = await cookies();
  if (cookieStore.get(VIEWER_PROFILE_COOKIE)?.value === profileId)
    cookieStore.delete(VIEWER_PROFILE_COOKIE);
  revalidatePath("/", "layout");
  return success(undefined);
}
