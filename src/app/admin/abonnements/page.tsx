import Link from "next/link";
import { AlertTriangleIcon, CrownIcon, EuroIcon, UsersIcon } from "lucide-react";

import { adminCancelSubscriptionAction, refundInvoiceAction } from "@/actions/admin/billing";
import { BillingNav } from "@/components/admin/billing-nav";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminPageHeader, AdminPagination, StatCard, StatusBadge } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/action-form";
import { TextField } from "@/components/forms/form-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDate, formatPrice } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";
import { getUserEmails } from "@/server/admin/users";
import { getPaymentProvider } from "@/server/payments";

export const metadata = { title: "Abonnements" };

const STATUS: Record<string, string> = {
  active: "Actif",
  trialing: "Essai",
  past_due: "Paiement en attente",
  canceled: "Résilié",
  unpaid: "Impayé",
  incomplete: "Incomplet",
  incomplete_expired: "Expiré",
  paused: "En pause",
};
const PAGE_SIZE = 30;

export default async function SubscriptionsPage({ searchParams }: PageProps<"/admin/abonnements">) {
  const viewer = await requireStaff("billing.read", "/admin/abonnements");
  const canManage = viewer.staff.permissions.includes("billing.manage");
  const params = await searchParams;
  const status = typeof params.statut === "string" && params.statut in STATUS ? params.statut : "";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const page = Math.max(1, Number(params.page) || 1);
  const supabase = await createSupabaseServerClient();
  const provider = getPaymentProvider();

  let query = supabase
    .from("subscriptions")
    .select(
      "id, user_id, status, provider, provider_subscription_id, unit_amount_cents, currency, current_period_end, cancel_at_period_end, is_founder_rate, created_at, subscription_plans(name, tier), invoices(id, number, status, amount_paid_cents, amount_refunded_cents, currency, created_at)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) query = query.eq("status", status as "active");
  if (q.startsWith("sub_")) query = query.eq("provider_subscription_id", q);
  else if (q) {
    const { data: matches } = await supabase.rpc("admin_list_users", { p_search: q, p_limit: 50 });
    query = query.in(
      "user_id",
      (matches ?? []).map((m) => m.id).concat("00000000-0000-0000-0000-000000000000"),
    );
  }
  const [{ data: subscriptions, count }, active, pastDue, founders] = await Promise.all([
    query,
    supabase
      .from("subscriptions")
      .select("unit_amount_cents, provider, subscription_plans(tier)")
      .in("status", ["active", "trialing", "past_due"]),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "past_due"),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("is_founder_rate", true)
      .in("status", ["active", "trialing", "past_due"]),
  ]);
  const emails = await getUserEmails((subscriptions ?? []).map((s) => s.user_id));
  const paying = (active.data ?? []).filter((s) => s.provider !== "manual");
  const mrr = paying.reduce((sum, s) => sum + s.unit_amount_cents, 0);

  return (
    <>
      <AdminPageHeader
        title="Abonnements"
        description="L'accès n'est accordé qu'à réception des webhooks Stripe vérifiés, jamais depuis la page de retour du paiement. Les montants sont TTC."
      />
      <BillingNav active="/admin/abonnements" />
      {!provider ? (
        <Alert variant="warning" className="mb-6">
          <AlertTriangleIcon />
          <AlertTitle>Paiements non configurés</AlertTitle>
          <AlertDescription>
            Aucune clé Stripe n&apos;est renseignée : les souscriptions en ligne sont désactivées.
            Configurez des clés de TEST (voir docs/SERVICES_SETUP.md).
          </AlertDescription>
        </Alert>
      ) : (
        provider.testMode && (
          <Alert className="mb-6">
            <AlertTitle>Stripe en mode test</AlertTitle>
            <AlertDescription>
              Aucun paiement réel n&apos;est effectué. Le passage en mode réel exige une validation
              explicite (PAYMENTS_LIVE_MODE_ALLOWED).
            </AlertDescription>
          </Alert>
        )
      )}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Abonnements payants actifs" value={paying.length} icon={UsersIcon} />
        <StatCard
          label="Revenu mensuel récurrent (TTC)"
          value={formatPrice(mrr)}
          icon={EuroIcon}
          tone="success"
        />
        <StatCard
          label="Fondateurs actifs"
          value={founders.count ?? 0}
          icon={CrownIcon}
          tone="gold"
        />
        <StatCard
          label="Paiements en attente"
          value={pastDue.count ?? 0}
          icon={AlertTriangleIcon}
          tone={pastDue.count ? "warning" : undefined}
          href="/admin/abonnements?statut=past_due"
        />
      </div>
      <form className="mb-4 flex flex-wrap gap-3">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Email ou identifiant sub_…"
          className="max-w-xs"
        />
        <NativeSelect name="statut" defaultValue={status} className="w-56">
          <option value="">Tous les statuts</option>
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
      <ul className="space-y-2">
        {(subscriptions ?? []).map((s) => (
          <li key={s.id}>
            <details className="rounded-xl border bg-card/60">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <Link
                    href={`/admin/utilisateurs/${s.user_id}`}
                    className="font-medium hover:underline"
                  >
                    {emails.get(s.user_id) ?? s.user_id}
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}
                    · {s.subscription_plans?.name} ·{" "}
                    {s.provider === "manual"
                      ? "offert"
                      : `${formatPrice(s.unit_amount_cents, s.currency)} / mois`}
                    {s.is_founder_rate ? " · tarif fondateur" : ""} · échéance{" "}
                    {formatDate(s.current_period_end) || "—"}
                    {s.cancel_at_period_end ? " · résiliation programmée" : ""}
                  </span>
                </span>
                <StatusBadge status={s.status} label={STATUS[s.status]} />
              </summary>
              <div className="space-y-4 border-t p-4 text-sm">
                <p className="text-xs text-muted-foreground">
                  {s.provider === "stripe"
                    ? `Stripe : ${s.provider_subscription_id}`
                    : "Accès accordé manuellement"}{" "}
                  · créé le {formatDate(s.created_at)}
                </p>
                {canManage &&
                  s.provider === "stripe" &&
                  ["active", "trialing", "past_due"].includes(s.status) && (
                    <div className="flex flex-wrap gap-2">
                      {s.cancel_at_period_end ? (
                        <ConfirmAction
                          action={adminCancelSubscriptionAction.bind(null, s.id, "revoke")}
                          label="Annuler la résiliation"
                          title="Annuler la résiliation programmée ?"
                          description="L'abonnement continuera d'être renouvelé."
                        />
                      ) : (
                        <ConfirmAction
                          action={adminCancelSubscriptionAction.bind(null, s.id, "period_end")}
                          label="Résilier à l'échéance"
                          title="Programmer la résiliation ?"
                          description="L'accès reste ouvert jusqu'à la fin de la période payée."
                          withReason
                        />
                      )}
                      <ConfirmAction
                        action={adminCancelSubscriptionAction.bind(null, s.id, "immediate")}
                        label="Résilier immédiatement"
                        title="Résilier immédiatement ?"
                        description="L'accès payant cesse tout de suite. Pensez au remboursement éventuel de la période entamée."
                        withReason
                        destructive
                        variant="destructive"
                      />
                    </div>
                  )}
                {s.invoices.length > 0 && (
                  <ul className="divide-y rounded-lg border">
                    {[...s.invoices]
                      .sort((a, b) => b.created_at.localeCompare(a.created_at))
                      .slice(0, 6)
                      .map((invoice) => {
                        const refundable =
                          invoice.amount_paid_cents - invoice.amount_refunded_cents;
                        return (
                          <li
                            key={invoice.id}
                            className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
                          >
                            <span>
                              {invoice.number ?? invoice.id.slice(0, 8)} ·{" "}
                              {formatDate(invoice.created_at)} ·{" "}
                              {formatPrice(invoice.amount_paid_cents, invoice.currency)}
                              {invoice.amount_refunded_cents > 0 && (
                                <span className="text-warning">
                                  {" "}
                                  · remboursé{" "}
                                  {formatPrice(invoice.amount_refunded_cents, invoice.currency)}
                                </span>
                              )}
                            </span>
                            {canManage && provider && refundable > 0 && (
                              <ActionForm
                                action={refundInvoiceAction.bind(null, invoice.id)}
                                submitLabel="Rembourser"
                                submitVariant="outline"
                                className="flex flex-wrap items-end gap-2 space-y-0"
                              >
                                <TextField
                                  label="Montant (€)"
                                  name="amount"
                                  id={`amt-${invoice.id.slice(0, 8)}`}
                                  defaultValue={(refundable / 100).toFixed(2)}
                                  className="w-28"
                                />
                                <TextField
                                  label="Motif"
                                  name="reason"
                                  id={`rsn-${invoice.id.slice(0, 8)}`}
                                  required
                                  className="w-56"
                                />
                              </ActionForm>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
      {(subscriptions ?? []).length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucun abonnement pour ce filtre.
        </p>
      )}
      <AdminPagination
        basePath="/admin/abonnements"
        page={page}
        pageSize={PAGE_SIZE}
        total={count ?? 0}
        params={{ q, statut: status }}
      />
    </>
  );
}
