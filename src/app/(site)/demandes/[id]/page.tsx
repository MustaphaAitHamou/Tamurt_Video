import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLinkIcon } from "lucide-react";

import { REQUEST_STATUS_VARIANT as STATUS_VARIANT } from "@/components/requests/status";
import { VoteButton } from "@/components/requests/vote-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isLocale, localeIntlTag } from "@/i18n/config";
import { formatDate, formatDateTime } from "@/lib/format";
import { requireViewer } from "@/server/auth/session";
import { getRequest } from "@/server/requests";

export const metadata: Metadata = { title: "Suivi de demande", robots: { index: false } };

export default async function RequestDetailPage({ params }: PageProps<"/demandes/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const viewer = await requireViewer(`/demandes/${id}`);
  const [t, rawLocale] = await Promise.all([getTranslations("requests"), getLocale()]);
  const locale = isLocale(rawLocale) ? localeIntlTag[rawLocale] : "fr-FR";
  const result = await getRequest(id, viewer.user.id);
  if (!result) notFound();
  const { request, events, hasVoted } = result;
  const linked = request.titles as { slug: string; title: string } | null;
  const isPremium = viewer.entitlements.tier === "premium";

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pt-28 pb-16">
      <Link href="/demandes" className="text-sm text-muted-foreground hover:text-foreground">
        ← {t("title")}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">
            {request.title}
            {request.release_year ? ` (${request.release_year})` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(`contentTypes.${request.content_type}`)}
            {request.country ? ` · ${request.country}` : ""}
            {request.director ? ` · ${request.director}` : ""} ·{" "}
            {t("requestedOn", { date: formatDate(request.created_at, locale) })}
          </p>
          <Badge variant={STATUS_VARIANT[request.status] ?? "muted"}>
            {t(`statuses.${request.status}`)}
          </Badge>
        </div>
        <VoteButton
          requestId={request.id}
          voted={hasVoted}
          votes={request.vote_count}
          canVote={isPremium && !["available", "rejected", "impossible"].includes(request.status)}
        />
      </div>

      {request.public_note && (
        <p className="rounded-xl border bg-card/60 p-4 text-sm">{request.public_note}</p>
      )}
      {request.comment && request.user_id === viewer.user.id && (
        <p className="text-sm text-muted-foreground">« {request.comment} »</p>
      )}
      {request.info_url && (
        <a
          href={request.info_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center gap-1.5 text-sm text-primary-text hover:underline"
        >
          <ExternalLinkIcon className="size-4" /> {t("infoUrl")}
        </a>
      )}
      {linked && request.status === "available" && (
        <Button asChild>
          <Link href={`/titre/${linked.slug}`}>Regarder « {linked.title} »</Link>
        </Button>
      )}

      <section aria-labelledby="history" className="space-y-4">
        <h2 id="history" className="text-xl font-semibold">
          {t("history")}
        </h2>
        <ol className="relative space-y-5 border-s ps-6">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span
                className="absolute -start-[1.95rem] top-1 size-3 rounded-full bg-primary ring-4 ring-background"
                aria-hidden
              />
              <p className="font-medium">{t(`statuses.${event.to_status}`)}</p>
              <time className="text-xs text-muted-foreground" dateTime={event.created_at}>
                {formatDateTime(event.created_at, locale)}
              </time>
              {event.public_note && (
                <p className="mt-1 text-sm text-muted-foreground">{event.public_note}</p>
              )}
            </li>
          ))}
        </ol>
      </section>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("disclaimer")}</p>
    </div>
  );
}
