"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isLocale, localeCookieName } from "@/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/server/auth/session";
import { failure, success, type ActionResult } from "@/server/errors";

const localeSchema = z.string().refine(isLocale);

/** Change la langue de l'interface (cookie, et profil si connecté). */
export async function setLocaleAction(locale: string): Promise<ActionResult> {
  const parsed = localeSchema.safeParse(locale);
  if (!parsed.success) return failure("Langue inconnue.");

  (await cookies()).set(localeCookieName, parsed.data, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  const user = await getSessionUser();
  if (user) {
    const supabase = await createSupabaseServerClient();
    await supabase.from("profiles").update({ preferred_locale: parsed.data }).eq("id", user.id);
  }
  revalidatePath("/", "layout");
  return success(undefined);
}
