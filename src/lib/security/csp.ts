/**
 * Politique de sécurité du contenu (CSP) avec nonce par requête.
 * Les domaines de diffusion vidéo et de stockage sont ajoutés explicitement.
 */
export function buildContentSecurityPolicy(options: {
  nonce: string;
  isDev: boolean;
  supabaseUrl: string;
  extraScriptSrc?: string[];
  extraConnectSrc?: string[];
}) {
  const { nonce, isDev, supabaseUrl } = options;
  const supabaseOrigin = new URL(supabaseUrl).origin;
  const streamOrigins = ["https://*.cloudflarestream.com", "https://videodelivery.net"];
  const uploadOrigins = ["https://upload.videodelivery.net", "https://upload.cloudflarestream.com"];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      ...(options.extraScriptSrc ?? []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", supabaseOrigin, ...streamOrigins],
    "font-src": ["'self'", "data:"],
    "media-src": ["'self'", "blob:", ...streamOrigins],
    "connect-src": [
      "'self'",
      supabaseOrigin,
      ...streamOrigins,
      ...uploadOrigins,
      ...(isDev ? ["ws:", "wss:"] : []),
      ...(options.extraConnectSrc ?? []),
    ],
    "worker-src": ["'self'", "blob:"],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": [
      "'self'",
      supabaseOrigin,
      "https://checkout.stripe.com",
      "https://billing.stripe.com",
    ],
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");

  return isDev ? policy : `${policy}; upgrade-insecure-requests`;
}
