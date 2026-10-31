import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CrownIcon, MessageSquarePlusIcon } from "lucide-react";

import { EmptyState } from "@/components/catalog/empty-state";
import { REQUEST_STATUS_VARIANT as STATUS_VARIANT } from "@/components/requests/status";
import { VoteButton } from "@/components/requests/vote-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isLocale, localeIntlTag } from "@/i18n/config";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getViewer } from "@/server/auth/session";
import { listRequests } from "@/server/requests";

export const metadata: Metadata = {
  title: "Demandes de films et séries",
  description:
    "Proposez et votez pour les prochaines acquisitions de Tamurt Vidéo (membres Premium).",
};

export default async function RequestsPage({ searchParams }: PageProps<"/demandes">) {
  const params = await searchParams;
  const viewer = await getViewer();
  const [t, rawLocale] = await Promise.all([getTranslations("requests"), getLocale()]);
  const locale = isLocale(rawLocale) ? localeIntlTag[rawLocale] : "fr-FR";
  const isPremium = viewer?.entitlements.tier === "premium";
  const sort = params.tri === "recentes" ? "recent" : "top";
  const mine = params.vue === "miennes";
  const requests = viewer ? await listRequests({ userId: viewer.user.id, sort, mine }) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-28 pb-16 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-3xl font-bold sm:text-4xl">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        {isPremium && (
          <Button asChild>
            <Link href="/demandes/nouvelle">
              <MessageSquarePlusIcon /> {t("newRequest")}
            </Link>
          </Button>
        )}
      </div>
      <p className="mb-6 rounded-xl border bg-card/60 p-4 text-sm leading-relaxed text-muted-foreground">
        {t("disclaimer")}
      </p>

      {!viewer ? (
        <EmptyState
          title={t("premiumOnly")}
          icon={CrownIcon}
          action={{ href: "/connexion?next=/demandes", label: "Se connecter" }}
        />
      ) : (
        <>
          {!isPremium && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-gold">
              <span className="flex items-center gap-2">
                <CrownIcon className="size-4" /> {t("premiumOnly")}
              </span>
              <Button asChild size="sm" variant="gold">
                <Link href="/offres">Premium</Link>
              </Button>
            </div>
          )}
          <nav className="mb-6 flex flex-wrap gap-2" aria-label="Tri des demandes">
            {[
              { href: "/demandes", label: t("sortTop"), active: !mine && sort === "top" },
              {
                href: "/demandes?tri=recentes",
                label: t("sortRecent"),
                active: !mine && sort === "recent",
              },
              { href: "/demandes?vue=miennes", label: t("mine"), active: mine },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm",
                  item.active
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {requests.length === 0 ? (
            <EmptyState title={t("empty")} icon={MessageSquarePlusIcon} />
          ) : (
            <ol className="space-y-3">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-4 rounded-2xl border bg-card/60 p-4 transition hover:border-white/20"
                >
                  <VoteButton
                    requestId={r.id}
                    voted={r.hasVoted}
                    votes={r.votes}
                    canVote={
                      isPremium && !["available", "rejected", "impossible"].includes(r.status)
                    }
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Link href={`/demandes/${r.id}`} className="font-medium hover:underline">
                      {r.title}
                      {r.releaseYear ? ` (${r.releaseYear})` : ""}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {t(`contentTypes.${r.contentType}`)}
                      {r.country ? ` · ${r.country}` : ""} ·{" "}
                      {t("requestedOn", { date: formatDate(r.createdAt, locale) })}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[r.status] ?? "muted"}>
                    {t(`statuses.${r.status}`)}
                  </Badge>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
