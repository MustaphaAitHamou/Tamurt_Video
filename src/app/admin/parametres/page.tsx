import { CheckCircle2Icon, CircleDashedIcon, TriangleAlertIcon } from "lucide-react";

import {
  saveIncidentAction,
  setLaunchPhaseAction,
  updateLegalEntityAction,
  updatePlatformSettingsAction,
} from "@/actions/admin/operations";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminPageHeader, StatusBadge } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/action-form";
import { Field, TextField } from "@/components/forms/form-fields";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { getEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";
import { getPaymentProvider } from "@/server/payments";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Paramètres" };

const COMPONENTS: Record<string, string> = {
  platform: "Plateforme",
  streaming: "Diffusion vidéo",
  payments: "Paiements",
  auth: "Connexion",
  email: "Emails",
  database: "Base de données",
};
const SEVERITY: Record<string, string> = { minor: "Mineur", major: "Majeur", critical: "Critique" };
const INCIDENT_STATUS: Record<string, string> = {
  open: "Ouvert",
  monitoring: "Sous surveillance",
  resolved: "Résolu",
};

function Toggle({
  name,
  label,
  hint,
  checked,
}: {
  name: string;
  label: string;
  hint?: string;
  checked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="mt-0.5 size-4 accent-primary"
      />
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

function IntegrationRow({
  label,
  state,
  detail,
}: {
  label: string;
  state: "ok" | "partial" | "off";
  detail: string;
}) {
  const Icon =
    state === "ok" ? CheckCircle2Icon : state === "partial" ? TriangleAlertIcon : CircleDashedIcon;
  return (
    <li className="flex items-start gap-3 py-2.5 text-sm">
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${state === "ok" ? "text-success" : state === "partial" ? "text-warning" : "text-muted-foreground"}`}
      />
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </li>
  );
}

export default async function SettingsPage() {
  await requireStaff("settings.write", "/admin/parametres");
  const settings = await getSettings();
  const env = getEnv();
  const payments = getPaymentProvider();
  const supabase = await createSupabaseServerClient();
  const { data: incidents } = await supabase
    .from("incidents")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(30);
  const entity = settings.legalEntity;

  return (
    <>
      <AdminPageHeader
        title="Paramètres"
        description="Configuration générale de la plateforme. Chaque modification est journalisée."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <section className="rounded-xl border bg-card/60 p-5">
            <h2 className="mb-1 flex items-center gap-2 font-semibold">
              Phase de lancement{" "}
              <Badge variant={settings.launchPhase === "commercial" ? "success" : "gold"}>
                {settings.launchPhase === "commercial" ? "Commerciale" : "Fondateur"}
              </Badge>
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              En phase fondateur, l&apos;accueil présente le projet et l&apos;abonnement de soutien.
              Le passage en phase commerciale ouvre les formules Standard et Premium ; les
              fondateurs actifs accèdent au catalogue Standard à leur tarif, sans hausse.
            </p>
            {settings.launchPhase === "founder" ? (
              <ConfirmAction
                action={setLaunchPhaseAction.bind(null, "commercial")}
                label="Passer en phase commerciale"
                title="Lancer la phase commerciale ?"
                description="À ne faire qu'une fois le catalogue sous licence prêt, les pages légales validées par un professionnel et les paiements réels explicitement autorisés. Saisissez LANCEMENT pour confirmer."
                withReason
                reasonLabel="Confirmation"
                reasonPlaceholder="LANCEMENT"
              />
            ) : (
              <ConfirmAction
                action={setLaunchPhaseAction.bind(null, "founder")}
                label="Revenir en phase fondateur"
                title="Revenir en phase fondateur ?"
                description="Les formules commerciales ne sont plus proposées aux nouveaux clients."
              />
            )}
          </section>

          <section className="rounded-xl border bg-card/60 p-5">
            <h2 className="mb-4 font-semibold">Fonctionnement</h2>
            <ActionForm
              action={updatePlatformSettingsAction}
              submitLabel="Enregistrer"
              submitVariant="secondary"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <Toggle
                  name="founder_signups_open"
                  label="Souscriptions fondateur ouvertes"
                  checked={settings.founderSignupsOpen}
                />
                <Toggle
                  name="admin_mfa_required"
                  label="Double authentification obligatoire pour l'équipe"
                  hint="Fortement recommandé en production."
                  checked={settings.adminMfaRequired}
                />
                <Toggle
                  name="hide_unlicensed_titles"
                  label="Masquer les œuvres sans droits dans le pays du visiteur"
                  checked={settings.hideUnlicensedTitles}
                />
                <Toggle
                  name="show_demo_content"
                  label="Afficher les contenus de démonstration"
                  hint="Œuvres fictives : à désactiver avant toute ouverture publique."
                  checked={settings.showDemoContent}
                />
                <Toggle
                  name="maintenance_mode"
                  label="Mode maintenance"
                  hint="La lecture est suspendue ; l'équipe garde l'accès."
                  checked={settings.maintenanceMode}
                />
                <Toggle
                  name="dzd_display_enabled"
                  label="Afficher l'équivalent indicatif en dinars (DZD)"
                  hint="La facturation reste en euros."
                  checked={settings.dzdDisplayEnabled}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <TextField
                  label="Taux EUR → DZD (indicatif)"
                  name="eur_to_dzd_rate"
                  inputMode="decimal"
                  defaultValue={String(settings.eurToDzdRate)}
                  hint={
                    settings.eurToDzdRateUpdatedAt
                      ? `Mis à jour le ${settings.eurToDzdRateUpdatedAt}`
                      : undefined
                  }
                />
                <TextField
                  label="Période de grâce (jours)"
                  name="grace_period_days"
                  type="number"
                  min={0}
                  max={30}
                  defaultValue={settings.gracePeriodDays}
                  hint="Accès maintenu après un échec de paiement."
                />
                <TextField
                  label="Demandes Premium par mois"
                  name="premium_requests_per_month"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={settings.premiumRequestsPerMonth}
                />
                <TextField
                  label="Délai d'inactivité d'un flux (s)"
                  name="stream_heartbeat_timeout_seconds"
                  type="number"
                  min={30}
                  max={600}
                  defaultValue={settings.streamHeartbeatTimeoutSeconds}
                />
                <TextField
                  label="Alertes d'expiration (jours)"
                  name="license_alert_days"
                  defaultValue={settings.licenseAlertDays.join(", ")}
                />
                <TextField
                  label="Email de contact"
                  name="support_email"
                  type="email"
                  defaultValue={settings.supportEmail}
                />
              </div>
            </ActionForm>
          </section>

          <section className="rounded-xl border bg-card/60 p-5">
            <h2 className="mb-1 font-semibold">Informations légales de l&apos;éditeur</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Reprises dans les mentions légales et les conditions (brouillons à faire valider par
              un professionnel du droit).
            </p>
            <ActionForm
              action={updateLegalEntityAction}
              submitLabel="Enregistrer"
              submitVariant="secondary"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <TextField label="Dénomination" name="name" defaultValue={entity.name} />
                <TextField
                  label="Forme juridique et capital"
                  name="form"
                  defaultValue={entity.form}
                />
                <TextField label="Adresse du siège" name="address" defaultValue={entity.address} />
                <TextField
                  label="Immatriculation (RCS, SIREN…)"
                  name="registration"
                  defaultValue={entity.registration}
                />
                <TextField
                  label="N° de TVA intracommunautaire"
                  name="vat"
                  defaultValue={entity.vat}
                />
                <TextField
                  label="Directeur·rice de la publication"
                  name="publication_director"
                  defaultValue={entity.publication_director}
                />
                <TextField
                  label="Hébergeur (nom, adresse, téléphone)"
                  name="host"
                  defaultValue={entity.host}
                  className="md:col-span-2"
                />
              </div>
            </ActionForm>
          </section>

          <section id="incidents" className="scroll-mt-6 rounded-xl border bg-card/60 p-5">
            <h2 className="mb-4 font-semibold">Incidents</h2>
            <ul className="mb-4 space-y-2">
              {(incidents ?? []).map((incident) => (
                <li key={incident.id}>
                  <details className="rounded-lg border bg-background/40">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium">{incident.title}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {COMPONENTS[incident.component]} · {SEVERITY[incident.severity]} ·{" "}
                          {formatDateTime(incident.started_at)}
                        </span>
                      </span>
                      <StatusBadge
                        status={incident.status}
                        label={INCIDENT_STATUS[incident.status]}
                      />
                    </summary>
                    <div className="border-t p-3">
                      <ActionForm
                        action={saveIncidentAction.bind(null, incident.id)}
                        submitLabel="Mettre à jour"
                        submitVariant="secondary"
                      >
                        <IncidentFields incident={incident} />
                      </ActionForm>
                    </div>
                  </details>
                </li>
              ))}
              {(incidents ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground">Aucun incident déclaré.</li>
              )}
            </ul>
            <details className="rounded-lg border border-dashed p-3">
              <summary className="cursor-pointer text-sm font-medium text-primary-text">
                Déclarer un incident
              </summary>
              <ActionForm
                action={saveIncidentAction.bind(null, null)}
                submitLabel="Déclarer"
                resetOnSuccess
                className="mt-3"
              >
                <IncidentFields />
              </ActionForm>
            </details>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border bg-card/60 p-5">
            <h2 className="mb-2 font-semibold">Intégrations</h2>
            <p className="mb-2 text-xs text-muted-foreground">
              État lu depuis la configuration du serveur (aucun secret affiché).
            </p>
            <ul className="divide-y">
              <IntegrationRow
                label="Paiements (Stripe)"
                state={payments ? (payments.testMode ? "partial" : "ok") : "off"}
                detail={
                  payments
                    ? payments.testMode
                      ? "Mode test : aucun paiement réel."
                      : "Mode réel autorisé explicitement."
                    : "Non configuré : souscriptions désactivées."
                }
              />
              <IntegrationRow
                label="Diffusion vidéo"
                state={env.streaming.provider === "cloudflare" ? "partial" : "off"}
                detail={
                  env.streaming.provider === "cloudflare"
                    ? "Cloudflare Stream configuré — intégration à valider en conditions réelles."
                    : "Fournisseur de développement (médias de test locaux)."
                }
              />
              <IntegrationRow
                label="Emails"
                state={env.email.provider === "console" ? "off" : "partial"}
                detail={
                  env.email.provider === "console"
                    ? "Console : les emails sont journalisés, aucun n'est envoyé."
                    : `Fournisseur « ${env.email.provider} » configuré — vérifier l'authentification du domaine (SPF, DKIM).`
                }
              />
              <IntegrationRow
                label="Tâche quotidienne"
                state={env.cronSecret ? "ok" : "off"}
                detail={
                  env.cronSecret
                    ? "Secret CRON_SECRET défini."
                    : "CRON_SECRET absent : la tâche planifiée refusera les appels."
                }
              />
              <IntegrationRow
                label="Géolocalisation"
                state="ok"
                detail={`En-tête pays : ${env.geo.header}${env.geo.devOverride && !env.isProductionDeployment ? ` · forcé à ${env.geo.devOverride} en développement` : ""}`}
              />
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}

function IncidentFields({
  incident,
}: {
  incident?: {
    id: string;
    title: string;
    description: string | null;
    component: string;
    severity: string;
    status: string;
  };
}) {
  const p = incident ? `i-${incident.id.slice(0, 8)}-` : "i-new-";
  return (
    <>
      <TextField
        label="Titre"
        name="title"
        id={`${p}title`}
        required
        maxLength={160}
        defaultValue={incident?.title}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Composant" name={`${p}component`}>
          <NativeSelect
            id={`${p}component`}
            name="component"
            defaultValue={incident?.component ?? "platform"}
          >
            {Object.entries(COMPONENTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Gravité" name={`${p}severity`}>
          <NativeSelect
            id={`${p}severity`}
            name="severity"
            defaultValue={incident?.severity ?? "minor"}
          >
            {Object.entries(SEVERITY).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Statut" name={`${p}status`}>
          <NativeSelect id={`${p}status`} name="status" defaultValue={incident?.status ?? "open"}>
            {Object.entries(INCIDENT_STATUS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Description" name={`${p}description`}>
        <Textarea
          id={`${p}description`}
          name="description"
          maxLength={4000}
          defaultValue={incident?.description ?? ""}
        />
      </Field>
    </>
  );
}
