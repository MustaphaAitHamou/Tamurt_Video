import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ListVideoIcon } from "lucide-react";

import { EmptyState } from "@/components/catalog/empty-state";
import { TitleGrid } from "@/components/catalog/title-grid";
import { requireViewer } from "@/server/auth/session";
import { getWatchlist } from "@/server/catalog/queries";

export const metadata: Metadata = { title: "Ma liste", robots: { index: false } };

export default async function MyListPage() {
  const viewer = await requireViewer("/compte/ma-liste");
  const [t, items] = await Promise.all([getTranslations("account"), getWatchlist(viewer, 200)]);
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">
        {t("myList")} — {viewer.activeProfile.name}
      </h2>
      {items.length ? <TitleGrid items={items} /> : <EmptyState title={t("myListEmpty")} icon={ListVideoIcon} action={{ href: "/catalogue", label: "Catalogue" }} />}
    </section>
  );
}
