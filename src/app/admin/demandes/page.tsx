import Link from "next/link";

import { AdminPageHeader, AdminPagination } from "@/components/admin/ui";
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_VARIANT } from "@/components/requests/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";

export const metadata = { title: "Demandes de films" };

const PAGE_SIZE = 40;

export default async function AdminRequestsPage({ searchParams }: PageProps<"/admin/demandes">) {
  const viewer = await requireStaff("admin.access", "/admin/demandes");
  const canSee = ["requests.moderate", "requests.confirm_acquisition"].some((p) =>
    viewer.staff.permissions.includes(p as never),
  );
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const status = typeof params.statut === "string" ? params.statut : "ouvertes";
  const sort = params.tri === "recentes" ? "recentes" : "votes";
  const page = Math.max(1, Number(params.page) || 1);
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("content_requests")
    .select(
      "id, title, release_year, content_type, status, vote_count, is_hidden, duplicate_of, created_at, linked_title_id",
      { count: "exact" },
    )
    .is("duplicate_of", null)
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  query =
    sort === "votes"
      ? query.order("vote_count", { ascending: false }).order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false });
  if (q) query = query.ilike("title", `%${q}%`);
  if (status === "ouvertes") query = query.not("status", "in", "(available,rejected,impossible)");
  else if (status === "masquees") query = query.eq("is_hidden", true);
  else if (status in REQUEST_STATUS_LABELS) query = query.eq("status", status as "received");
  const { data: requests, count } = canSee ? await query : { data: [], count: 0 };

  return (
    <>
      <AdminPageHeader
        title="Demandes de films"
        description="Demandes et votes des abonnés Premium. Une demande n'engage jamais Tamurt Vidéo : seule l'équipe des droits peut confirmer une acquisition, et aucune œuvre n'est récupérée en dehors d'un accord avec ses ayants droit."
      />
      <form className="mb-4 flex flex-wrap gap-3">
        <Input name="q" defaultValue={q} placeholder="Rechercher un titre…" className="max-w-xs" />
        <NativeSelect name="statut" defaultValue={status} className="w-60">
          <option value="ouvertes">En cours de traitement</option>
          {Object.entries(REQUEST_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          <option value="masquees">Masquées par la modération</option>
          <option value="toutes">Toutes</option>
        </NativeSelect>
        <NativeSelect name="tri" defaultValue={sort} className="w-44">
          <option value="votes">Plus votées</option>
          <option value="recentes">Plus récentes</option>
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titre demandé</TableHead>
            <TableHead className="text-end">Votes</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Reçue le</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(requests ?? []).map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                <Link
                  href={`/admin/demandes/${request.id}`}
                  className="font-medium hover:underline"
                >
                  {request.title}
                </Link>
                {request.release_year && (
                  <span className="text-muted-foreground"> ({request.release_year})</span>
                )}
                {request.is_hidden && (
                  <Badge variant="warning" className="ms-2">
                    Masquée
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-end font-semibold tabular-nums">
                {request.vote_count}
              </TableCell>
              <TableCell>
                <Badge variant={REQUEST_STATUS_VARIANT[request.status] ?? "outline"}>
                  {REQUEST_STATUS_LABELS[request.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(request.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {(requests ?? []).length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucune demande pour ce filtre.
        </p>
      )}
      <AdminPagination
        basePath="/admin/demandes"
        page={page}
        pageSize={PAGE_SIZE}
        total={count ?? 0}
        params={{ q, statut: status, tri: sort }}
      />
    </>
  );
}
