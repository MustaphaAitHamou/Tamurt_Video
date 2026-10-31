import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClientIp, getUserAgent } from "@/server/http";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Journalise une action sensible. Les modifications de tables critiques sont
 * en plus journalisées automatiquement par des triggers SQL.
 */
export async function logAudit(entry: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const [ip, userAgent] = await Promise.all([
    getClientIp().catch(() => undefined),
    getUserAgent().catch(() => undefined),
  ]);
  const { error } = await createSupabaseAdminClient().rpc("log_audit", {
    p_actor: entry.actorId as string,
    p_action: entry.action,
    p_entity_type: entry.entityType,
    p_entity_id: (entry.entityId ?? null) as string,
    p_metadata: (entry.metadata ?? {}) as Json,
    p_ip: (ip ?? null) as string,
    p_user_agent: (userAgent ?? null) as string,
  });
  if (error) {
    console.error("[audit] échec de journalisation", entry.action, error.message);
  }
}
