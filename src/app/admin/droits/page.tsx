import Link from "next/link";
import { AlertTriangleIcon, FileClockIcon, FileX2Icon, PlusIcon, ShieldCheckIcon } from "lucide-react";

import { LICENSE_STATUS_LABELS, LICENSE_TYPE_LABELS } from "@/components/admin/rights/labels";
import { RightsNav } from "@/components/admin/rights/rights-nav";
import { AdminPageHeader, StatCard, StatusBadge } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { daysUntil, formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Droits et licences" };

const FILTERS: Record<string, string> = {
  "": "Toutes les licences",
  expiration: "Expirent bientôt",
  expirees: "Expirées",
  signature: "En attente de signature",
  "non-verifiees": "Signées non vérifiées",
};

export default async function RightsPage({ searchParams }: PageProps<"/admin/droits">) {
  const viewer = await requireStaff("rights.read", "/admin/droits");
  const params = await searchParams;
  const filter = typeof params.filtre === "string" && params.filtre in FILTERS ? params.filtre : "";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const settings = await getSettings();
  const horizonDays = Math.max(...settings.licenseAlertDays, 30);
  const now = new Date();
  const horizon = new Date(now.getTime() + horizonDays * 86_400_000);
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("licenses")
    .select("id, status, license_type, starts_at, ends_at, verified_at, contract_reference, exploitation_modes, titles!inner(id, title, status), rights_holders(name), license_territories(country_code, is_excluded)")
    .order("ends_at", { ascending: true, nullsFirst: false })
    .limit(200);
  if (filter === "expiration") query = query.eq("status", "signed").gt("ends_at", now.toISOString()).lte("ends_at", horizon.toISOString());
  if (filter === "expirees") query = query.lte("ends_at", now.toISOString());
  if (filter === "signature") query = query.eq("status", "pending_signature");
  if (filter === "non-verifiees") query = query.eq("status", "signed").is("verified_at", null);
  if (q) query = query.ilike("titles.title", `%${q}%`);

  const licenseCount = () => supabase.from("licenses").select("id", { count: "exact", head: true });
  const [{ data: licenses }, valid, expiring, expired, pending, claims, uncovered] = await Promise.all([
    query,
    licenseCount().eq("status", "signed").lte("starts_at", now.toISOString()).or(`ends_at.is.null,ends_at.gt.${now.toISOString()}`),
    licenseCount().eq("status", "signed").gt("ends_at", now.toISOString()).lte("ends_at", horizon.toISOString()),
    licenseCount().eq("status", "signed").lte("ends_at", now.toISOString()),
    licenseCount().eq("status", "pending_signature"),
    supabase.from("content_claims").select("id", { count: "exact", head: true }).in("status", ["received", "reviewing"]),
    supabase.from("titles").select("id, title, licenses(id)").is("deleted_at", null).in("status", ["draft", "in_review", "unpublished"]).limit(500),
  ]);
  const [validCount, expiringCount, expiredCount, pendingCount] = [valid.count ?? 0, expiring.count ?? 0, expired.count ?? 0, pending.count ?? 0];
  const withoutLicense = (uncovered.data ?? []).filter((t) => t.licenses.length === 0);

  return (
    <>
      <AdminPageHeader
        title="Droits et licences"
        description="Aucune œuvre n'est diffusée sans licence signée couvrant le territoire, la période, le mode d'exploitation et le support. Les licences expirées bloquent la lecture immédiatement et dépublient l'œuvre lors de la tâche quotidienne."
        actions={
          viewer.staff.permissions.includes("rights.write") && (
            <Button asChild>
              <Link href="/admin/droits/licences/nouvelle">
                <PlusIcon /> Nouvelle licence
              </Link>
            </Button>
          )
        }
      />
      <RightsNav active="/admin/droits" />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Licences en vigueur" value={validCount} icon={ShieldCheckIcon} tone="success" />
        <StatCard label={`Expirent sous ${horizonDays} jours`} value={expiringCount} icon={FileClockIcon} tone={expiringCount ? "warning" : undefined} href="/admin/droits?filtre=expiration" />
        <StatCard label="Signées et expirées" value={expiredCount} icon={FileX2Icon} href="/admin/droits?filtre=expirees" />
        <StatCard label="En attente de signature" value={pendingCount} href="/admin/droits?filtre=signature" />
        <StatCard label="Réclamations ouvertes" value={claims.count ?? 0} icon={AlertTriangleIcon} tone={claims.count ? "danger" : undefined} href="/admin/droits/reclamations" />
      </div>
      <form className="mb-4 flex flex-wrap gap-3">
        <Input name="q" defaultValue={q} placeholder="Rechercher une œuvre…" className="max-w-xs" />
        <NativeSelect name="filtre" defaultValue={filter} className="w-60">
          {Object.entries(FILTERS).map(([value, label]) => (
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
            <TableHead>Œuvre</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Territoires</TableHead>
            <TableHead>Période</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(licenses ?? []).map((license) => {
            const remaining = license.ends_at ? daysUntil(license.ends_at) : null;
            const included = license.license_territories.filter((t) => !t.is_excluded).map((t) => t.country_code);
            const excluded = license.license_territories.filter((t) => t.is_excluded).map((t) => t.country_code);
            return (
              <TableRow key={license.id}>
                <TableCell>
                  <Link href={`/admin/droits/licences/${license.id}`} className="font-medium hover:underline">
                    {license.titles.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {license.rights_holders?.name ?? "Ayant droit non renseigné"}
                    {license.contract_reference ? ` · ${license.contract_reference}` : ""}
                  </p>
                </TableCell>
                <TableCell className="text-sm">
                  {LICENSE_TYPE_LABELS[license.license_type]}
                  <p className="text-xs text-muted-foreground">{license.exploitation_modes.join(", ")}</p>
                </TableCell>
                <TableCell className="max-w-48 text-sm">
                  {included.includes("WW") ? "Monde" : included.join(", ")}
                  {excluded.length > 0 && <span className="text-muted-foreground"> sauf {excluded.join(", ")}</span>}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(license.starts_at)} → {license.ends_at ? formatDate(license.ends_at) : "sans fin"}
                  {remaining !== null && remaining >= 0 && remaining <= horizonDays && license.status === "signed" && (
                    <Badge variant="warning" className="ms-2">
                      J-{remaining}
                    </Badge>
                  )}
                  {remaining !== null && remaining < 0 && (
                    <Badge variant="muted" className="ms-2">
                      Expirée
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={license.status} label={LICENSE_STATUS_LABELS[license.status]} />
                  {license.status === "signed" && !license.verified_at && <p className="mt-1 text-xs text-warning">Non vérifiée</p>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {(licenses ?? []).length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aucune licence pour ce filtre.</p>}
      {withoutLicense.length > 0 && (
        <section className="mt-8 rounded-xl border bg-card/60 p-5">
          <h2 className="mb-2 font-semibold">Œuvres en préparation sans aucune licence ({withoutLicense.length})</h2>
          <p className="mb-3 text-sm text-muted-foreground">Elles ne pourront être ni annoncées ni publiées avant l&apos;enregistrement de leurs droits.</p>
          <ul className="flex flex-wrap gap-2">
            {withoutLicense.slice(0, 40).map((t) => (
              <li key={t.id}>
                <Link href={`/admin/droits/licences/nouvelle?titre=${t.id}`} className="rounded-full border px-3 py-1 text-sm hover:bg-accent">
                  {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
