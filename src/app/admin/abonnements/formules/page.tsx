import { setPlanPriceAction, syncPlanPriceAction, updatePlanAction } from "@/actions/admin/billing";
import { ActionButton } from "@/components/admin/action-button";
import { BillingNav } from "@/components/admin/billing-nav";
import { AdminPageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/action-form";
import { Field, TextField } from "@/components/forms/form-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatPrice } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";

export const metadata = { title: "Formules et prix" };

export default async function PlansPage() {
  const viewer = await requireStaff("billing.read", "/admin/abonnements/formules");
  const canManage = viewer.staff.permissions.includes("billing.manage");
  const supabase = await createSupabaseServerClient();
  const [{ data: plans }, { data: prices }, { data: counts }] = await Promise.all([
    supabase.from("subscription_plans").select("*").order("sort_order"),
    supabase
      .from("plan_prices")
      .select("id, plan_id, amount_cents, currency, is_current, provider_price_id, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("plan_id, unit_amount_cents")
      .in("status", ["active", "trialing", "past_due"]),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Formules et prix"
        description="Présentation, limites et tarifs des formules. Chaque changement de prix est historisé."
      />
      <BillingNav active="/admin/abonnements/formules" />
      <Alert className="mb-6">
        <AlertTitle>Engagement envers les fondateurs</AlertTitle>
        <AlertDescription>
          Un nouveau prix ne s&apos;applique qu&apos;aux nouvelles souscriptions. Les abonnements en
          cours conservent leur tarif : un fondateur actif garde son prix et accède au catalogue
          Standard lors du lancement commercial, sans hausse automatique.
        </AlertDescription>
      </Alert>
      <div className="space-y-6">
        {(plans ?? []).map((plan) => {
          const history = (prices ?? []).filter((p) => p.plan_id === plan.id);
          const current = history.find((p) => p.is_current);
          const subscribers = (counts ?? []).filter((c) => c.plan_id === plan.id);
          const legacy = subscribers.filter(
            (s) =>
              current && s.unit_amount_cents !== current.amount_cents && s.unit_amount_cents > 0,
          ).length;
          const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
          return (
            <section key={plan.id} className="rounded-xl border bg-card/60 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                  {plan.name} <Badge variant="outline">{plan.code}</Badge>
                  {!plan.is_active && <Badge variant="warning">Inactive</Badge>}
                  {!plan.is_public && <Badge variant="muted">Masquée</Badge>}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(plan.price_cents, plan.currency)} / mois · {subscribers.length}{" "}
                  abonné(s) actif(s)
                  {legacy > 0 ? ` dont ${legacy} à un ancien tarif conservé` : ""}
                </p>
              </div>
              <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
                {canManage ? (
                  <ActionForm
                    action={updatePlanAction.bind(null, plan.id)}
                    submitLabel="Enregistrer la formule"
                    submitVariant="secondary"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField
                        label="Nom"
                        name="name"
                        id={`n-${plan.code}`}
                        required
                        maxLength={60}
                        defaultValue={plan.name}
                      />
                      <TextField
                        label="Accroche"
                        name="tagline"
                        id={`t-${plan.code}`}
                        maxLength={160}
                        defaultValue={plan.tagline ?? ""}
                      />
                    </div>
                    <Field label="Description" name={`d-${plan.code}`}>
                      <Textarea
                        id={`d-${plan.code}`}
                        name="description"
                        maxLength={1000}
                        defaultValue={plan.description ?? ""}
                      />
                    </Field>
                    <Field label="Avantages (un par ligne)" name={`f-${plan.code}`}>
                      <Textarea
                        id={`f-${plan.code}`}
                        name="features"
                        defaultValue={features.join("\n")}
                        className="min-h-28"
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-4">
                      <TextField
                        label="Écrans simultanés"
                        name="max_streams"
                        id={`s-${plan.code}`}
                        type="number"
                        min={1}
                        max={10}
                        defaultValue={plan.max_streams}
                      />
                      <TextField
                        label="Profils"
                        name="max_profiles"
                        id={`p-${plan.code}`}
                        type="number"
                        min={1}
                        max={10}
                        defaultValue={plan.max_profiles}
                      />
                      <Field label="Qualité max." name={`q-${plan.code}`}>
                        <NativeSelect
                          id={`q-${plan.code}`}
                          name="max_quality"
                          defaultValue={plan.max_quality}
                        >
                          <option value="sd">SD</option>
                          <option value="hd">HD 720p</option>
                          <option value="fhd">Full HD</option>
                          <option value="uhd">Ultra HD</option>
                        </NativeSelect>
                      </Field>
                      <TextField
                        label="Ordre"
                        name="sort_order"
                        id={`o-${plan.code}`}
                        type="number"
                        min={0}
                        defaultValue={plan.sort_order}
                      />
                    </div>
                    <fieldset className="flex flex-wrap gap-4 text-sm">
                      <legend className="sr-only">Options</legend>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="phases"
                          value="founder"
                          defaultChecked={plan.available_in_phases.includes("founder")}
                          className="size-4 accent-primary"
                        />{" "}
                        Proposée en phase fondateur
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="phases"
                          value="commercial"
                          defaultChecked={plan.available_in_phases.includes("commercial")}
                          className="size-4 accent-primary"
                        />{" "}
                        Proposée en phase commerciale
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="is_active"
                          defaultChecked={plan.is_active}
                          className="size-4 accent-primary"
                        />{" "}
                        Souscription ouverte
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="is_public"
                          defaultChecked={plan.is_public}
                          className="size-4 accent-primary"
                        />{" "}
                        Affichée sur la page des offres
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="includes_ads"
                          defaultChecked={plan.includes_ads}
                          className="size-4 accent-primary"
                        />{" "}
                        Avec publicité
                      </label>
                    </fieldset>
                  </ActionForm>
                ) : (
                  <p className="text-sm text-muted-foreground">Lecture seule.</p>
                )}
                <div className="space-y-4">
                  {canManage && (
                    <div className="rounded-lg border p-4">
                      <h3 className="mb-3 text-sm font-semibold">
                        Nouveau prix (nouvelles souscriptions)
                      </h3>
                      <ActionForm
                        action={setPlanPriceAction.bind(null, plan.id)}
                        submitLabel="Appliquer"
                        submitVariant="secondary"
                        resetOnSuccess
                      >
                        <TextField
                          label="Prix mensuel TTC (€)"
                          name="amount"
                          id={`a-${plan.code}`}
                          inputMode="decimal"
                          required
                          defaultValue={(plan.price_cents / 100).toFixed(2)}
                        />
                        <label className="flex items-start gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            name="acknowledge"
                            className="mt-0.5 size-4 accent-primary"
                            required
                          />
                          Je comprends que ce prix ne s&apos;applique qu&apos;aux nouvelles
                          souscriptions et ne modifie aucun abonnement en cours.
                        </label>
                      </ActionForm>
                    </div>
                  )}
                  <div className="rounded-lg border p-4 text-sm">
                    <h3 className="mb-2 font-semibold">Historique des prix</h3>
                    <ul className="space-y-1 text-xs">
                      {history.map((price) => (
                        <li key={price.id} className="flex items-center justify-between gap-2">
                          <span>
                            {formatPrice(price.amount_cents, price.currency)} ·{" "}
                            {formatDate(price.created_at)}
                            {price.is_current && (
                              <Badge variant="success" className="ms-2">
                                Actuel
                              </Badge>
                            )}
                          </span>
                          <span className="text-muted-foreground">
                            {price.provider_price_id
                              ? "Stripe ✓"
                              : price.is_current
                                ? "non synchronisé"
                                : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {canManage && current && !current.provider_price_id && (
                      <ActionButton
                        action={syncPlanPriceAction.bind(null, plan.id)}
                        className="mt-3"
                      >
                        Synchroniser avec Stripe
                      </ActionButton>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
