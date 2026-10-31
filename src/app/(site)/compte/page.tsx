import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CrownIcon, GemIcon, ListVideoIcon, MessageSquarePlusIcon, UsersIcon } from "lucide-react";

import { ProfileAvatar } from "@/components/account/profile-avatar";
import { AccountSection } from "@/components/account/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isLocale, localeIntlTag } from "@/i18n/config";
import { formatDate } from "@/lib/format";
import { requireViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };

export default async function AccountOverviewPage({ searchParams }: PageProps<"/compte">) {
  const params = await searchParams;
  const viewer = await requireViewer("/compte");
  const [t, tt, tf, rawLocale] = await Promise.all([
    getTranslations("account"),
    getTranslations("tiers"),
    getTranslations("founder"),
    getLocale(),
  ]);
  const locale = isLocale(rawLocale) ? localeIntlTag[rawLocale] : "fr-FR";
  const e = viewer.entitlements;
  const isFounder = e.planTier === "founder";

  return (
    <>
      {params.bienvenue === "1" && (
        <p
          role="status"
          className="rounded-xl border border-success/40 bg-success/10 p-4 text-sm text-success"
        >
          {(await getTranslations("auth"))("verifiedText")}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-5 rounded-2xl border bg-gradient-to-br from-card to-card/40 p-6">
        <ProfileAvatar avatarKey={viewer.activeProfile.avatarKey} className="size-16 text-3xl" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xl font-semibold">
            {t("welcome", { name: viewer.profile.displayName ?? viewer.user.email })}
          </p>
          <p className="text-sm text-muted-foreground">{viewer.user.email}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge
              variant={isFounder ? "gold" : e.tier === "free" ? "muted" : "default"}
              className="gap-1"
            >
              {isFounder ? <CrownIcon /> : <GemIcon />}
              {isFounder ? tf("badge") : tt(e.tier)}
            </Badge>
            {viewer.profile.founderNumber && (
              <Badge variant="outline">
                {tf("memberNumber", { number: viewer.profile.founderNumber })}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <AccountSection title={t("subscription")}>
        {e.subscriptionId ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 text-sm">
              <p className="text-base font-semibold">{e.planName}</p>
              {e.currentPeriodEnd && (
                <p className="text-muted-foreground">
                  {e.cancelAtPeriodEnd
                    ? t("endsOn", { date: formatDate(e.currentPeriodEnd, locale) })
                    : t("renewsOn", { date: formatDate(e.currentPeriodEnd, locale) })}
                </p>
              )}
              {e.launchPhase === "commercial" && isFounder && (
                <p className="text-gold">{t("founderRate")}</p>
              )}
            </div>
            <Button asChild variant="secondary">
              <Link href="/compte/abonnement">{t("manageBilling")}</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">{t("noSubscription")}</p>
            <Button asChild>
              <Link href="/offres">{t("seePlans")}</Link>
            </Button>
          </div>
        )}
      </AccountSection>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/profils", icon: UsersIcon, label: t("profiles") },
          { href: "/compte/ma-liste", icon: ListVideoIcon, label: t("myList") },
          { href: "/demandes", icon: MessageSquarePlusIcon, label: t("requests") },
        ].map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl border bg-card/60 p-5 text-sm font-medium transition hover:border-white/20 hover:bg-card"
          >
            <Icon className="size-5 text-primary" /> {label}
          </Link>
        ))}
      </div>
    </>
  );
}
