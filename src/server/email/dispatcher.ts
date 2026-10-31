import "server-only";

import { getEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEmailProvider } from "@/server/email/providers";
import { preferenceKeyForType, renderEmail, templateForNotificationType } from "@/server/email/templates";

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  email_attempts: number;
};

const MAX_ATTEMPTS = 5;

async function deliver(row: NotificationRow) {
  const admin = createSupabaseAdminClient();
  const env = getEnv();
  const [{ data: userData }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(row.user_id),
    admin.from("profiles").select("notification_preferences").eq("id", row.user_id).maybeSingle(),
  ]);
  const email = userData?.user?.email;
  const preferences = (profile?.notification_preferences ?? {}) as Record<string, boolean>;
  const preferenceKey = preferenceKeyForType(row.type);
  // Les emails de facturation et d'administration restent envoyés : informations contractuelles.
  const optedOut = preferenceKey !== null && preferenceKey !== "email_billing" && preferences[preferenceKey] === false;

  if (!email || optedOut) {
    await admin.from("notifications").update({ email_status: "skipped" }).eq("id", row.id);
    return "skipped" as const;
  }

  const template = templateForNotificationType(row.type);
  const rendered = renderEmail(template, { title: row.title, body: row.body, link: row.link, siteUrl: env.siteUrl });
  const provider = getEmailProvider();
  const result = await provider.send({ to: email, subject: rendered.subject, html: rendered.html, text: rendered.text, replyTo: env.email.replyTo });

  await admin.from("email_outbox").insert({
    user_id: row.user_id,
    notification_id: row.id,
    to_email: email,
    template,
    subject: rendered.subject,
    provider: provider.id,
    status: result.status,
    provider_message_id: result.providerMessageId ?? null,
    error: result.error ?? null,
    preview_text: rendered.preview.slice(0, 300),
  });
  const failed = result.status === "failed";
  await admin
    .from("notifications")
    .update({
      email_status: failed ? (row.email_attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending") : "sent",
      email_attempts: row.email_attempts + 1,
    })
    .eq("id", row.id);
  return failed ? ("failed" as const) : ("sent" as const);
}

/** Tente l'envoi immédiat d'une notification (la tâche planifiée reprend les échecs). */
export async function sendNotificationEmail(notificationId: string) {
  const { data } = await createSupabaseAdminClient()
    .from("notifications")
    .select("id, user_id, type, title, body, link, email_attempts")
    .eq("id", notificationId)
    .eq("email_status", "pending")
    .maybeSingle();
  if (!data) return null;
  return deliver(data);
}

/** Envoie les emails en attente (appelé par la tâche planifiée). */
export async function dispatchPendingEmails(limit = 100) {
  const { data } = await createSupabaseAdminClient()
    .from("notifications")
    .select("id, user_id, type, title, body, link, email_attempts")
    .eq("email_status", "pending")
    .order("created_at")
    .limit(limit);
  const counts = { sent: 0, skipped: 0, failed: 0 };
  for (const row of data ?? []) {
    const outcome = await deliver(row);
    counts[outcome] += 1;
  }
  return counts;
}

/** Crée une notification utilisateur, avec email immédiat si demandé. */
export async function notifyUser(input: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  data?: Record<string, unknown>;
  email?: boolean;
}) {
  const admin = createSupabaseAdminClient();
  const { data: id, error } = await admin.rpc("notify", {
    p_user: input.userId,
    p_type: input.type,
    p_title: input.title,
    p_body: (input.body ?? null) as string,
    p_link: (input.link ?? null) as string,
    p_data: (input.data ?? {}) as never,
    p_email: input.email ?? false,
  });
  if (error || !id) {
    console.error("[notify]", error?.message);
    return null;
  }
  if (input.email) {
    await sendNotificationEmail(id).catch((cause) => console.error("[email] envoi immédiat", cause));
  }
  return id;
}
