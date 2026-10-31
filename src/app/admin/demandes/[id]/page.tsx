import Link from "next/link";
import { notFound } from "next/navigation";

import { addRequestNoteAction, mergeRequestAction, moderateRequestAction, setRequestStatusAction } from "@/actions/admin/requests";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminPageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/action-form";
import { Field } from "@/components/forms/form-fields";
import { ACQUISITION_STATUSES, REQUEST_STATUS_LABELS, REQUEST_STATUS_VARIANT } from "@/components/requests/status";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";
import { uuidPattern } from "@/server/admin/guard";

export const metadata = { title: "Demande" };

const TYPE_LABELS: Record<string, string> = { film: "Film", series: "Série", documentary: "Documentaire", short: "Court-métrage", show: "Émission", other: "Autre" };

export default async function AdminRequestPage({ params }: PageProps<"/admin/demandes/[id]">) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const viewer = await requireStaff("admin.access", `/admin/demandes/${id}`);
  const can = (permission: "requests.moderate" | "requests.confirm_acquisition") => viewer.staff.permissions.includes(permission);
  if (!can("requests.moderate") && !can("requests.confirm_acquisition")) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: request } = await supabase.from("content_requests").select("*").eq("id", id).maybeSingle();
  if (!request) notFound();
  const [events, notes, similar, titles, linked] = await Promise.all([
    supabase.from("content_request_events").select("id, from_status, to_status, public_note, created_at").eq("request_id", id).order("created_at", { ascending: false }),
    supabase.from("content_request_notes").select("id, note, created_at").eq("request_id", id).order("created_at", { ascending: false }),
    supabase.rpc("find_similar_requests", { p_title: request.title, ...(request.release_year ? { p_year: request.release_year } : {}) }),
    supabase.from("titles").select("id, title").is("deleted_at", null).order("title").limit(2000),
    request.linked_title_id ? supabase.from("titles").select("id, title, slug").eq("id", request.linked_title_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const duplicates = (similar.data ?? []).filter((s) => s.id !== id);
  const allowedStatuses = Object.entries(REQUEST_STATUS_LABELS).filter(([value]) => (ACQUISITION_STATUSES.has(value) ? can("requests.confirm_acquisition") : true));

  return (
    <>
      <AdminPageHeader
        title={request.title}
        description={`${TYPE_LABELS[request.content_type] ?? request.content_type}${request.release_year ? ` · ${request.release_year}` : ""} · reçue le ${formatDateTime(request.created_at)}`}
        actions={
          <>
            <Badge variant={REQUEST_STATUS_VARIANT[request.status] ?? "outline"}>{REQUEST_STATUS_LABELS[request.status]}</Badge>
            <Badge variant="gold">{request.vote_count} vote(s)</Badge>
            {request.is_hidden && <Badge variant="warning">Masquée</Badge>}
            {request.duplicate_of && (
              <Link href={`/admin/demandes/${request.duplicate_of}`} className="text-sm underline">
                Fusionnée — voir la demande principale
              </Link>
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <div className="space-y-6">
          <section className="space-y-3 rounded-xl border bg-card/60 p-5 text-sm">
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Réalisation</dt>
                <dd>{request.director ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Pays</dt>
                <dd>{request.country ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Référence</dt>
                <dd className="truncate">
                  {request.info_url ? (
                    <a href={request.info_url} target="_blank" rel="noopener noreferrer nofollow" className="underline">
                      {request.info_url}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
            {request.comment && <p className="whitespace-pre-wrap rounded-lg border bg-background/40 p-3">{request.comment}</p>}
            {request.public_note && <p className="text-muted-foreground">Note publique actuelle : {request.public_note}</p>}
            {linked.data && (
              <p>
                Œuvre liée :{" "}
                <Link href={`/admin/catalogue/${linked.data.id}`} className="underline">
                  {linked.data.title}
                </Link>
              </p>
            )}
          </section>

          <section className="rounded-xl border bg-card/60 p-5">
            <h2 className="mb-3 font-semibold">Historique public</h2>
            <ol className="space-y-2 text-sm">
              {(events.data ?? []).map((event) => (
                <li key={event.id} className="border-s-2 ps-3">
                  <span className="text-xs text-muted-foreground">{formatDateTime(event.created_at)}</span>
                  <p>
                    {event.from_status ? `${REQUEST_STATUS_LABELS[event.from_status]} → ` : ""}
                    {REQUEST_STATUS_LABELS[event.to_status]}
                  </p>
                  {event.public_note && <p className="text-muted-foreground">{event.public_note}</p>}
                </li>
              ))}
              {(events.data ?? []).length === 0 && <li className="text-muted-foreground">Aucun changement de statut.</li>}
            </ol>
          </section>

          <section className="rounded-xl border bg-card/60 p-5">
            <h2 className="mb-3 font-semibold">Notes internes</h2>
            <ul className="mb-4 space-y-2 text-sm">
              {(notes.data ?? []).map((note) => (
                <li key={note.id} className="rounded-lg border bg-background/40 p-3">
                  <span className="text-xs text-muted-foreground">{formatDateTime(note.created_at)}</span>
                  <p className="whitespace-pre-wrap">{note.note}</p>
                </li>
              ))}
              {(notes.data ?? []).length === 0 && <li className="text-muted-foreground">Aucune note.</li>}
            </ul>
            <ActionForm action={addRequestNoteAction.bind(null, id)} submitLabel="Ajouter la note" submitVariant="secondary" resetOnSuccess>
              <Textarea name="note" aria-label="Nouvelle note interne" maxLength={4000} required placeholder="Contacts pris, ayants droit identifiés, conditions évoquées…" />
            </ActionForm>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border bg-card/60 p-5">
            <h2 className="mb-4 font-semibold">Changer le statut</h2>
            <ActionForm action={setRequestStatusAction.bind(null, id)} submitLabel="Mettre à jour">
              <Field label="Statut" name="status" hint={can("requests.confirm_acquisition") ? undefined : "Les statuts d'acquisition sont réservés à l'équipe des droits."}>
                <NativeSelect id="status" name="status" defaultValue={request.status}>
                  {allowedStatuses.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Œuvre du catalogue (obligatoire pour « Disponible »)" name="linked_title_id">
                <NativeSelect id="linked_title_id" name="linked_title_id" defaultValue={request.linked_title_id ?? ""}>
                  <option value="">—</option>
                  {(titles.data ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Message public (visible des votants)" name="public_note" hint="Sans promesse de disponibilité ni de date tant que les droits ne sont pas signés.">
                <Textarea id="public_note" name="public_note" maxLength={1000} />
              </Field>
              <Field label="Note interne" name="internal_note">
                <Textarea id="internal_note" name="internal_note" maxLength={4000} />
              </Field>
            </ActionForm>
          </section>

          {can("requests.moderate") && (
            <section className="space-y-4 rounded-xl border bg-card/60 p-5">
              <h2 className="font-semibold">Modération</h2>
              {request.is_hidden ? (
                <ConfirmAction action={moderateRequestAction.bind(null, id, false)} label="Rendre visible" title="Rendre la demande visible ?" description="Elle réapparaît sur le tableau des demandes." withReason />
              ) : (
                <ConfirmAction
                  action={moderateRequestAction.bind(null, id, true)}
                  label="Masquer (contenu inapproprié)"
                  title="Masquer cette demande ?"
                  description="Elle n'est plus visible du public ; son auteur la voit toujours. Le motif est consigné."
                  withReason
                  destructive
                />
              )}
              {!request.duplicate_of && duplicates.length > 0 && (
                <ActionForm action={mergeRequestAction.bind(null, id)} submitLabel="Fusionner" submitVariant="secondary">
                  <Field label="Doublon de…" name="target" hint="Les votes sont reportés sur la demande choisie.">
                    <NativeSelect id="target" name="target" defaultValue="">
                      <option value="" disabled>
                        Choisir la demande principale
                      </option>
                      {duplicates.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} {d.release_year ? `(${d.release_year})` : ""} · {d.vote_count} vote(s) · similarité {Math.round(d.similarity * 100)} %
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                </ActionForm>
              )}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
