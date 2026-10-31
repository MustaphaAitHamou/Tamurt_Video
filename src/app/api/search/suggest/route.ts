import { NextResponse, type NextRequest } from "next/server";

import { searchCatalog } from "@/server/catalog/queries";
import { getClientIp, hashIp } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }
  const limit = await rateLimit(`suggest:${hashIp(await getClientIp()) ?? "unknown"}`, 120, 60);
  if (!limit.allowed) {
    return NextResponse.json({ results: [], error: "rate_limited" }, { status: 429 });
  }
  const results = await searchCatalog(query.slice(0, 200), 8);
  return NextResponse.json({
    results: results.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      kind: t.kind,
      year: t.releaseYear,
      poster: t.posterUrl,
    })),
  });
}
