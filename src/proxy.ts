import type { NextRequest } from "next/server";

import { buildContentSecurityPolicy } from "@/lib/security/csp";
import { updateSupabaseSession } from "@/lib/supabase/proxy-session";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildContentSecurityPolicy({
    nonce,
    isDev: process.env.NODE_ENV !== "production",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
    extraScriptSrc: process.env.CSP_EXTRA_SCRIPT_SRC?.split(" ").filter(Boolean),
    extraConnectSrc: process.env.CSP_EXTRA_CONNECT_SRC?.split(" ").filter(Boolean),
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = await updateSupabaseSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|demo/|brand/|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|woff2?)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
