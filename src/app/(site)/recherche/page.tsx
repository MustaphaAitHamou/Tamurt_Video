import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SearchXIcon } from "lucide-react";

import { EmptyState } from "@/components/catalog/empty-state";
import { TitleGrid } from "@/components/catalog/title-grid";
import { SearchBox } from "@/components/layout/search-box";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth/session";
import { searchCatalog } from "@/server/catalog/queries";

export const metadata: Metadata = { title: "Recherche", robots: { index: false } };

export default async function SearchPage({ searchParams }: PageProps<"/recherche">) {
  const params = await searchParams;
  const query = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim().slice(0, 200) ?? "";
  const [t, results, viewer] = await Promise.all([
    getTranslations("search"),
    searchCatalog(query, 48),
    getViewer(),
  ]);

  // Historique de recherche : uniquement si l'utilisateur l'a activé (désactivé par défaut).
  if (viewer?.profile.searchHistoryEnabled && query.length >= 2) {
    const supabase = await createSupabaseServerClient();
    await supabase.from("search_history").insert({
      account_id: viewer.user.id,
      viewer_profile_id: viewer.activeProfile.id,
      query,
    });
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-28 pb-10 sm:px-6 lg:px-10">
      <div className="mb-8 max-w-2xl space-y-4">
        <h1 className="text-3xl font-bold">{query ? t("resultsFor", { query }) : t("label")}</h1>
        <SearchBox className="md:hidden" />
        {query && (
          <p className="text-sm text-muted-foreground">
            {t("resultCount", { count: results.length })}
          </p>
        )}
      </div>
      {query.length < 2 ? (
        <EmptyState title={t("emptyQuery")} icon={SearchXIcon} />
      ) : results.length === 0 ? (
        <EmptyState
          title={t("noResults", { query })}
          icon={SearchXIcon}
          action={{ href: "/demandes", label: "Proposer une œuvre" }}
        />
      ) : (
        <TitleGrid items={results} />
      )}
    </div>
  );
}
