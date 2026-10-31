import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MapIcon } from "lucide-react";

import { EmptyState } from "@/components/catalog/empty-state";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getRoadmap } from "@/server/content";

export const metadata: Metadata = {
  title: "Feuille de route",
  description: "L'avancement de la construction de Tamurt Vidéo, étape par étape.",
};

const COLUMNS = ["in_progress", "planned", "done", "paused"] as const;

export default async function RoadmapPage() {
  const [t, tf, items] = await Promise.all([
    getTranslations("roadmap"),
    getTranslations("founder"),
    getRoadmap(),
  ]);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-28 pb-16 sm:px-6">
      <div className="mb-10 max-w-2xl space-y-3">
        <h1 className="text-3xl font-bold sm:text-4xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      {items.length === 0 ? (
        <EmptyState title={t("empty")} icon={MapIcon} />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {COLUMNS.filter((c) => items.some((i) => i.status === c)).map((column) => (
            <section key={column} aria-labelledby={`col-${column}`} className="space-y-4">
              <h2
                id={`col-${column}`}
                className="text-sm font-semibold tracking-widest text-muted-foreground uppercase"
              >
                {tf(`roadmapStatuses.${column}`)}
              </h2>
              <ul className="space-y-3">
                {items
                  .filter((i) => i.status === column)
                  .map((item) => (
                    <li key={item.id} className="space-y-3 rounded-2xl border bg-card/60 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <p dir="auto" className="font-medium">
                          {item.title}
                        </p>
                        {item.targetLabel && <Badge variant="outline">{item.targetLabel}</Badge>}
                      </div>
                      {item.description && (
                        <p dir="auto" className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <Progress
                        value={item.progress}
                        aria-label={`${item.title} : ${item.progress} %`}
                      />
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
