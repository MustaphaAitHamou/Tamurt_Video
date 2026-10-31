import Link from "next/link";
import {
  AlertTriangleIcon,
  BadgeEuroIcon,
  ClapperboardIcon,
  CrownIcon,
  FilmIcon,
  GemIcon,
  HourglassIcon,
  MessagesSquareIcon,
  PlayCircleIcon,
  ReceiptIcon,
  ScaleIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";

import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { formatDateTime, formatNumber, formatPrice } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";
import { getFinanceSummary } from "@/server/metrics";

export const metadata = { title: "Tableau de bord" };

export default async function AdminDashboardPage() {
  const viewer = await requireStaff("admin.access", "/admin");
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  const finance = await getFinanceSummary(from, to);
  const m = finance.metrics;
  const can = (p: string) => viewer.staff.permissions.includes(p as never);
  const supabase = await createSupabaseServerClient();
  const { data: recent } = can("audit.read")
    ? await supabase.from("audit_logs").select("id, action, entity_type, entity_id, created_at").order("created_at", { ascending: false }).limit(8)
    : { data: [] };
  const eur = (cents: number) => formatPrice(cents, "EUR");

  const alerts = [
    m.catalog.licenses_expiring_30d > 0 && { label: `${m.catalog.licenses_expiring_30d} licence(s) expirent dans les 30 jours`, href: "/admin/droits?filtre=expiration" },
    m.catalog.claims_open > 0 && { label: `${m.catalog.claims_open} réclamation(s) de contenu à traiter`, href: "/admin/droits/reclamations" },
    m.revenue.webhook_failures > 0 && { label: `${m.revenue.webhook_failures} webhook(s) de paiement en échec`, href: "/admin/abonnements/evenements" },
    m.subscriptions.past_due > 0 && { label: `${m.subscriptions.past_due} abonnement(s) en défaut de paiement`, href: "/admin/abonnements?statut=past_due" },
    m.incidents.open > 0 && { label: `${m.incidents.open} incident(s) technique(s) ouvert(s)`, href: "/admin/parametres#incidents" },
    m.catalog.demo_titles > 0 && { label: `${m.catalog.demo_titles} œuvre(s) de démonstration présentes : à retirer avant la production`, href: "/admin/catalogue?statut=demo" },
  ].filter((a): a is { label: string; href: string } => Boolean(a));

  return (
    <>
      <AdminPageHeader title="Tableau de bord" description="Indicateurs des 30 derniers jours. Les coûts sont des estimations fondées sur les paramètres financiers." />

      {alerts.length > 0 && (
        <ul className="mb-6 space-y-2">
          {alerts.map((alert) => (
            <li key={alert.href}>
              <Link href={alert.href} className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-warning hover:bg-warning/15">
                <AlertTriangleIcon className="size-4 shrink-0" /> {alert.label}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section aria-label="Abonnés" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Utilisateurs" value={formatNumber(m.users.total)} hint={`+${m.users.new_in_period} sur 30 j`} icon={UsersIcon} href={can("users.read") ? "/admin/utilisateurs" : undefined} />
        <StatCard label="Fondateurs actifs" value={m.subscriptions.founder} icon={CrownIcon} tone="gold" />
        <StatCard label="Abonnés Standard" value={m.subscriptions.standard} icon={GemIcon} />
        <StatCard label="Abonnés Premium" value={m.subscriptions.premium} icon={GemIcon} />
        <StatCard label="Revenu récurrent (MRR)" value={eur(m.subscriptions.mrr_cents)} hint="Abonnements payants actifs" icon={BadgeEuroIcon} tone="success" />
        <StatCard label="Échecs de paiement" value={m.revenue.payment_failures} hint={`${m.subscriptions.past_due} en période de grâce`} icon={ReceiptIcon} tone={m.revenue.payment_failures ? "warning" : undefined} />
      </section>

      <section aria-label="Finances" className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Chiffre d'affaires brut (30 j)" value={eur(m.revenue.gross_paid_cents)} hint={`${m.revenue.invoices_paid} facture(s) payée(s)`} icon={WalletIcon} href={can("finance.read") ? "/admin/finances" : undefined} />
        <StatCard label="Coûts estimés (30 j)" value={eur(finance.totalCosts)} hint="Diffusion, stockage, frais, coûts fixes" icon={WalletIcon} />
        <StatCard label="Résultat estimé" value={eur(finance.result)} tone={finance.result < 0 ? "danger" : "success"} icon={WalletIcon} />
        <StatCard label="Coût par abonné" value={finance.costPerSubscriberCents !== null ? eur(finance.costPerSubscriberCents) : "—"} icon={WalletIcon} />
      </section>

      <section aria-label="Catalogue et diffusion" className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Œuvres publiées" value={m.catalog.titles_published} hint={`${m.catalog.titles_announced} annoncée(s)`} icon={FilmIcon} href={can("catalog.read_all") ? "/admin/catalogue" : undefined} />
        <StatCard label="Vidéos prêtes" value={m.catalog.media_ready} hint={`${m.catalog.media_minutes_stored} min stockées (Cloudflare)`} icon={ClapperboardIcon} />
        <StatCard label="Minutes diffusées" value={formatNumber(m.streaming.minutes_watched)} hint={`${m.streaming.unique_viewers} spectateur(s)`} icon={PlayCircleIcon} />
        <StatCard label="Lectures en cours" value={m.streaming.active_streams_now} icon={PlayCircleIcon} />
        <StatCard label="Licences expirant (30 j)" value={m.catalog.licenses_expiring_30d} icon={ScaleIcon} tone={m.catalog.licenses_expiring_30d ? "warning" : undefined} href={can("rights.read") ? "/admin/droits" : undefined} />
        <StatCard label="Demandes ouvertes" value={m.requests.open} hint={`${m.requests.votes_in_period} vote(s) sur 30 j`} icon={MessagesSquareIcon} href="/admin/demandes" />
      </section>

      {finance.risks.length > 0 && can("finance.read") && (
        <section className="mt-6 rounded-xl border bg-card/60 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <HourglassIcon className="size-4 text-gold" /> Points de vigilance sur la rentabilité
          </h2>
          <ul className="list-disc space-y-1.5 ps-5 text-sm text-muted-foreground">
            {finance.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </section>
      )}

      {recent && recent.length > 0 && (
        <section className="mt-6 rounded-xl border bg-card/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Activité récente</h2>
            <Link href="/admin/audit" className="text-sm text-muted-foreground hover:text-foreground">
              Journal complet
            </Link>
          </div>
          <ul className="divide-y text-sm">
            {recent.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-4 py-2">
                <span>
                  <span className="font-mono text-xs text-primary">{entry.action}</span> · {entry.entity_type}
                </span>
                <time className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
