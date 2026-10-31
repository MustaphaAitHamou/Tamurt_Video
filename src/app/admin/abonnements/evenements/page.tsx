import Link from "next/link";

import { reprocessPaymentEventAction } from "@/actions/admin/billing";
import { ActionButton } from "@/components/admin/action-button";
import { BillingNav } from "@/components/admin/billing-nav";
import { AdminPageHeader, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";

export const metadata = { title: "Événements de paiement" };

const STATUS: Record<string, string> = {
  received: "Reçu",
  processing: "En cours",
  processed: "Traité",
  ignored: "Ignoré",
  failed: "Échec",
};

export default async function PaymentEventsPage({
  searchParams,
}: PageProps<"/admin/abonnements/evenements">) {
  const viewer = await requireStaff("billing.read", "/admin/abonnements/evenements");
  const canManage = viewer.staff.permissions.includes("billing.manage");
  const { statut } = await searchParams;
  const status = typeof statut === "string" && statut in STATUS ? statut : "";
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("payment_events")
    .select(
      "id, event_id, event_type, status, attempts, error, livemode, received_at, processed_at, related_user_id",
    )
    .order("received_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status as "failed");
  const { data: events } = await query;

  return (
    <>
      <AdminPageHeader
        title="Événements de paiement"
        description="Webhooks Stripe reçus : signature vérifiée, traitement idempotent (un événement n'est appliqué qu'une fois) et indépendant de l'ordre d'arrivée, l'état étant relu chez Stripe."
      />
      <BillingNav active="/admin/abonnements/evenements" />
      <form className="mb-4 flex gap-3">
        <NativeSelect name="statut" defaultValue={status} className="w-48">
          <option value="">Tous</option>
          {Object.entries(STATUS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reçu le</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Tentatives</TableHead>
            <TableHead>Détail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(events ?? []).map((event) => (
            <TableRow key={event.id}>
              <TableCell className="text-sm">{formatDateTime(event.received_at)}</TableCell>
              <TableCell className="font-mono text-xs">
                {event.event_type}
                <span className="block text-muted-foreground">
                  {event.event_id}
                  {event.livemode ? " · LIVE" : " · test"}
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge status={event.status} label={STATUS[event.status]} />
              </TableCell>
              <TableCell className="text-sm tabular-nums">{event.attempts}</TableCell>
              <TableCell className="max-w-80 text-xs">
                {event.error && <p className="mb-1 text-destructive">{event.error}</p>}
                {event.related_user_id && (
                  <Link href={`/admin/utilisateurs/${event.related_user_id}`} className="underline">
                    Compte concerné
                  </Link>
                )}
                {canManage && event.status === "failed" && (
                  <ActionButton
                    action={reprocessPaymentEventAction.bind(null, event.id)}
                    className="mt-1"
                  >
                    Retraiter
                  </ActionButton>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {(events ?? []).length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucun événement reçu.</p>
      )}
    </>
  );
}
