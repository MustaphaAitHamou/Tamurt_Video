import Link from "next/link";

import { CLAIM_STATUS_LABELS, CLAIM_TYPE_LABELS } from "@/components/admin/rights/labels";
import { RightsNav } from "@/components/admin/rights/rights-nav";
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

export const metadata = { title: "Réclamations" };

export default async function ClaimsPage({
  searchParams,
}: PageProps<"/admin/droits/reclamations">) {
  await requireStaff("rights.read", "/admin/droits/reclamations");
  const { statut } = await searchParams;
  const status =
    typeof statut === "string" && statut in CLAIM_STATUS_LABELS
      ? statut
      : statut === "toutes"
        ? "toutes"
        : "";
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("content_claims")
    .select(
      "id, claimant_name, claimant_organization, claim_type, status, created_at, title_reference, titles(title, takedown_at)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (status === "") query = query.in("status", ["received", "reviewing"]);
  else if (status !== "toutes") query = query.eq("status", status as "received");
  const { data: claims } = await query;

  return (
    <>
      <AdminPageHeader
        title="Réclamations"
        description="Signalements d'ayants droit et de tiers. En cas d'atteinte manifeste, retirez le contenu immédiatement puis instruisez la réclamation. Chaque action est journalisée."
      />
      <RightsNav active="/admin/droits/reclamations" />
      <form className="mb-4 flex gap-3">
        <NativeSelect name="statut" defaultValue={status} className="w-60">
          <option value="">Ouvertes</option>
          {Object.entries(CLAIM_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          <option value="toutes">Toutes</option>
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reçue le</TableHead>
            <TableHead>Déclarant</TableHead>
            <TableHead>Motif</TableHead>
            <TableHead>Contenu visé</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(claims ?? []).map((claim) => (
            <TableRow key={claim.id}>
              <TableCell className="text-sm">
                <Link
                  href={`/admin/droits/reclamations/${claim.id}`}
                  className="font-medium hover:underline"
                >
                  {formatDateTime(claim.created_at)}
                </Link>
              </TableCell>
              <TableCell className="text-sm">
                {claim.claimant_name}
                {claim.claimant_organization && (
                  <span className="block text-xs text-muted-foreground">
                    {claim.claimant_organization}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {CLAIM_TYPE_LABELS[claim.claim_type] ?? claim.claim_type}
              </TableCell>
              <TableCell className="max-w-64 truncate text-sm">
                {claim.titles?.title ?? claim.title_reference}
                {claim.titles?.takedown_at && (
                  <span className="block text-xs text-destructive-text">Retiré</span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={claim.status} label={CLAIM_STATUS_LABELS[claim.status]} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {(claims ?? []).length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucune réclamation pour ce filtre.
        </p>
      )}
    </>
  );
}
