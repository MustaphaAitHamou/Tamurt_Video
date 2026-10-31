import Link from "next/link";
import { notFound } from "next/navigation";

import { endManualSubscriptionAction, grantManualSubscriptionAction, setSuspensionAction, setUserRoleAction } from "@/actions/admin/users";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminPageHeader, StatusBadge } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/action-form";
import { Field, TextField } from "@/components/forms/form-fields";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { ROLE_LABELS, type AppRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";
import { uuidPattern } from "@/server/admin/guard";

export const metadata = { title: "Compte utilisateur" };

const TIER_LABELS: Record<string, string> = { free: "Gratuit", founder: "Fondateur", standard: "Standard", premium: "Premium" };
const SUB_STATUS: Record<string, string> = {
  active: "Actif",
  trialing: "Essai",
  past_due: "Paiement en attente",
  canceled: "Résilié",
  unpaid: "Impayé",
  incomplete: "Incomplet",
  incomplete_expired: "Expiré",
  paused: "En pause",
};

export default async function AdminUserPage({ params }: PageProps<"/admin/utilisateurs/[id]">) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const viewer = await requireStaff("users.read", `/admin/utilisateurs/${id}`);
  const can = (p: "users.manage" | "billing.manage" | "billing.read" | "audit.read") => viewer.staff.permissions.includes(p);
  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase.rpc("admin_list_users", { p_search: id, p_limit: 1 });
  const user = rows?.find((r) => r.id === id);
  if (!user) notFound();
  const [{ data: profile }, { data: entitlements }, subscriptions, invoices, plans, audit, watch] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.rpc("admin_get_entitlements", { p_user: id }),
    can("billing.read")
      ? supabase.from("subscriptions").select("id, status, provider, provider_subscription_id, unit_amount_cents, currency, current_period_start, current_period_end, cancel_at_period_end, is_founder_rate, note, created_at, subscription_plans(name)").eq("user_id", id).order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    can("billing.read")
      ? supabase.from("invoices").select("id, number, status, amount_paid_cents, amount_refunded_cents, currency, created_at, hosted_invoice_url").eq("user_id", id).order("created_at", { ascending: false }).limit(24)
      : Promise.resolve({ data: null }),
    can("billing.manage") ? supabase.from("subscription_plans").select("id, name, tier").order("sort_order") : Promise.resolve({ data: null }),
    can("audit.read") ? supabase.from("audit_logs").select("id, action, entity_type, created_at, actor_id").or(`actor_id.eq.${id},entity_id.eq.${id}`).order("created_at", { ascending: false }).limit(30) : Promise.resolve({ data: null }),
    // Historique privé (RLS propriétaire) : décompte agrégé lu avec le rôle serveur, après contrôle « users.read ».
    createSupabaseAdminClient().from("watch_history").select("id", { count: "exact", head: true }).eq("account_id", id),
  ]);
  const entitlement = entitlements?.[0];
  const isSelf = viewer.user.id === id;

  return (
    <>
      <AdminPageHeader
        title={user.email}
        description={`Inscrit le ${formatDateTime(user.created_at)} · dernière connexion ${user.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : "jamais"} · identifiant ${user.id}`}
        actions={
          <>
            {!user.email_confirmed && <Badge variant="warning">Email non confirmé</Badge>}
            {user.suspended_at && <Badge variant="destructive">Suspendu depuis le {formatDate(user.suspended_at)}</Badge>}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <section className="rounded-xl border bg-card/60 p-5">
            <h2 className="mb-3 font-semibold">Accès en vigueur</h2>
            {entitlement ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Niveau d&apos;accès</dt>
                  <dd className="font-medium">{TIER_LABELS[entitlement.tier]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Formule</dt>
                  <dd>
                    {entitlement.plan_name ?? "—"}
                    {entitlement.is_founder_rate && <span className="text-gold"> · tarif fondateur</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Accès jusqu&apos;au</dt>
                  <dd>
                    {entitlement.access_until ? formatDateTime(entitlement.access_until) : "—"}
                    {entitlement.in_grace && <span className="text-warning"> · période de grâce</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Écrans / profils / qualité</dt>
                  <dd>
                    {entitlement.max_streams} / {entitlement.max_profiles} / {entitlement.max_quality}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Fondateur</dt>
                  <dd>{entitlement.founder_number ? `n° ${entitlement.founder_number} depuis le ${formatDate(entitlement.founder_since)}` : "Non"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Pays déclaré</dt>
                  <dd>{profile?.country_code ?? "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune information.</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">Lectures enregistrées : {watch.count ?? 0}</p>
          </section>

          {subscriptions.data && (
            <section className="rounded-xl border bg-card/60 p-5">
              <h2 className="mb-3 font-semibold">Abonnements</h2>
              {subscriptions.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun abonnement.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {subscriptions.data.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <span>
                        <span className="font-medium">{s.subscription_plans?.name}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {s.provider === "manual" ? "offert" : `${formatPrice(s.unit_amount_cents, s.currency)} / mois`}
                          {s.is_founder_rate ? " · tarif fondateur" : ""} · du {formatDate(s.current_period_start)} au {formatDate(s.current_period_end)}
                          {s.cancel_at_period_end ? " · résiliation programmée" : ""}
                        </span>
                        {s.note && <span className="block text-xs text-muted-foreground">Note : {s.note}</span>}
                      </span>
                      <span className="flex items-center gap-2">
                        <StatusBadge status={s.status} label={SUB_STATUS[s.status]} />
                        {s.provider === "manual" && s.status === "active" && can("billing.manage") && (
                          <ConfirmAction action={endManualSubscriptionAction.bind(null, s.id, id)} label="Terminer" title="Mettre fin à l'accès offert ?" description="L'accès correspondant est retiré immédiatement." variant="ghost" />
                        )}
                        {s.provider === "stripe" && (
                          <Link href={`/admin/abonnements?q=${encodeURIComponent(s.provider_subscription_id ?? "")}`} className="text-xs underline">
                            Gérer
                          </Link>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {invoices.data && invoices.data.length > 0 && (
            <section className="rounded-xl border bg-card/60 p-5">
              <h2 className="mb-3 font-semibold">Factures</h2>
              <ul className="divide-y text-sm">
                {invoices.data.map((invoice) => (
                  <li key={invoice.id} className="flex items-center justify-between gap-2 py-2">
                    <span>
                      {invoice.number ?? invoice.id.slice(0, 8)} · {formatDate(invoice.created_at)}
                    </span>
                    <span className="flex items-center gap-2">
                      {formatPrice(invoice.amount_paid_cents, invoice.currency)}
                      {invoice.amount_refunded_cents > 0 && <span className="text-xs text-warning">remboursé {formatPrice(invoice.amount_refunded_cents, invoice.currency)}</span>}
                      <StatusBadge status={invoice.status === "paid" ? "active" : invoice.status} label={invoice.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {audit.data && (
            <section className="rounded-xl border bg-card/60 p-5">
              <h2 className="mb-3 font-semibold">Journal (30 dernières entrées)</h2>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {audit.data.map((entry) => (
                  <li key={entry.id}>
                    {formatDateTime(entry.created_at)} · {entry.action} · {entry.entity_type}
                    {entry.actor_id && entry.actor_id !== id ? " (par l'équipe)" : ""}
                  </li>
                ))}
                {audit.data.length === 0 && <li>Aucune entrée.</li>}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="space-y-3 rounded-xl border bg-card/60 p-5">
            <h2 className="font-semibold">Rôles d&apos;administration</h2>
            <p className="text-xs text-muted-foreground">Chaque rôle donne un ensemble précis d&apos;habilitations, vérifiées par le serveur et la base de données.</p>
            <ul className="space-y-2">
              {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => {
                const has = user.roles.includes(role);
                return (
                  <li key={role} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {ROLE_LABELS[role]} {has && <Badge variant="success">Attribué</Badge>}
                    </span>
                    {can("users.manage") && (
                      <ConfirmAction
                        action={setUserRoleAction.bind(null, id, role, !has)}
                        label={has ? "Retirer" : "Attribuer"}
                        title={has ? `Retirer le rôle « ${ROLE_LABELS[role]} » ?` : `Attribuer le rôle « ${ROLE_LABELS[role]} » ?`}
                        description={has ? "L'accès correspondant est retiré immédiatement." : "La personne pourra accéder à l'administration avec les habilitations de ce rôle. L'action est journalisée."}
                        variant={has ? "ghost" : "outline"}
                        destructive={has}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {can("users.manage") && !isSelf && (
            <section className="space-y-3 rounded-xl border bg-card/60 p-5">
              <h2 className="font-semibold">Suspension</h2>
              {user.suspended_at ? (
                <>
                  <p className="text-sm text-muted-foreground">Motif : {profile?.suspension_reason ?? "—"}</p>
                  <ConfirmAction action={setSuspensionAction.bind(null, id, false)} label="Lever la suspension" title="Lever la suspension ?" description="Le compte retrouve ses accès." />
                </>
              ) : (
                <ConfirmAction
                  action={setSuspensionAction.bind(null, id, true)}
                  label="Suspendre le compte"
                  title="Suspendre ce compte ?"
                  description="La lecture et l'accès au compte sont bloqués. L'abonnement éventuel n'est pas résilié automatiquement : traitez-le séparément si nécessaire."
                  withReason
                  destructive
                  variant="destructive"
                />
              )}
            </section>
          )}

          {plans.data && (
            <section className="rounded-xl border bg-card/60 p-5">
              <h2 className="mb-1 font-semibold">Offrir un accès</h2>
              <p className="mb-4 text-xs text-muted-foreground">Partenaires, presse ou comptes de test : aucun paiement, date de fin obligatoire.</p>
              <ActionForm action={grantManualSubscriptionAction.bind(null, id)} submitLabel="Offrir l'accès" submitVariant="secondary" resetOnSuccess>
                <Field label="Formule" name="plan_id">
                  <NativeSelect id="plan_id" name="plan_id" defaultValue={plans.data.find((p) => p.tier === "standard")?.id}>
                    {plans.data.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <TextField label="Jusqu'au" name="until" type="date" required />
                <TextField label="Motif" name="note" required maxLength={500} placeholder="Ex. : accès presse, festival…" />
              </ActionForm>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
