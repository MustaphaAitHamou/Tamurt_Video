import { AlertTriangleIcon } from "lucide-react";

import { addFinanceEntryAction, deleteFinanceEntryAction, updateCostSettingsAction } from "@/actions/admin/operations";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/action-form";
import { Field, TextField } from "@/components/forms/form-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, formatPrice } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";
import { getFinanceSummary } from "@/server/metrics";

export const metadata = { title: "Finances" };

const CATEGORY_LABELS: Record<string, string> = {
  subscription_revenue: "Revenus d'abonnement (hors Stripe)",
  ad_revenue: "Revenus publicitaires",
  other_revenue: "Autres revenus",
  payment_fees: "Frais de paiement",
  hosting: "Hébergement",
  streaming: "Diffusion vidéo",
  storage: "Stockage",
  email: "Emails transactionnels",
  tools: "Outils et logiciels",
  content_licenses: "Droits de diffusion (licences)",
  other_cost: "Autres coûts",
};

function monthRange(value: string | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getUTCFullYear();
  const month = match ? Number(match[2]) - 1 : now.getUTCMonth();
  const from = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  return { from, to: end > now ? now : end, label: `${year}-${String(month + 1).padStart(2, "0")}` };
}

const pct = (value: number | null) => (value === null ? "—" : `${Math.round(value * 100)} %`);

export default async function FinancesPage({ searchParams }: PageProps<"/admin/finances">) {
  const viewer = await requireStaff("finance.read", "/admin/finances");
  const canWrite = viewer.staff.permissions.includes("finance.write");
  const canSettings = viewer.staff.permissions.includes("settings.write");
  const { mois } = await searchParams;
  const range = monthRange(typeof mois === "string" ? mois : undefined);
  const supabase = await createSupabaseServerClient();
  const [summary, { data: entries }] = await Promise.all([
    getFinanceSummary(range.from, range.to),
    supabase.from("finance_entries").select("*").eq("period_month", `${range.label}-01`).order("created_at", { ascending: false }),
  ]);
  const { model } = summary;

  return (
    <>
      <AdminPageHeader
        title="Finances"
        description="Revenus et coûts séparés. Les coûts de diffusion et de stockage sont des estimations calculées à partir des hypothèses ci-dessous : les montants exacts figurent sur les factures des prestataires."
        actions={
          <form className="flex items-center gap-2">
            <Input type="month" name="mois" defaultValue={range.label} aria-label="Mois" className="h-9 w-44" />
            <Button type="submit" variant="secondary" size="sm">
              Afficher
            </Button>
          </form>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenus de la période" value={formatPrice(summary.totalRevenue)} tone="success" hint="Abonnements encaissés nets des remboursements + saisies manuelles" />
        <StatCard label="Coûts de la période" value={formatPrice(summary.totalCosts)} hint="Frais, hébergement, diffusion (estimée), stockage, licences…" />
        <StatCard label="Résultat" value={formatPrice(summary.result)} tone={summary.result < 0 ? "danger" : "success"} />
        <StatCard
          label="Coût par abonné / par spectateur actif"
          value={`${summary.costPerSubscriberCents !== null ? formatPrice(summary.costPerSubscriberCents) : "—"} / ${summary.costPerActiveUserCents !== null ? formatPrice(summary.costPerActiveUserCents) : "—"}`}
        />
        <StatCard label="Minutes regardées" value={formatNumber(summary.metrics.streaming.minutes_watched)} hint={`${summary.metrics.streaming.unique_viewers} spectateurs uniques`} />
        <StatCard label="Minutes stockées (catalogue)" value={formatNumber(summary.metrics.catalog.media_minutes_stored)} />
        <StatCard label="Frais de paiement" value={formatPrice(summary.costs.paymentFees)} />
        <StatCard label="Coûts fixes mensuels déclarés" value={formatPrice(summary.fixedCosts)} />
      </div>

      {summary.risks.length > 0 && (
        <Alert variant="warning" className="mb-6">
          <AlertTriangleIcon />
          <AlertTitle>Points de vigilance</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-1 ps-4">
              {summary.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <section className="mb-8">
        <h2 className="mb-1 text-lg font-semibold">Marge par formule (période)</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Abonnés payants uniquement : {summary.metrics.subscriptions.manual} accès offert(s) en cours, sans revenu, ne sont pas comptés ici.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Formule</TableHead>
              <TableHead className="text-end">Abonnés</TableHead>
              <TableHead className="text-end">Revenu</TableHead>
              <TableHead className="text-end">Frais de paiement</TableHead>
              <TableHead className="text-end">Diffusion (est.)</TableHead>
              <TableHead className="text-end">Part des coûts fixes</TableHead>
              <TableHead className="text-end">Marge</TableHead>
              <TableHead className="text-end">Seuil (min/abonné)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.economics.map((plan) => (
              <TableRow key={plan.code}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell className="text-end tabular-nums">{plan.activeSubscribers}</TableCell>
                <TableCell className="text-end tabular-nums">{formatPrice(plan.revenueCents)}</TableCell>
                <TableCell className="text-end tabular-nums">{formatPrice(plan.paymentFeesCents)}</TableCell>
                <TableCell className="text-end tabular-nums">{formatPrice(plan.streamingCostCents)}</TableCell>
                <TableCell className="text-end tabular-nums">{formatPrice(plan.fixedCostShareCents)}</TableCell>
                <TableCell className={`text-end tabular-nums ${plan.marginCents < 0 ? "text-destructive" : ""}`}>
                  {formatPrice(plan.marginCents)} <span className="text-xs text-muted-foreground">({pct(plan.marginRate)})</span>
                </TableCell>
                <TableCell className="text-end tabular-nums">{plan.breakEvenMinutesPerSubscriber !== null ? formatNumber(plan.breakEvenMinutesPerSubscriber) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-2 text-xs text-muted-foreground">
          Seuil : minutes de visionnage mensuelles par abonné au-delà desquelles le coût de diffusion dépasse le revenu net de frais (hors coûts fixes et droits). Coût d&apos;une minute diffusée :{" "}
          {((model.streamDeliveredUsdPer1000Min * model.usdToEurRate) / 1000).toFixed(5)} €.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border bg-card/60 p-5">
          <h2 className="mb-1 font-semibold">Écritures manuelles · {range.label}</h2>
          <p className="mb-4 text-xs text-muted-foreground">Factures d&apos;hébergement, droits versés, revenus publicitaires… Les encaissements Stripe sont importés automatiquement.</p>
          <ul className="mb-4 divide-y text-sm">
            {(entries ?? []).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  {CATEGORY_LABELS[entry.category]} · <span className="font-medium">{formatPrice(entry.amount_cents)}</span>
                  {entry.description && <span className="block text-xs text-muted-foreground">{entry.description}</span>}
                </span>
                {canWrite && <ConfirmAction action={deleteFinanceEntryAction.bind(null, entry.id)} label="Supprimer" title="Supprimer cette écriture ?" description="Action journalisée." variant="ghost" />}
              </li>
            ))}
            {(entries ?? []).length === 0 && <li className="py-2 text-muted-foreground">Aucune écriture.</li>}
          </ul>
          {canWrite && (
            <ActionForm action={addFinanceEntryAction} submitLabel="Ajouter" submitVariant="secondary" resetOnSuccess>
              <div className="grid gap-3 sm:grid-cols-3">
                <TextField label="Mois" name="period_month" type="month" required defaultValue={range.label} />
                <Field label="Catégorie" name="category">
                  <NativeSelect id="category" name="category" defaultValue="hosting">
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <TextField label="Montant TTC (€)" name="amount" inputMode="decimal" required />
              </div>
              <TextField label="Libellé" name="description" maxLength={300} />
            </ActionForm>
          )}
        </section>
        <section className="rounded-xl border bg-card/60 p-5">
          <h2 className="mb-1 font-semibold">Hypothèses de coûts</h2>
          <p className="mb-4 text-xs text-muted-foreground">À vérifier sur les grilles tarifaires en vigueur des prestataires (aucune ressource payante n&apos;est créée automatiquement).</p>
          {canSettings ? (
            <ActionForm action={updateCostSettingsAction} submitLabel="Enregistrer" submitVariant="secondary">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Diffusion : USD / 1 000 min regardées" name="delivered" inputMode="decimal" defaultValue={String(model.streamDeliveredUsdPer1000Min)} />
                <TextField label="Stockage : USD / 1 000 min stockées / mois" name="stored" inputMode="decimal" defaultValue={String(model.streamStoredUsdPer1000Min)} />
                <TextField label="Taux USD → EUR" name="usd_eur" inputMode="decimal" defaultValue={String(model.usdToEurRate)} />
                <TextField label="Commission de paiement (%)" name="fee_percent" inputMode="decimal" defaultValue={String(model.paymentFeePercent)} />
                <TextField label="Part fixe par paiement (centimes)" name="fee_fixed" inputMode="numeric" defaultValue={String(model.paymentFeeFixedCents)} />
              </div>
              <p className="text-sm font-medium">Coûts fixes mensuels (€)</p>
              <div className="grid gap-3 sm:grid-cols-5">
                {[
                  ["hosting", "Hébergement"],
                  ["database", "Base de données"],
                  ["email", "Emails"],
                  ["domain", "Domaine"],
                  ["other", "Autres"],
                ].map(([key, label]) => (
                  <TextField key={key} label={label!} name={`fixed_${key}`} inputMode="decimal" defaultValue={model.fixedMonthlyCostsCents[key!] ? (model.fixedMonthlyCostsCents[key!]! / 100).toFixed(2) : ""} />
                ))}
              </div>
            </ActionForm>
          ) : (
            <p className="text-sm text-muted-foreground">Réservé aux administrateurs.</p>
          )}
        </section>
      </div>
    </>
  );
}
