import Link from "next/link";
import { notFound } from "next/navigation";

import { restoreTakedownAction } from "@/actions/admin/catalog";
import { takedownForClaimAction, updateClaimAction } from "@/actions/admin/rights";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { CLAIM_STATUS_LABELS, CLAIM_TYPE_LABELS } from "@/components/admin/rights/labels";
import { AdminPageHeader, StatusBadge } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/action-form";
import { Field } from "@/components/forms/form-fields";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";
import { uuidPattern } from "@/server/admin/guard";

export const metadata = { title: "Réclamation" };

export default async function ClaimPage({ params }: PageProps<"/admin/droits/reclamations/[id]">) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const viewer = await requireStaff("rights.read", `/admin/droits/reclamations/${id}`);
  const supabase = await createSupabaseServerClient();
  const { data: claim } = await supabase.from("content_claims").select("*, titles(id, title, slug, status, takedown_at, takedown_reason)").eq("id", id).maybeSingle();
  if (!claim) notFound();
  const canAct = viewer.staff.permissions.includes("takedown.execute");
  const { data: titles } = canAct ? await supabase.from("titles").select("id, title").is("deleted_at", null).order("title").limit(2000) : { data: [] };
  const title = claim.titles;

  return (
    <>
      <AdminPageHeader
        title={`Réclamation · ${CLAIM_TYPE_LABELS[claim.claim_type] ?? claim.claim_type}`}
        description={`Reçue le ${formatDateTime(claim.created_at)}${claim.resolved_at ? ` · clôturée le ${formatDateTime(claim.resolved_at)}` : ""}`}
        actions={<StatusBadge status={claim.status} label={CLAIM_STATUS_LABELS[claim.status]} />}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <section className="space-y-4 rounded-xl border bg-card/60 p-6 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Déclarant</dt>
              <dd className="font-medium">{claim.claimant_name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Organisation</dt>
              <dd>{claim.claimant_organization ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">E-mail</dt>
              <dd>
                <a href={`mailto:${claim.claimant_email}`} className="underline">
                  {claim.claimant_email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Déclaration sur l&apos;honneur</dt>
              <dd>{claim.sworn_statement ? "Oui" : "Non"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Contenu visé (référence fournie)</dt>
              <dd className="break-all">{claim.title_reference ?? "—"}</dd>
            </div>
          </dl>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Description</p>
            <p className="whitespace-pre-wrap rounded-lg border bg-background/40 p-4 leading-relaxed">{claim.description}</p>
          </div>
          {claim.action_taken && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Actions consignées</p>
              <p className="whitespace-pre-wrap rounded-lg border bg-background/40 p-4">{claim.action_taken}</p>
            </div>
          )}
          {title && (
            <div className="space-y-3 rounded-lg border p-4">
              <p>
                Œuvre liée :{" "}
                <Link href={`/admin/catalogue/${title.id}`} className="font-medium underline">
                  {title.title}
                </Link>{" "}
                {title.takedown_at ? <span className="text-destructive">· retirée le {formatDateTime(title.takedown_at)}</span> : <span className="text-muted-foreground">· en ligne selon ses droits</span>}
              </p>
              {canAct &&
                (title.takedown_at ? (
                  <ConfirmAction
                    action={restoreTakedownAction.bind(null, title.id)}
                    label="Rétablir le contenu"
                    title="Rétablir le contenu ?"
                    description="Uniquement si la réclamation est infondée ou résolue et que les droits ont été vérifiés."
                    withReason
                  />
                ) : (
                  <ConfirmAction
                    action={takedownForClaimAction.bind(null, claim.id, title.id)}
                    label="Retirer immédiatement"
                    title="Retirer ce contenu ?"
                    description="La lecture est bloquée sur-le-champ pour tous les utilisateurs et la réclamation passe au statut « Contenu retiré »."
                    destructive
                    withReason
                    variant="destructive"
                  />
                ))}
            </div>
          )}
        </section>
        {canAct && (
          <section className="h-fit rounded-xl border bg-card/60 p-5">
            <h2 className="mb-4 font-semibold">Traitement</h2>
            <ActionForm action={updateClaimAction.bind(null, claim.id)} submitLabel="Enregistrer">
              <Field label="Statut" name="status">
                <NativeSelect id="status" name="status" defaultValue={claim.status}>
                  {Object.entries(CLAIM_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Œuvre concernée" name="title_id">
                <NativeSelect id="title_id" name="title_id" defaultValue={claim.title_id ?? ""}>
                  <option value="">Non identifiée</option>
                  {(titles ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Actions consignées (interne)" name="action_taken">
                <Textarea id="action_taken" name="action_taken" defaultValue={claim.action_taken ?? ""} maxLength={4000} className="min-h-28" />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="notify" className="size-4 accent-primary" /> Informer le déclarant par email
              </label>
              <Field label="Message au déclarant (facultatif)" name="message">
                <Textarea id="message" name="message" maxLength={3000} />
              </Field>
            </ActionForm>
          </section>
        )}
      </div>
    </>
  );
}
