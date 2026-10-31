import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/server/auth/session";
import { getClientIp, hashIp } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

const bodySchema = z.object({
  analytics: z.boolean(),
  ads: z.boolean(),
  version: z.string().max(20),
});

/** Journalise la preuve du consentement (choix, version, horodatage). */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const ipHash = hashIp(await getClientIp()) ?? "unknown";
  const limit = await rateLimit(`consent:${ipHash}`, 20, 3600);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  const user = await getSessionUser();
  await createSupabaseAdminClient()
    .from("consent_logs")
    .insert({
      user_id: user?.id ?? null,
      anonymous_id: user ? null : ipHash.slice(0, 32),
      choices: { analytics: parsed.data.analytics, ads: parsed.data.ads },
      policy_version: parsed.data.version,
    });
  return NextResponse.json({ ok: true });
}
