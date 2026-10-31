import type { MetadataRoute } from "next";

import { publicEnv } from "@/lib/public-env";

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : process.env.NODE_ENV === "production";
  if (!isProduction) {
    // Préproduction et prévisualisations : jamais indexées.
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/compte", "/regarder/", "/profils", "/espace-fondateur", "/demandes/", "/connexion", "/inscription", "/auth/"],
      },
    ],
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
    host: publicEnv.siteUrl,
  };
}
