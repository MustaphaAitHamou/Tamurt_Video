import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { playbackRequestSchema, startPlayback } from "@/server/playback/service";
import { isSameOriginRequest } from "@/server/request-guards";

const DEVICE_COOKIE = "tv_device";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const parsed = playbackRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid_request" }, { status: 400 });
  }
  // Identifiant d'appareil (cookie httpOnly) : une nouvelle lecture remplace celle du même appareil.
  const existingDevice = request.cookies.get(DEVICE_COOKIE)?.value;
  const deviceId =
    existingDevice && /^[0-9a-f]{32}$/.test(existingDevice)
      ? existingDevice
      : randomBytes(16).toString("hex");
  const result = await startPlayback(parsed.data, deviceId);
  if (!result.ok) {
    const status =
      result.reason === "login_required"
        ? 401
        : result.reason === "rate_limited"
          ? 429
          : result.reason === "not_found"
            ? 404
            : result.reason === "provider_unavailable"
              ? 503
              : 403;
    return NextResponse.json(result, { status });
  }
  const response = NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  if (deviceId !== existingDevice) {
    response.cookies.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }
  return response;
}
