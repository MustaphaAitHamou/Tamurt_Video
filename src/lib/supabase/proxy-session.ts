import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";

/**
 * Rafraîchit la session Supabase avant le rendu et recopie les cookies mis à
 * jour sur la requête et la réponse.
 */
export async function updateSupabaseSession(request: NextRequest, requestHeaders: Headers) {
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        // Les en-têtes transmis au rendu doivent porter les cookies renouvelés.
        requestHeaders.set("cookie", request.cookies.toString());
        response = NextResponse.next({ request: { headers: requestHeaders } });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [headerName, headerValue] of Object.entries(headers ?? {})) {
          response.headers.set(headerName, headerValue);
        }
      },
    },
  });

  // Vérifie le jeton (et le renouvelle si nécessaire). Ne pas retirer.
  await supabase.auth.getClaims();

  return response;
}
