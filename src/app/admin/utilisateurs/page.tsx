import Link from "next/link";

import { AdminPageHeader, AdminPagination, StatusBadge } from "@/components/admin/ui";
import { UsersNav } from "@/components/admin/users-nav";
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
import { ROLE_LABELS, type AppRole, type PlanTier } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";

export const metadata = { title: "Utilisateurs" };

const PAGE_SIZE = 50;
const TIER_LABELS: Record<string, string> = {
  free: "Gratuit",
  founder: "Fondateur",
  standard: "Standard",
  premium: "Premium",
};

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/utilisateurs">) {
  await requireStaff("users.read", "/admin/utilisateurs");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const role =
    typeof params.role === "string" && params.role in ROLE_LABELS
      ? (params.role as AppRole)
      : undefined;
  const tier =
    typeof params.formule === "string" && params.formule in TIER_LABELS
      ? (params.formule as PlanTier)
      : undefined;
  const suspended = params.suspendus === "1" ? true : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const supabase = await createSupabaseServerClient();
  const { data: users, error } = await supabase.rpc("admin_list_users", {
    p_search: q,
    ...(role ? { p_role: role } : {}),
    ...(tier ? { p_tier: tier } : {}),
    ...(suspended ? { p_suspended: true } : {}),
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) console.error("[admin] utilisateurs", error.message);
  const total = Number(users?.[0]?.total_count ?? 0);

  return (
    <>
      <AdminPageHeader
        title="Utilisateurs"
        description="Comptes, formules, rôles et suspensions. Les données de carte bancaire ne sont jamais stockées par Tamurt Vidéo."
      />
      <UsersNav active="/admin/utilisateurs" />
      <form className="mb-4 flex flex-wrap gap-3">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Email, nom ou identifiant…"
          className="max-w-xs"
        />
        <NativeSelect name="formule" defaultValue={tier ?? ""} className="w-44">
          <option value="">Toutes formules</option>
          {Object.entries(TIER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="role" defaultValue={role ?? ""} className="w-52">
          <option value="">Tous rôles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="suspendus"
            value="1"
            defaultChecked={suspended}
            className="size-4 accent-primary"
          />{" "}
          Suspendus
        </label>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Compte</TableHead>
            <TableHead>Formule</TableHead>
            <TableHead>Rôles</TableHead>
            <TableHead>Inscription</TableHead>
            <TableHead>Dernière connexion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(users ?? []).map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <Link
                  href={`/admin/utilisateurs/${user.id}`}
                  className="font-medium hover:underline"
                >
                  {user.email}
                </Link>
                <span className="block text-xs text-muted-foreground">
                  {user.display_name ?? "—"}
                  {!user.email_confirmed && " · email non confirmé"}
                </span>
              </TableCell>
              <TableCell className="text-sm">
                {TIER_LABELS[user.tier] ?? user.tier}
                {user.founder_number && (
                  <span className="text-gold"> · Fondateur n° {user.founder_number}</span>
                )}
                {user.subscription_status && user.subscription_status !== "active" && (
                  <span className="ms-2">
                    <StatusBadge status={user.subscription_status} />
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {user.roles.map((r) => (
                    <Badge key={r} variant="outline">
                      {ROLE_LABELS[r]}
                    </Badge>
                  ))}
                  {user.suspended_at && <Badge variant="destructive">Suspendu</Badge>}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(user.created_at)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {(users ?? []).length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucun compte ne correspond.
        </p>
      )}
      <AdminPagination
        basePath="/admin/utilisateurs"
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        params={{ q, role, formule: tier, suspendus: suspended ? "1" : undefined }}
      />
    </>
  );
}
