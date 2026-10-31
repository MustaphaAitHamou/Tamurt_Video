import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSameOriginRequest } from "@/server/request-guards";

const schema = z.object({
  sessionId: z.uuid(),
  position: z.number().min(0).max(86_400),
  duration: z.number().min(0).max(86_400).nullable(),
  delta: z.number().min(0).max(3600),
  event: z.enum(["heartbeat", "pause", "seek", "ended", "stop"]),
});

/** Progression envoyée par le lecteur (fetch keepalive ou sendBeacon). */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false }, { status: 403 });
  const text = await request.text().catch(() => "");
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("record_watch_progress", {
      p_session: parsed.data.sessionId,
      p_position_seconds: Math.floor(parsed.data.position),
      p_duration_seconds: (parsed.data.duration ? Math.floor(parsed.data.duration) : null) as number,
      p_played_delta_seconds: Math.floor(parsed.data.delta),
      p_event: parsed.data.event,
    })
    .single();
  if (error) {
    const status = error.code === "P0002" ? 404 : 400;
    return NextResponse.json({ ok: false }, { status });
  }
  return NextResponse.json({ ok: data?.ok ?? false, completed: data?.is_completed ?? false });
}
