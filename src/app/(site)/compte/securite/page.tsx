import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { MonitorSmartphoneIcon, ShieldCheckIcon } from "lucide-react";

import { changePasswordAction } from "@/actions/account";
import { signOutAction } from "@/actions/auth";
import { RemoveMfaButton } from "@/components/account/danger-forms";
import { AccountSection } from "@/components/account/section";
import { ActionForm } from "@/components/forms/action-form";
import { TextField } from "@/components/forms/form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isLocale, localeIntlTag } from "@/i18n/config";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth/session";
import { nowMs } from "@/lib/time";

export const metadata: Metadata = { title: "Sécurité", robots: { index: false } };

export default async function SecurityPage() {
  const viewer = await requireViewer("/compte/securite");
  const [t, ta, rawLocale] = await Promise.all([
    getTranslations("account"),
    getTranslations("auth"),
    getLocale(),
  ]);
  const locale = isLocale(rawLocale) ? localeIntlTag[rawLocale] : "fr-FR";
  const supabase = await createSupabaseServerClient();
  const [{ data: factors }, { data: sessions }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase
      .from("watch_history")
      .select("device_label, country_code, last_heartbeat_at, ended_at")
      .eq("account_id", viewer.user.id)
      .order("last_heartbeat_at", { ascending: false })
      .limit(40),
  ]);
  const verified = factors?.totp.filter((f) => f.status === "verified") ?? [];
  const devices = new Map<
    string,
    { label: string; country: string | null; lastSeen: string; active: boolean }
  >();
  for (const s of sessions ?? []) {
    const label = s.device_label ?? "Appareil inconnu";
    if (!devices.has(label)) {
      devices.set(label, {
        label,
        country: s.country_code,
        lastSeen: s.last_heartbeat_at,
        active: !s.ended_at && nowMs() - new Date(s.last_heartbeat_at).getTime() < 120_000,
      });
    }
  }
  const isPasswordUser = viewer.user.provider === "email" || viewer.user.provider === undefined;

  return (
    <>
      {isPasswordUser && (
        <AccountSection title={t("changePassword")}>
          <ActionForm
            action={changePasswordAction}
            submitLabel={ta("updatePassword")}
            resetOnSuccess
          >
            <TextField
              label={t("currentPassword")}
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
            <TextField
              label={t("newPassword")}
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              hint={ta("passwordHint")}
            />
            <TextField
              label={ta("confirmPassword")}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </ActionForm>
        </AccountSection>
      )}

      <AccountSection title={t("mfaTitle")} description={t("mfaDescription")}>
        {verified.length > 0 ? (
          <ul className="space-y-3">
            {verified.map((factor) => (
              <li
                key={factor.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <span className="flex items-center gap-2 text-sm">
                  <ShieldCheckIcon className="size-4 text-success" />{" "}
                  {factor.friendly_name ?? "Application d'authentification"}
                  <Badge variant="success">{t("mfaEnabled")}</Badge>
                </span>
                {viewer.staff.roles.length === 0 || !viewer.staff.mfaRequired ? (
                  <RemoveMfaButton factorId={factor.id} />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="muted">{t("mfaDisabled")}</Badge>
            <Button asChild>
              <Link href="/compte/securite/double-authentification">{t("mfaEnable")}</Link>
            </Button>
          </div>
        )}
      </AccountSection>

      <AccountSection title={t("sessionsTitle")}>
        <div className="flex flex-wrap gap-3">
          <form action={signOutAction}>
            <input type="hidden" name="scope" value="others" />
            <Button type="submit" variant="secondary">
              {t("signOutOthers")}
            </Button>
          </form>
          <form action={signOutAction}>
            <input type="hidden" name="scope" value="global" />
            <Button type="submit" variant="outline">
              {t("signOutEverywhere")}
            </Button>
          </form>
        </div>
        {devices.size > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold">{t("recentDevices")}</h3>
            <ul className="divide-y rounded-xl border">
              {[...devices.values()].map((device) => (
                <li
                  key={device.label}
                  className="flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <MonitorSmartphoneIcon className="size-4 text-muted-foreground" />
                    {device.label}
                    {device.country && device.country !== "XX" && (
                      <span className="text-muted-foreground">· {device.country}</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {device.active ? (
                      <Badge variant="success">Lecture en cours</Badge>
                    ) : (
                      formatDateTime(device.lastSeen, locale)
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </AccountSection>
    </>
  );
}
