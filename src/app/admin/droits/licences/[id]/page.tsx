import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheckIcon } from "lucide-react";

import {
  deleteLicenseDocumentAction,
  saveLicenseAction,
  verifyLicenseAction,
} from "@/actions/admin/rights";
import { ActionButton } from "@/components/admin/action-button";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { DocumentLink, DocumentUploader } from "@/components/admin/rights/document-uploader";
import { DOCUMENT_TYPE_LABELS, LICENSE_STATUS_LABELS } from "@/components/admin/rights/labels";
import { LicenseForm } from "@/components/admin/rights/license-form";
import { AdminPageHeader, StatusBadge } from "@/components/admin/ui";
import { formatDateTime, formatNumber } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";
import { uuidPattern } from "@/server/admin/guard";
import { getLicenseFormOptions } from "@/server/admin/rights";

export const metadata = { title: "Licence" };

export default async function LicensePage({ params }: PageProps<"/admin/droits/licences/[id]">) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const viewer = await requireStaff("rights.read", `/admin/droits/licences/${id}`);
  const supabase = await createSupabaseServerClient();
  const { data: license } = await supabase
    .from("licenses")
    .select("*, titles(id, title, status), license_territories(country_code, is_excluded)")
    .eq("id", id)
    .maybeSingle();
  if (!license) notFound();
  const canWrite = viewer.staff.permissions.includes("rights.write");
  const canDocuments = viewer.staff.permissions.includes("rights.documents");
  const [options, documents, history] = await Promise.all([
    getLicenseFormOptions(),
    canDocuments
      ? supabase
          .from("license_documents")
          .select("id, document_type, file_name, size_bytes, created_at")
          .eq("license_id", id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    viewer.staff.permissions.includes("audit.read")
      ? supabase
          .from("audit_logs")
          .select("id, action, created_at, actor_id")
          .eq("entity_type", "licenses")
          .eq("entity_id", id)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: null }),
  ]);

  return (
    <>
      <AdminPageHeader
        title={`Licence · ${license.titles?.title ?? "œuvre"}`}
        description={`Créée le ${formatDateTime(license.created_at)} · modifiée le ${formatDateTime(license.updated_at)}`}
        actions={
          <>
            {license.titles && (
              <Link
                href={`/admin/catalogue/${license.titles.id}?onglet=droits`}
                className="text-sm text-muted-foreground underline"
              >
                Voir l&apos;œuvre
              </Link>
            )}
            <StatusBadge status={license.status} label={LICENSE_STATUS_LABELS[license.status]} />
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border bg-card/60 p-4 text-sm">
        {license.verified_at ? (
          <span className="flex items-center gap-2 text-success">
            <BadgeCheckIcon className="size-4" /> Vérifiée le {formatDateTime(license.verified_at)}
          </span>
        ) : (
          <span className="text-warning">Contrôle documentaire non effectué.</span>
        )}
        {canWrite && (
          <ActionButton action={verifyLicenseAction.bind(null, id)}>
            {license.verified_at ? "Renouveler la vérification" : "Marquer comme vérifiée"}
          </ActionButton>
        )}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="rounded-xl border bg-card/60 p-6">
          {canWrite ? (
            <LicenseForm
              action={saveLicenseAction.bind(null, id)}
              titles={options.titles}
              holders={options.holders}
              defaults={{
                ...license,
                territories: license.license_territories
                  .filter((t) => !t.is_excluded)
                  .map((t) => t.country_code),
                excluded: license.license_territories
                  .filter((t) => t.is_excluded)
                  .map((t) => t.country_code),
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Lecture seule.</p>
          )}
        </div>
        <aside className="space-y-6">
          {canDocuments && (
            <section className="space-y-3 rounded-xl border bg-card/60 p-5">
              <h2 className="font-semibold">Justificatifs</h2>
              <p className="text-xs text-muted-foreground">
                Stockage privé. Chaque consultation génère un lien de 60 secondes et une entrée au
                journal d&apos;audit.
              </p>
              {(documents.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun justificatif archivé.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {(documents.data ?? []).map((document) => (
                    <li key={document.id} className="flex items-center justify-between gap-2 py-2">
                      <span className="min-w-0">
                        <DocumentLink documentId={document.id}>{document.file_name}</DocumentLink>
                        <span className="block text-xs text-muted-foreground">
                          {DOCUMENT_TYPE_LABELS[document.document_type] ?? document.document_type} ·{" "}
                          {formatNumber(Math.round((document.size_bytes ?? 0) / 1024))} Ko ·{" "}
                          {formatDateTime(document.created_at)}
                        </span>
                      </span>
                      <ConfirmAction
                        action={deleteLicenseDocumentAction.bind(null, document.id, id)}
                        label="Supprimer"
                        title="Supprimer ce justificatif ?"
                        description="Le fichier est définitivement retiré du stockage. Conservez une copie si une obligation d'archivage s'applique."
                        variant="ghost"
                        destructive
                      />
                    </li>
                  ))}
                </ul>
              )}
              <DocumentUploader licenseId={id} />
            </section>
          )}
          {history.data && (
            <section className="space-y-3 rounded-xl border bg-card/60 p-5">
              <h2 className="font-semibold">Historique</h2>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {history.data.map((entry) => (
                  <li key={entry.id}>
                    {formatDateTime(entry.created_at)} · {entry.action}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
