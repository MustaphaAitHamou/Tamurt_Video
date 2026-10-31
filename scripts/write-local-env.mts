/**
 * Écrit .env.local à partir de la pile Supabase locale (`supabase status`).
 * Usage : pnpm env:local  (la pile doit être démarrée : pnpm db:start)
 * Aucune clé de production n'est manipulée : uniquement les clés locales de démonstration.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const target = path.join(root, ".env.local");

const output = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "env"], {
  cwd: root,
  encoding: "utf8",
});
const status = Object.fromEntries(
  output
    .split("\n")
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => [match[1], match[2]]),
);

const url = status.API_URL;
const publishable = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const secret = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
if (!url || !publishable || !secret) {
  console.error("Pile Supabase locale introuvable : lancez d'abord `pnpm db:start`.");
  process.exit(1);
}

// Conserve les réglages déjà présents (ex. clés Stripe de test ajoutées à la main).
const existing = existsSync(target)
  ? Object.fromEntries(
      readFileSync(target, "utf8")
        .split("\n")
        .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
        .filter((match): match is RegExpMatchArray => Boolean(match))
        .map((match) => [match[1], match[2]]),
    )
  : {};

const values: Record<string, string> = {
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  STREAMING_PROVIDER: "dev",
  EMAIL_PROVIDER: "console",
  DEV_COUNTRY_OVERRIDE: "FR",
  CRON_SECRET: "local-cron-secret-for-development-only",
  ...existing,
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishable,
  SUPABASE_SECRET_KEY: secret,
  DATABASE_URL: status.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
};

const lines = [
  "# Fichier local généré pour le développement (ignoré par git).",
  ...Object.entries(values).map(([key, value]) => `${key}=${value}`),
];
writeFileSync(target, `${lines.join("\n")}\n`, { mode: 0o600 });
console.log(`.env.local écrit (${Object.keys(values).length} variables, clés locales uniquement).`);
