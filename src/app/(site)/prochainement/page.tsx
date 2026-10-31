import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClapperboardIcon } from "lucide-react";

import { EmptyState } from "@/components/catalog/empty-state";
import { TitleGrid } from "@/components/catalog/title-grid";
import { listCatalog } from "@/server/catalog/queries";

export const metadata: Metadata = {
  title: "Prochainement",
  description: "Les œuvres dont les droits ont été signés et dont la mise en ligne est en préparation.",
};

export default async function ComingSoonPage() {
  const [t, items] = await Promise.all([getTranslations("browse"), listCatalog({ status: "announced", sort: "new", limit: 60 })]);
  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-28 pb-10 sm:px-6 lg:px-10">
      <div className="mb-10 max-w-2xl space-y-3">
        <h1 className="text-3xl font-bold sm:text-4xl">{t("comingSoonTitle")}</h1>
        <p className="text-muted-foreground">{t("comingSoonText")}</p>
      </div>
      {items.length === 0 ? <EmptyState title={t("comingSoonEmpty")} icon={ClapperboardIcon} /> : <TitleGrid items={items} />}
    </div>
  );
}
