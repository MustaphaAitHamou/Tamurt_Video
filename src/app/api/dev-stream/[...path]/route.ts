import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";

import { getEnv } from "@/lib/env";
import { getRequestCountry } from "@/server/http";
import { devAssetFolder } from "@/server/streaming/dev-provider";
import { verifyMediaToken } from "@/server/streaming/tokens";

const CONTENT_TYPES: Record<string, string> = {
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".m4s": "video/iso.segment",
  ".mp4": "video/mp4",
  ".aac": "audio/aac",
};

/**
 * Diffusion de DÉVELOPPEMENT : sert dev-media/ uniquement avec un jeton signé
 * valide (comme les URL signées d'un fournisseur réel). Désactivée en production.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/dev-stream/[...path]">) {
  const env = getEnv();
  if (env.isProductionDeployment && !env.streaming.allowDevInProduction) {
    return new NextResponse("Indisponible", { status: 404 });
  }
  const { path: segments } = await ctx.params;
  const [token, ...fileParts] = segments;
  if (!token || fileParts.length === 0 || fileParts.length > 3) return new NextResponse("Requête invalide", { status: 400 });
  if (!fileParts.every((part) => /^[A-Za-z0-9_.-]{1,64}$/.test(part) && part !== "." && part !== "..")) {
    return new NextResponse("Requête invalide", { status: 400 });
  }

  const claims = await verifyMediaToken(token, env.streaming.devSecret);
  if (!claims) return new NextResponse("Jeton invalide ou expiré", { status: 403 });
  if (claims.ctry && claims.ctry !== (await getRequestCountry())) {
    return new NextResponse("Territoire non autorisé", { status: 403 });
  }
  const folder = devAssetFolder(claims.sub);
  const extension = path.extname(fileParts[fileParts.length - 1] ?? "").toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!folder || !contentType) return new NextResponse("Requête invalide", { status: 400 });

  const base = path.resolve(process.cwd(), "dev-media", folder);
  const filePath = path.resolve(base, ...fileParts);
  if (!filePath.startsWith(base + path.sep)) return new NextResponse("Requête invalide", { status: 400 });

  try {
    const data = await readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": extension === ".m3u8" ? "private, no-store" : "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(
      "Média de test absent : exécutez « pnpm media:dev » (ffmpeg requis).",
      { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
}
