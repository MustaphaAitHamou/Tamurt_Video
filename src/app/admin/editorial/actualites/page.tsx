import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { EditorialNav } from "@/components/admin/editorial/editorial-nav";
import {
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_CATEGORY_LABELS,
} from "@/components/admin/editorial/labels";
import { AdminPageHeader, StatusBadge } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export const metadata = { title: "Actualités" };

const STATUS: Record<string, string> = {
  draft: "Brouillon",
  published: "Publiée",
  archived: "Archivée",
};

export default async function AnnouncementsAdminPage() {
  await requireStaff("editorial.write", "/admin/editorial/actualites");
  const supabase = await createSupabaseServerClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, slug, category, audience, status, published_at, pinned, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  return (
    <>
      <AdminPageHeader
        title="Actualités"
        description="Nouvelles de la plateforme, avancement, arrivées au catalogue. Les annonces de partenariat exigent l'accord écrit du partenaire."
        actions={
          <Button asChild>
            <Link href="/admin/editorial/actualites/nouvelle">
              <PlusIcon /> Nouvelle actualité
            </Link>
          </Button>
        }
      />
      <EditorialNav active="/admin/editorial/actualites" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titre</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Public</TableHead>
            <TableHead>Publication</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(announcements ?? []).map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <Link
                  href={`/admin/editorial/actualites/${a.id}`}
                  className="font-medium hover:underline"
                >
                  {a.title}
                </Link>
                {a.pinned && (
                  <Badge variant="gold" className="ms-2">
                    Épinglée
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm">{ANNOUNCEMENT_CATEGORY_LABELS[a.category]}</TableCell>
              <TableCell className="text-sm">{ANNOUNCEMENT_AUDIENCE_LABELS[a.audience]}</TableCell>
              <TableCell className="text-sm">
                {a.published_at ? formatDateTime(a.published_at) : "—"}
              </TableCell>
              <TableCell>
                <StatusBadge
                  status={
                    a.status === "published"
                      ? "published"
                      : a.status === "draft"
                        ? "draft"
                        : "archived"
                  }
                  label={STATUS[a.status]}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {(announcements ?? []).length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucune actualité.</p>
      )}
    </>
  );
}
