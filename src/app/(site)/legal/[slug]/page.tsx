import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangleIcon } from "lucide-react";

import { Markdown } from "@/components/content/markdown";
import { LEGAL_DOCUMENTS } from "@/content/legal/documents";
import { formatDate } from "@/lib/format";
import { getSettings } from "@/server/settings";

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCUMENTS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const doc = LEGAL_DOCUMENTS[slug];
  return doc
    ? { title: doc.title, alternates: { canonical: `/legal/${slug}` } }
    : { title: "Document introuvable" };
}

export default async function LegalPage({ params }: PageProps<"/legal/[slug]">) {
  const { slug } = await params;
  const doc = LEGAL_DOCUMENTS[slug];
  if (!doc) notFound();
  const settings = await getSettings();
  const values: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(settings.legalEntity).map(([key, value]) => [`entity.${key}`, value]),
    ),
    support_email: settings.supportEmail,
    grace_period_days: String(settings.gracePeriodDays),
  };
  const body = doc.body.replace(
    /\{\{([a-z_.]+)\}\}/g,
    (match, key: string) => values[key] ?? match,
  );

  return (
    <article className="mx-auto max-w-3xl px-4 pt-28 pb-16">
      <p
        role="note"
        className="mb-8 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning"
      >
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
        Document provisoire, non validé juridiquement. Il doit être relu et adapté par un
        professionnel du droit avant toute commercialisation du service.
      </p>
      <h1 className="mb-2 text-4xl font-bold">{doc.title}</h1>
      <p className="mb-10 text-sm text-muted-foreground">
        Dernière mise à jour : {formatDate(doc.updatedAt)}
      </p>
      <Markdown>{body}</Markdown>
    </article>
  );
}
