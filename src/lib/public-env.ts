/**
 * Valeurs publiques (préfixe NEXT_PUBLIC_), intégrées au bundle client.
 * Ne jamais y placer de secret.
 */
export const publicEnv = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  googleAuthEnabled: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true",
  draftLocalesEnabled: process.env.NEXT_PUBLIC_ENABLE_DRAFT_LOCALES !== "false",
} as const;
