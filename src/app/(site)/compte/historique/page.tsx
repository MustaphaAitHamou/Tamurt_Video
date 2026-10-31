import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { HistoryIcon } from "lucide-react";

import { ClearHistoryButton } from "@/components/account/danger-forms";
import { AccountSection } from "@/components/account/section";
import { EmptyState } from "@/components/catalog/empty-state";
import { isLocale, localeIntlTag } from "@/i18n/config";
import { formatDateTime } from "@/lib/format";
import { resolveImageUrl } from "@/lib/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Historique", robots: { index: false } };

export default async function HistoryPage() {
  const viewer = await requireViewer("/compte/historique");
  const [t, rawLocale] = await Promise.all([getTranslations("account"), getLocale()]);
  const locale = isLocale(rawLocale) ? localeIntlTag[rawLocale] : "fr-FR";
  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from("watch_history")
    .select("id, started_at, watched_seconds, completed, titles(slug, title, backdrop_path), episodes(name, episode_number)")
    .eq("viewer_profile_id", viewer.activeProfile.id)
    .order("started_at", { ascending: false })
    .limit(100);

  return (
    <AccountSection title={`${t("history")} — ${viewer.activeProfile.name}`}>
      {rows?.length ? (
        <>
          <div className="-mt-12 mb-4 flex justify-end">
            <ClearHistoryButton />
          </div>
          <ul className="divide-y rounded-xl border">
            {rows.map((row) => {
              const title = row.titles as { slug: string; title: string; backdrop_path: string | null } | null;
              const episode = row.episodes as { name: string; episode_number: number } | null;
              if (!title) return null;
              const image = resolveImageUrl(title.backdrop_path);
              return (
                <li key={row.id} className="flex items-center gap-4 p-3">
                  <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {image && <Image src={image} alt="" fill sizes="112px" className="object-cover" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/titre/${title.slug}`} className="font-medium hover:underline">
                      {title.title}
                    </Link>
                    {episode && <p className="text-sm text-muted-foreground">{t("episodeLabel", { number: episode.episode_number, name: episode.name })}</p>}
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(row.started_at, locale)} · {Math.round(row.watched_seconds / 60)} min
                      {row.completed ? ` · ${t("completed")}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <EmptyState title={t("historyEmpty")} icon={HistoryIcon} action={{ href: "/catalogue", label: "Catalogue" }} />
      )}
    </AccountSection>
  );
}
