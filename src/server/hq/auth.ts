import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PREFIX = "thq_";

/** Génère une clé d'accès Tamurt HQ : seule son empreinte est conservée. */
export function generateHqKey() {
  const secret = `${PREFIX}${randomBytes(24).toString("base64url")}`;
  return { secret, prefix: secret.slice(0, 10), hash: hashHqKey(secret) };
}

export function hashHqKey(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

/** Vérifie un en-tête « Authorization: Bearer thq_… » et le droit demandé. */
export async function authenticateHqRequest(authorization: string | null, scope: "metrics:read" | "incidents:read") {
  const secret = authorization?.match(/^Bearer\s+(thq_[A-Za-z0-9_-]{20,})$/)?.[1];
  if (!secret) return null;
  const admin = createSupabaseAdminClient();
  const { data: key } = await admin
    .from("hq_api_keys")
    .select("id, name, scopes, expires_at, revoked_at")
    .eq("key_hash", hashHqKey(secret))
    .maybeSingle();
  if (!key || key.revoked_at || (key.expires_at && new Date(key.expires_at) < new Date()) || !key.scopes.includes(scope)) return null;
  await admin.from("hq_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);
  return { id: key.id, name: key.name };
}
