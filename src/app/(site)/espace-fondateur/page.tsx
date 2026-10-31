import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarHeartIcon, CrownIcon, NewspaperIcon, RocketIcon } from "lucide-react";

import { AccountSection } from "@/components/account/section";
import { EmptyState } from "@/components/catalog/empty-state";
import { TitleRow } from "@/components/catalog/title-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isLocale, localeIntlTag } from "@/i18n/config";
import { formatDate, formatPrice } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth/session";
import { getWatchlist, listCatalog } from "@/server/catalog/queries";
import { getAnnouncements, getRoadmap } from "@/server/content";
import { nowMs } from "@/lib/time";

export const metadata: Metadata = { title: "Espace fondateur", robots: { index: false } };

export default async function FounderSpacePage() {
  const viewer = await requireViewer("/espace-fondateur");
  const [t, tn, ta, rawLocale] = await Promise.all([
    getTranslations("founder"),
    getTranslations("news"),
    getTranslations("account"),
    getLocale(),
  ]);
  const locale = isLocale(rawLocale) ? localeIntlTag[rawLocale] : "fr-FR";
  const isActiveFounder = viewer.entitlements.planTier === "founder";
  const wasFounder = Boolean(viewer.profile.founderSince);

  if (!isActiveFounder && !wasFounder) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-32 pb-16">
        <EmptyState
          title={t("notFounder")}
          icon={CrownIcon}
          action={{ href: "/fondateurs", label: t("becomeFounder") }}
        />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const [news, roadmap, announced, wishlist, payments] = await Promise.all([
    getAnnouncements({ limit: 6 }),
    getRoadmap(),
    listCatalog({ status: "announced", sort: "new", limit: 20 }),
    getWatchlist(viewer, 20),
    supabase
      .from("invoices")
      .select(
        "id, number, amount_paid_cents, currency, paid_at, status, invoice_pdf_url, hosted_invoice_url",
      )
      .eq("user_id", viewer.user.id)
      .order("created_at", { ascending: false })
      .limit(24),
  ]);
  const since = viewer.profile.founderSince ? new Date(viewer.profile.founderSince) : null;
  const months = since
    ? Math.max(0, Math.floor((nowMs() - since.getTime()) / (30.44 * 86_400_000)))
    : 0;
  const nextFeatures = roadmap.filter((r) => r.status !== "done").slice(0, 4);

  return (
    <div className="mx-auto max-w-[1300px] space-y-10 px-4 pt-28 pb-16 sm:px-6 lg:px-10">
      <section className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/20 via-card to-card p-8">
        <div className="bg-tamurt-pattern absolute inset-0 opacity-60" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-6">
          <span className="flex size-20 items-center justify-center rounded-2xl bg-gold/20 text-gold ring-1 ring-gold/40">
            <CrownIcon className="size-10" />
          </span>
          <div className="space-y-2">
            <p className="text-sm font-semibold tracking-widest text-gold uppercase">
              {t("badge")}
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">{t("title")}</h1>
            <div className="flex flex-wrap gap-2">
              {viewer.profile.founderNumber && (
                <Badge variant="gold">
                  {t("memberNumber", { number: viewer.profile.founderNumber })}
                </Badge>
              )}
              <Badge variant={isActiveFounder ? "success" : "muted"}>
                {isActiveFounder ? t("active") : t("inactive")}
              </Badge>
              {since && (
                <Badge variant="outline">
                  {t("memberSince", { date: formatDate(since, locale) })}
                </Badge>
              )}
            </div>
            <p className="text-white/80">
              {t("supportDuration", { months })} — {t("thanks")}
            </p>
          </div>
        </div>
        <p className="relative mt-6 max-w-3xl rounded-xl bg-black/30 p-4 text-sm leading-relaxed text-white/85">
          {t("launchPromise")}
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <AccountSection title={t("roadmapTitle")}>
          <ul className="space-y-4">
            {roadmap.map((item) => (
              <li key={item.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span dir="auto" className="font-medium">
                    {item.title}
                  </span>
                  <Badge
                    variant={
                      item.status === "done"
                        ? "success"
                        : item.status === "in_progress"
                          ? "gold"
                          : "muted"
                    }
                  >
                    {t(`roadmapStatuses.${item.status}`)}
                  </Badge>
                </div>
                <Progress value={item.progress} aria-label={item.title} />
              </li>
            ))}
          </ul>
        </AccountSection>
        <AccountSection title={t("newsTitle")}>
          {news.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tn("empty")}</p>
          ) : (
            <ul className="space-y-4">
              {news.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <NewspaperIcon className="mt-0.5 size-4 shrink-0 text-primary-text" />
                  <div>
                    <Link href={`/actualites/${a.slug}`} className="font-medium hover:underline">
                      {a.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {tn(`categories.${a.category}`)} · {formatDate(a.publishedAt, locale)}
                      {a.audience === "founders" && ` · ${t("foundersOnly")}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AccountSection>
      </div>

      <AccountSection title={t("nextFeaturesTitle")}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {nextFeatures.map((item) => (
            <li key={item.id} className="flex items-start gap-3 rounded-xl border p-4 text-sm">
              <RocketIcon className="mt-0.5 size-4 shrink-0 text-primary-text" />
              <span>
                {item.title}
                {item.targetLabel && (
                  <span className="block text-xs text-muted-foreground">{item.targetLabel}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </AccountSection>

      <section className="-mx-4 space-y-6 sm:-mx-6 lg:-mx-10">
        {announced.length > 0 ? (
          <TitleRow
            title={t("announcedTitle")}
            items={announced}
            layout="poster"
            href="/prochainement"
          />
        ) : (
          <div className="px-4 sm:px-6 lg:px-10">
            <EmptyState
              title={t("announcedTitle")}
              description={t("announcedEmpty")}
              icon={CalendarHeartIcon}
            />
          </div>
        )}
        {wishlist.length > 0 && (
          <TitleRow
            title={t("wishlistTitle")}
            items={wishlist}
            layout="poster"
            href="/compte/ma-liste"
          />
        )}
      </section>

      <AccountSection title={t("paymentsTitle")}>
        {!payments.data?.length ? (
          <p className="text-sm text-muted-foreground">
            {t("noPayments")} {viewer.entitlements.provider === "manual" && t("grantedByTeam")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ta("invoiceDate")}</TableHead>
                <TableHead>{ta("invoiceAmount")}</TableHead>
                <TableHead>{ta("invoiceStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.paid_at, locale) || "—"}</TableCell>
                  <TableCell>{formatPrice(p.amount_paid_cents, p.currency, locale)}</TableCell>
                  <TableCell>{p.status === "paid" ? t("paid") : p.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Button asChild variant="secondary" className="mt-4">
          <Link href="/compte/abonnement">{t("manageSupport")}</Link>
        </Button>
      </AccountSection>
    </div>
  );
}
