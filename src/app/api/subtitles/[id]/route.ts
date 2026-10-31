import { NextResponse, type NextRequest } from "next/server";

import { getEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/server/auth/session";
import { verifyMediaToken } from "@/server/streaming/tokens";

/** Sous-titres WebVTT, servis uniquement avec un jeton de lecture valide. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/subtitles/[id]">) {
  const { id } = await ctx.params;
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !/^[0-9a-f-]{36}$/.test(id))
    return new NextResponse("Non autorisé", { status: 401 });

  const claims = await verifyMediaToken(token, getEnv().streaming.mediaTokenSecret);
  if (!claims) return new NextResponse("Jeton invalide ou expiré", { status: 401 });
  if (claims.uid) {
    const user = await getSessionUser();
    if (!user || user.id !== claims.uid) return new NextResponse("Non autorisé", { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data: subtitle } = await admin
    .from("subtitles")
    .select("media_asset_id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!subtitle || subtitle.media_asset_id !== claims.sub)
    return new NextResponse("Introuvable", { status: 404 });

  const { data: file, error } = await admin.storage
    .from("subtitles")
    .download(subtitle.storage_path);
  if (error || !file) return new NextResponse("Introuvable", { status: 404 });

  return new NextResponse(await file.text(), {
    headers: {
      "Content-Type": "text/vtt; charset=utf-8",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
