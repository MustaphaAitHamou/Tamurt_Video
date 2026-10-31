import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";

/**
 * Configuration serveur validée au démarrage. Aucune de ces valeurs n'est
 * exposée au navigateur (seules les variables NEXT_PUBLIC_* le sont, voir
 * src/lib/public-env.ts).
 */
const booleanish = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((value) => value === "true" || value === "1");

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim() !== "" ? value.trim() : undefined));

const serverSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
    NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalString,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
    SUPABASE_SECRET_KEY: optionalString,
    SUPABASE_SERVICE_ROLE_KEY: optionalString,

    PAYMENTS_PROVIDER: z.enum(["stripe", "disabled"]).optional(),
    STRIPE_SECRET_KEY: optionalString,
    STRIPE_WEBHOOK_SECRET: optionalString,
    STRIPE_AUTOMATIC_TAX: booleanish,
    PAYMENTS_LIVE_MODE_ALLOWED: booleanish,

    STREAMING_PROVIDER: z.enum(["cloudflare", "dev"]).optional(),
    CLOUDFLARE_ACCOUNT_ID: optionalString,
    CLOUDFLARE_STREAM_API_TOKEN: optionalString,
    CLOUDFLARE_STREAM_CUSTOMER_CODE: optionalString,
    CLOUDFLARE_STREAM_SIGNING_KEY_ID: optionalString,
    CLOUDFLARE_STREAM_SIGNING_KEY_PEM: optionalString,
    CLOUDFLARE_STREAM_WEBHOOK_SECRET: optionalString,
    DEV_STREAM_SECRET: optionalString,
    ALLOW_DEV_STREAMING_IN_PRODUCTION: booleanish,
    CLOUDFLARE_STREAM_GEO_LOCK: z.enum(["true", "false"]).optional(),
    PLAYBACK_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).max(86_400).optional(),

    GEO_COUNTRY_HEADER: z.string().default("x-vercel-ip-country"),
    DEV_COUNTRY_OVERRIDE: optionalString,

    EMAIL_PROVIDER: z.enum(["console", "smtp", "resend"]).default("console"),
    EMAIL_FROM: z.string().default("Tamurt Vidéo <no-reply@tamurt.example>"),
    EMAIL_REPLY_TO: optionalString,
    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: optionalString,
    SMTP_PASSWORD: optionalString,
    SMTP_SECURE: booleanish,
    RESEND_API_KEY: optionalString,

    CRON_SECRET: optionalString,
    RATE_LIMIT_DISABLED: booleanish,
    LOG_HASH_SALT: optionalString,
  })
  .superRefine((value, ctx) => {
    if (!value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !value.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
        message: "Clé publique Supabase manquante (publishable ou anon).",
      });
    }
    if (!value.SUPABASE_SECRET_KEY && !value.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["SUPABASE_SECRET_KEY"],
        message: "Clé secrète Supabase manquante (secret ou service_role).",
      });
    }
  });

export type ServerEnv = ReturnType<typeof buildEnv>;

function buildEnv(source: NodeJS.ProcessEnv) {
  const parsed = serverSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Configuration invalide :\n${details}\nVoir .env.example.`);
  }
  const raw = parsed.data;
  const isProduction = raw.NODE_ENV === "production";
  const isProductionDeployment = raw.VERCEL_ENV ? raw.VERCEL_ENV === "production" : isProduction;
  const supabaseSecret = (raw.SUPABASE_SECRET_KEY ?? raw.SUPABASE_SERVICE_ROLE_KEY) as string;

  const paymentsProvider = raw.PAYMENTS_PROVIDER ?? (raw.STRIPE_SECRET_KEY ? "stripe" : "disabled");
  const streamingProvider =
    raw.STREAMING_PROVIDER ?? (raw.CLOUDFLARE_STREAM_API_TOKEN ? "cloudflare" : "dev");

  // Dérive un secret stable à partir de la clé Supabase lorsque rien n'est fourni.
  const derive = (label: string) =>
    createHash("sha256").update(`tamurt:${label}:${supabaseSecret}`).digest("hex");

  return {
    nodeEnv: raw.NODE_ENV,
    isProduction,
    isProductionDeployment,
    siteUrl: raw.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ""),
    supabase: {
      url: raw.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: (raw.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? raw.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string,
      secretKey: supabaseSecret,
    },
    payments: {
      provider: paymentsProvider,
      stripeSecretKey: raw.STRIPE_SECRET_KEY,
      stripeWebhookSecret: raw.STRIPE_WEBHOOK_SECRET,
      automaticTax: raw.STRIPE_AUTOMATIC_TAX,
      liveModeAllowed: raw.PAYMENTS_LIVE_MODE_ALLOWED,
    },
    streaming: {
      provider: streamingProvider,
      allowDevInProduction: raw.ALLOW_DEV_STREAMING_IN_PRODUCTION,
      cloudflare: {
        accountId: raw.CLOUDFLARE_ACCOUNT_ID,
        apiToken: raw.CLOUDFLARE_STREAM_API_TOKEN,
        customerCode: raw.CLOUDFLARE_STREAM_CUSTOMER_CODE,
        signingKeyId: raw.CLOUDFLARE_STREAM_SIGNING_KEY_ID,
        signingKeyPem: raw.CLOUDFLARE_STREAM_SIGNING_KEY_PEM,
        webhookSecret: raw.CLOUDFLARE_STREAM_WEBHOOK_SECRET,
      },
      devSecret: raw.DEV_STREAM_SECRET ?? derive("dev-stream"),
      mediaTokenSecret: derive("media-token"),
      geoLock: raw.CLOUDFLARE_STREAM_GEO_LOCK !== "false",
      tokenTtlSeconds: raw.PLAYBACK_TOKEN_TTL_SECONDS,
    },
    geo: {
      header: raw.GEO_COUNTRY_HEADER.toLowerCase(),
      devOverride: isProductionDeployment ? undefined : raw.DEV_COUNTRY_OVERRIDE?.toUpperCase(),
    },
    email: {
      provider: raw.EMAIL_PROVIDER,
      from: raw.EMAIL_FROM,
      replyTo: raw.EMAIL_REPLY_TO,
      smtp: {
        host: raw.SMTP_HOST,
        port: raw.SMTP_PORT,
        user: raw.SMTP_USER,
        password: raw.SMTP_PASSWORD,
        secure: raw.SMTP_SECURE,
      },
      resendApiKey: raw.RESEND_API_KEY,
    },
    cronSecret: raw.CRON_SECRET,
    rateLimitDisabled: raw.RATE_LIMIT_DISABLED && !isProductionDeployment,
    logHashSalt: raw.LOG_HASH_SALT ?? derive("log-hash"),
  };
}

let cached: ServerEnv | undefined;

export function getEnv(): ServerEnv {
  if (!cached) {
    cached = buildEnv(process.env);
  }
  return cached;
}

/** Réservé aux tests : reconstruit la configuration à partir d'un environnement donné. */
export function buildEnvForTests(source: NodeJS.ProcessEnv): ServerEnv {
  return buildEnv(source);
}
