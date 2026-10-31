import { revokeHqKeyAction } from "@/actions/admin/operations";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { HqKeyForm } from "@/components/admin/hq-key-form";
import { AdminPageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { publicEnv } from "@/lib/public-env";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";
import { nowMs } from "@/lib/time";

export const metadata = { title: "Tamurt HQ" };

export default async function HqPage() {
  await requireStaff("hq.manage", "/admin/hq");
  const supabase = await createSupabaseServerClient();
  const { data: keys } = await supabase
    .from("hq_api_keys")
    .select("id, name, key_prefix, scopes, created_at, expires_at, last_used_at, revoked_at")
    .order("created_at", { ascending: false });
  const now = nowMs();

  return (
    <>
      <AdminPageHeader
        title="Tamurt HQ"
        description="Accès en lecture seule aux indicateurs agrégés de la plateforme pour le tableau de bord de l'écosystème TAMURT SERVICES. Tamurt HQ n'accède jamais directement à la base de données."
      />
      <section className="mb-6 rounded-xl border bg-card/60 p-5">
        <h2 className="mb-4 font-semibold">Nouvelle clé</h2>
        <HqKeyForm />
      </section>
      <section className="mb-6">
        <h2 className="mb-3 font-semibold">Clés</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Préfixe</TableHead>
              <TableHead>Créée le</TableHead>
              <TableHead>Expire le</TableHead>
              <TableHead>Dernière utilisation</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(keys ?? []).map((key) => {
              const expired = key.expires_at && Date.parse(key.expires_at) <= now;
              return (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell className="font-mono text-xs">{key.key_prefix}…</TableCell>
                  <TableCell className="text-sm">{formatDateTime(key.created_at)}</TableCell>
                  <TableCell className="text-sm">
                    {key.expires_at ? formatDateTime(key.expires_at) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {key.last_used_at ? formatDateTime(key.last_used_at) : "Jamais"}
                  </TableCell>
                  <TableCell className="text-end">
                    {key.revoked_at ? (
                      <Badge variant="muted">Révoquée</Badge>
                    ) : expired ? (
                      <Badge variant="warning">Expirée</Badge>
                    ) : (
                      <ConfirmAction
                        action={revokeHqKeyAction.bind(null, key.id)}
                        label="Révoquer"
                        title="Révoquer cette clé ?"
                        description="Tamurt HQ ne pourra plus lire les indicateurs avec cette clé."
                        variant="ghost"
                        destructive
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {(keys ?? []).length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucune clé.</p>
        )}
      </section>
      <section className="rounded-xl border bg-card/60 p-5 text-sm">
        <h2 className="mb-2 font-semibold">Utilisation</h2>
        <p className="mb-3 text-muted-foreground">
          Requête authentifiée, limitée en débit, sans donnée personnelle : effectifs, abonnements
          par formule, revenus, minutes regardées, catalogue, demandes, incidents.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-background/60 p-3 text-xs">{`curl -H "Authorization: Bearer thq_…" \\
  "${publicEnv.siteUrl}/api/hq/v1/metrics?jours=30"`}</pre>
      </section>
    </>
  );
}
