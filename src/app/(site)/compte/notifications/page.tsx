import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BellIcon } from "lucide-react";

import { updateNotificationPreferencesAction } from "@/actions/account";
import { MarkAllReadButton } from "@/components/account/danger-forms";
import { AccountSection } from "@/components/account/section";
import { EmptyState } from "@/components/catalog/empty-state";
import { ActionForm } from "@/components/forms/action-form";
import { isLocale, localeIntlTag } from "@/i18n/config";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { requireViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default async function NotificationsPage() {
  const viewer = await requireViewer("/compte/notifications");
  const [t, tc, rawLocale] = await Promise.all([getTranslations("account"), getTranslations("common"), getLocale()]);
  const locale = isLocale(rawLocale) ? localeIntlTag[rawLocale] : "fr-FR";
  const supabase = await createSupabaseServerClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, link, created_at, read_at")
    .eq("user_id", viewer.user.id)
    .order("created_at", { ascending: false })
    .limit(60);
  const prefs = viewer.profile.notificationPreferences;
  const unread = (notifications ?? []).some((n) => !n.read_at);

  return (
    <>
      <AccountSection title={t("notifications")}>
        {unread && (
          <div className="-mt-12 mb-4 flex justify-end">
            <MarkAllReadButton />
          </div>
        )}
        {!notifications?.length ? (
          <EmptyState title={t("noNotifications")} icon={BellIcon} />
        ) : (
          <ul className="divide-y rounded-xl border">
            {notifications.map((n) => (
              <li key={n.id} className={cn("p-4", !n.read_at && "bg-primary/5")}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {!n.read_at && <span className="size-2 rounded-full bg-primary" aria-label="Non lue" />}
                      {n.link ? (
                        <Link href={n.link} className="hover:underline">
                          {n.title}
                        </Link>
                      ) : (
                        n.title
                      )}
                    </p>
                    {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground" dateTime={n.created_at}>
                    {formatDateTime(n.created_at, locale)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AccountSection>

      <AccountSection title={t("notificationsTitle")}>
        <ActionForm action={updateNotificationPreferencesAction} submitLabel={tc("save")}>
          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <input type="checkbox" checked disabled className="size-4 accent-primary" readOnly />
            {t("emailBilling")}
          </label>
          {(["email_requests", "email_catalog", "email_news"] as const).map((key) => (
            <label key={key} className="flex items-center gap-3 text-sm">
              <input type="checkbox" name={key} defaultChecked={prefs[key] ?? key !== "email_news"} className="size-4 accent-primary" />
              {t(key === "email_requests" ? "emailRequests" : key === "email_catalog" ? "emailCatalog" : "emailNews")}
            </label>
          ))}
        </ActionForm>
      </AccountSection>
    </>
  );
}
