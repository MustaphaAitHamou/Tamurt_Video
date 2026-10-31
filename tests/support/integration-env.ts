import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Tests d'intégration : ils s'exécutent contre la pile Supabase LOCALE
 * (pnpm db:start puis pnpm env:local). Ils refusent toute autre cible.
 */
const envFile = path.join(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && process.env[match[1]!] === undefined) process.env[match[1]!] = match[2];
  }
}
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
  throw new Error(
    `Tests d'intégration réservés à la base locale (NEXT_PUBLIC_SUPABASE_URL=${url || "absent"}).`,
  );
}
if (!/@(127\.0\.0\.1|localhost)(:\d+)?\//.test(process.env.DATABASE_URL)) {
  throw new Error("DATABASE_URL doit viser la base locale.");
}
