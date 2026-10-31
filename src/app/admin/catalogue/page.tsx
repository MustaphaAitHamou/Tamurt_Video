import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { AdminPageHeader, AdminPagination, StatusBadge } from "@/components/admin/ui";
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
import { TITLE_KIND_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";

export const metadata = { title: "Catalogue" };

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  in_review: "En relecture",
  announced: "Annoncée",
  published: "Publiée",
  unpublished: "Dépubliée",
  archived: "Archivée",
};
const PAGE_SIZE = 30;

export default async function AdminCataloguePage({ searchParams }: PageProps<"/admin/catalogue">) {
  const viewer = await requireStaff("catalog.read_all", "/admin/catalogue");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const status = typeof params.statut === "string" ? params.statut : "";
  const page = Math.max(1, Number(params.page) || 1);
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("titles")
    .select(
      "id, slug, title, kind, status, published_at, is_demo, takedown_at, deleted_at, release_year, updated_at",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.ilike("title", `%${q}%`);
  if (status === "demo") query = query.eq("is_demo", true).is("deleted_at", null);
  else if (status === "supprimees") query = query.not("deleted_at", "is", null);
  else if (status) query = query.eq("status", status as "draft").is("deleted_at", null);
  else query = query.is("deleted_at", null);
  const { data: titles, count } = await query;

  return (
    <>
      <AdminPageHeader
        title="Catalogue"
        description="Œuvres, saisons, épisodes, médias et sous-titres. Une œuvre ne peut être publiée ou annoncée que si une licence signée et valide la couvre."
        actions={
          viewer.staff.permissions.includes("catalog.write") && (
            <Button asChild>
              <Link href="/admin/catalogue/nouveau">
                <PlusIcon /> Nouvelle œuvre
              </Link>
            </Button>
          )
        }
      />
      <form className="mb-4 flex flex-wrap gap-3">
        <Input name="q" defaultValue={q} placeholder="Rechercher un titre…" className="max-w-xs" />
        <NativeSelect name="statut" defaultValue={status} className="w-56">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          <option value="demo">Œuvres de démonstration</option>
          <option value="supprimees">Supprimées</option>
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titre</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Publication</TableHead>
            <TableHead>Mise à jour</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(titles ?? []).map((title) => (
            <TableRow key={title.id}>
              <TableCell>
                <Link href={`/admin/catalogue/${title.id}`} className="font-medium hover:underline">
                  {title.title}
                </Link>
                {title.release_year && (
                  <span className="text-muted-foreground"> ({title.release_year})</span>
                )}
                <div className="mt-1 flex gap-1">
                  {title.is_demo && <Badge variant="muted">Démo</Badge>}
                  {title.takedown_at && <Badge variant="destructive">Retirée</Badge>}
                  {title.deleted_at && <Badge variant="destructive">Supprimée</Badge>}
                </div>
              </TableCell>
              <TableCell className="text-sm">{TITLE_KIND_LABELS[title.kind]}</TableCell>
              <TableCell>
                <StatusBadge status={title.status} label={STATUS_LABELS[title.status]} />
              </TableCell>
              <TableCell className="text-sm">{formatDate(title.published_at) || "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(title.updated_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AdminPagination
        basePath="/admin/catalogue"
        page={page}
        pageSize={PAGE_SIZE}
        total={count ?? 0}
        params={{ q, statut: status }}
      />
    </>
  );
}
