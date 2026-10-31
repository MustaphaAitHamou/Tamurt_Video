import { AdminPageHeader, AdminPagination } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";
import { getUserEmails } from "@/server/admin/users";

export const metadata = { title: "Journal d'audit" };

const PAGE_SIZE = 50;

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireStaff("audit.read", "/admin/audit");
  const params = await searchParams;
  const action = typeof params.action === "string" ? params.action.trim().slice(0, 60) : "";
  const entity = typeof params.objet === "string" ? params.objet.trim().slice(0, 60) : "";
  const entityId = typeof params.id === "string" ? params.id.trim().slice(0, 80) : "";
  const page = Math.max(1, Number(params.page) || 1);
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (action) query = query.ilike("action", `${action}%`);
  if (entity) query = query.eq("entity_type", entity);
  if (entityId) query = query.eq("entity_id", entityId);
  const { data: logs, count } = await query;
  const emails = await getUserEmails((logs ?? []).map((l) => l.actor_id));

  return (
    <>
      <AdminPageHeader
        title="Journal d'audit"
        description="Actions sensibles et modifications des données de référence (catalogue, droits, rôles, abonnements, paramètres). Le journal est immuable : aucune entrée ne peut être modifiée ni supprimée."
      />
      <form className="mb-4 flex flex-wrap gap-3">
        <Input name="action" defaultValue={action} placeholder="Action (ex. billing., update)" className="w-56" />
        <Input name="objet" defaultValue={entity} placeholder="Objet (ex. licenses, titles)" className="w-56" />
        <Input name="id" defaultValue={entityId} placeholder="Identifiant de l'objet" className="w-72" />
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Auteur</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Objet</TableHead>
            <TableHead>Détail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(logs ?? []).map((log) => {
            const metadata = JSON.stringify(log.metadata);
            return (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-sm">{formatDateTime(log.created_at)}</TableCell>
                <TableCell className="text-sm">{log.actor_id ? (emails.get(log.actor_id) ?? log.actor_id.slice(0, 8)) : "Système"}</TableCell>
                <TableCell className="font-mono text-xs">{log.action}</TableCell>
                <TableCell className="font-mono text-xs">
                  {log.entity_type}
                  {log.entity_id && <span className="block text-muted-foreground">{log.entity_id}</span>}
                </TableCell>
                <TableCell className="max-w-md">
                  {metadata !== "{}" && (
                    <details>
                      <summary className="cursor-pointer text-xs text-muted-foreground">Voir</summary>
                      <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-background/60 p-2 text-[11px]">{JSON.stringify(log.metadata, null, 2)}</pre>
                    </details>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <AdminPagination basePath="/admin/audit" page={page} pageSize={PAGE_SIZE} total={count ?? 0} params={{ action, objet: entity, id: entityId }} />
    </>
  );
}
