import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isDev = process.env.NODE_ENV !== "production";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabase = new URL(supabaseUrl);

// En-têtes de sécurité communs. La politique CSP (avec nonce) est posée par src/proxy.ts.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: supabase.protocol.replace(":", "") as "http" | "https",
        hostname: supabase.hostname,
        port: supabase.port,
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // La base Supabase locale répond sur 127.0.0.1 : autorisé uniquement en développement.
    dangerouslyAllowLocalIP: isDev,
    qualities: [60, 75, 85],
  },
  experimental: {
    // Affiches et sous-titres envoyés par actions serveur (sous le plafond de 4,5 Mo de Vercel).
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Les médias de test générés localement accompagnent la route de diffusion de développement.
  outputFileTracingIncludes: {
    "/api/dev-stream/[...path]": ["./dev-media/**/*"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
