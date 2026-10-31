import Link from "next/link";

import { handleDataRequestAction } from "@/actions/admin/users";
import { AdminPageHeader, StatusBadge } from "@/components/admin/ui";
import { UsersNav } from "@/components/admin/users-nav";
import { ActionForm } from "@/components/forms/action-form";
import { Field } from "@/components/forms/form-fields";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { daysUntil, formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";

export const metadata = { title: "Demandes RGPD" };

const TYPES: Record<string, string> = {
  access: "Accès",
  export: "Portabilité (export)",
  rectification: "Rectification",
  erasure: "Effacement",
  restriction: "Limitation",
  objection: "Opposition",
};
const STATUS: Record<string, string> = { received: "Reçue", in_progress: "En cours", completed: "Traitée", rejected: "Refusée" };

export default async function DataRequestsPage() {
  await requireStaff("users.manage", "/admin/utilisateurs/donnees");
  const supabase = await createSupabaseServerClient();
  const { data: requests } = await supabase.from("data_requests").select("*").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <AdminPageHeader
        title="Demandes relatives aux données personnelles"
        description="Délai de réponse indicatif : un mois à compter de la réception (prolongeable dans les cas prévus par le RGPD). L'export et la suppression de compte sont aussi disponibles en libre-service depuis l'espace client."
      />
      <UsersNav active="/admin/utilisateurs/donnees" />
      <ul className="space-y-3">
        {(requests ?? []).length === 0 && <li className="text-sm text-muted-foreground">Aucune demande.</li>}
        {(requests ?? []).map((request) => {
          const deadline = new Date(Date.parse(request.created_at) + 30 * 86_400_000);
          const remaining = daysUntil(deadline);
          const open = request.status === "received" || request.status === "in_progress";
          return (
            <li key={request.id} className="rounded-xl border bg-card/60 p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <span className="font-medium">{TYPES[request.request_type]}</span> · reçue le {formatDateTime(request.created_at)} ·{" "}
                  {request.user_id ? (
                    <Link href={`/admin/utilisateurs/${request.user_id}`} className="underline">
                      voir le compte
                    </Link>
                  ) : (
                    "compte supprimé"
                  )}
                </span>
                <span className="flex items-center gap-2">
                  {open && <span className={remaining < 7 ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>Échéance J{remaining >= 0 ? `-${remaining}` : `+${-remaining}`}</span>}
                  <StatusBadge status={request.status === "completed" ? "resolved" : request.status === "rejected" ? "rejected" : request.status === "in_progress" ? "reviewing" : "received"} label={STATUS[request.status]} />
                </span>
              </div>
              {request.details && <p className="mb-3 whitespace-pre-wrap rounded-lg border bg-background/40 p-3 text-sm">{request.details}</p>}
              <ActionForm action={handleDataRequestAction.bind(null, request.id)} submitLabel="Enregistrer" submitVariant="secondary" className="grid gap-3 space-y-0 md:grid-cols-[14rem_1fr_auto] md:items-end">
                <Field label="Statut" name={`st-${request.id.slice(0, 8)}`}>
                  <NativeSelect id={`st-${request.id.slice(0, 8)}`} name="status" defaultValue={request.status}>
                    {Object.entries(STATUS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Réponse (envoyée à l'utilisateur à la clôture)" name={`re-${request.id.slice(0, 8)}`}>
                  <Textarea id={`re-${request.id.slice(0, 8)}`} name="response" defaultValue={request.response ?? ""} maxLength={4000} className="min-h-16" />
                </Field>
              </ActionForm>
            </li>
          );
        })}
      </ul>
    </>
  );
}
