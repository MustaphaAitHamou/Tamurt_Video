import type { MetadataRoute } from "next";

import { LEGAL_DOCUMENTS } from "@/content/legal/documents";
import { publicEnv } from "@/lib/public-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;
  const staticPages = ["", "/catalogue", "/prochainement", "/fondateurs", "/offres", "/actualites", "/feuille-de-route", "/aide", "/contact", "/signalement"];
  const entries: MetadataRoute.Sitemap = [
    ...staticPages.map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.6 })),
    ...Object.keys(LEGAL_DOCUMENTS).map((slug) => ({ url: `${base}/legal/${slug}`, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
  try {
    const admin = createSupabaseAdminClient();
    const [{ data: titles }, { data: news }] = await Promise.all([
      admin
        .from("titles")
        .select("slug, updated_at")
        .in("status", ["published", "announced"])
        .eq("is_demo", false)
        .is("deleted_at", null)
        .is("takedown_at", null)
        .limit(5000),
      admin.from("announcements").select("slug, updated_at").eq("status", "published").eq("audience", "public").limit(1000),
    ]);
    for (const title of titles ?? []) entries.push({ url: `${base}/titre/${title.slug}`, lastModified: title.updated_at, priority: 0.8 });
    for (const item of news ?? []) entries.push({ url: `${base}/actualites/${item.slug}`, lastModified: item.updated_at, priority: 0.5 });
  } catch (error) {
    console.error("[sitemap]", error);
  }
  return entries;
}
