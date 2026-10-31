import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLinkIcon, ShieldAlertIcon, ShieldCheckIcon } from "lucide-react";

import {
  addCreditAction,
  addSeasonAction,
  deleteEpisodeAction,
  deleteSubtitleAction,
  removeCreditAction,
  restoreTakedownAction,
  restoreTitleAction,
  saveEpisodeAction,
  setTitleStatusAction,
  softDeleteTitleAction,
  takedownTitleAction,
  updateTitleAction,
  uploadSubtitleAction,
  uploadTitleImageAction,
} from "@/actions/admin/catalog";
import { listDevMediaFolders, refreshMediaStatusAction } from "@/actions/admin/media";
import { ActionButton } from "@/components/admin/action-button";
import { PublishControls } from "@/components/admin/catalog/publish-controls";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { LICENSE_STATUS_LABELS, LICENSE_TYPE_LABELS } from "@/components/admin/rights/labels";
import { TitleForm } from "@/components/admin/title-form";
import { AdminPageHeader, StatusBadge } from "@/components/admin/ui";
import { VideoUploader } from "@/components/admin/video-uploader";
import { ActionForm } from "@/components/forms/action-form";
import { Field, TextField } from "@/components/forms/form-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { TITLE_KIND_LABELS } from "@/lib/constants";
import { formatClock, formatDate, formatDateTime } from "@/lib/format";
import { resolveImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import { requireStaff } from "@/server/auth/session";
import { getAdminTitle, type AdminTitle } from "@/server/admin/catalog";
import { uuidPattern } from "@/server/admin/guard";
import { genreLabel, getGenres } from "@/server/catalog/queries";
import { isFuture } from "@/lib/time";

export const metadata = { title: "Œuvre" };

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  in_review: "En relecture",
  announced: "Annoncée",
  published: "Publiée",
  unpublished: "Dépubliée",
  archived: "Archivée",
};
const MEDIA_STATUS: Record<string, string> = { pending_upload: "Envoi en attente", processing: "Traitement", ready: "Prête", error: "Erreur", deleted: "Supprimée" };
const CREDIT_ROLES: Record<string, string> = {
  director: "Réalisation",
  actor: "Interprétation",
  writer: "Scénario",
  producer: "Production",
  composer: "Musique",
  cinematographer: "Image",
  editor: "Montage",
  presenter: "Présentation",
  guest: "Invité·e",
};
const TABS = [
  { key: "informations", label: "Informations" },
  { key: "visuels", label: "Visuels" },
  { key: "distribution", label: "Distribution" },
  { key: "episodes", label: "Saisons et épisodes", episodic: true },
  { key: "medias", label: "Vidéos et sous-titres" },
  { key: "droits", label: "Droits" },
] as const;

export default async function AdminTitlePage({ params, searchParams }: PageProps<"/admin/catalogue/[id]">) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const viewer = await requireStaff("catalog.read_all", `/admin/catalogue/${id}`);
  const detail = await getAdminTitle(id);
  if (!detail) notFound();
  const tabParam = (await searchParams).onglet;
  const { title } = detail;
  const tabs = TABS.filter((t) => !("episodic" in t) || title.structure === "episodic");
  const tab = tabs.find((t) => t.key === tabParam)?.key ?? "informations";
  const can = (permission: Parameters<typeof viewer.staff.permissions.includes>[0]) => viewer.staff.permissions.includes(permission);

  return (
    <>
      <AdminPageHeader
        title={title.title}
        description={`${TITLE_KIND_LABELS[title.kind]} · /titre/${title.slug} · mise à jour le ${formatDateTime(title.updated_at)}`}
        actions={
          title.status === "published" || title.status === "announced" ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/titre/${title.slug}`} target="_blank">
                <ExternalLinkIcon /> Page publique
              </Link>
            </Button>
          ) : null
        }
      />

      <section aria-label="Statut et publication" className="mb-6 space-y-4 rounded-xl border bg-card/60 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={title.status} label={STATUS_LABELS[title.status]} />
          {title.is_demo && <Badge variant="muted">Contenu de démonstration fictif</Badge>}
          {title.takedown_at && <Badge variant="destructive">Retirée le {formatDate(title.takedown_at)}</Badge>}
          {title.deleted_at && <Badge variant="destructive">Supprimée</Badge>}
          {title.status === "published" && isFuture(title.published_at) && (
            <Badge variant="gold">Programmée le {formatDateTime(title.published_at)}</Badge>
          )}
        </div>
        {detail.hasValidLicense ? (
          <p className="flex items-center gap-2 text-sm text-success">
            <ShieldCheckIcon className="size-4" /> Une licence signée et en cours de validité couvre cette œuvre.
          </p>
        ) : (
          <Alert variant="warning">
            <ShieldAlertIcon />
            <AlertTitle>Aucune licence valide</AlertTitle>
            <AlertDescription>
              La publication et l&apos;annonce sont bloquées par la base de données tant qu&apos;aucune licence signée, en cours de validité et couvrant au moins un territoire n&apos;est enregistrée.{" "}
              {can("rights.write") && (
                <Link href={`/admin/droits/licences/nouvelle?titre=${title.id}`} className="underline">
                  Enregistrer une licence
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}
        {title.takedown_at && title.takedown_reason && <p className="text-sm text-muted-foreground">Motif du retrait : {title.takedown_reason}</p>}
        {!title.deleted_at && (
          <div className="flex flex-wrap items-center gap-2">
            {can("catalog.publish") && !title.takedown_at && title.status !== "published" && <PublishControls titleId={title.id} canPublish />}
            {can("catalog.publish") && !title.takedown_at && !["announced", "published"].includes(title.status) && (
              <ActionButton action={setTitleStatusAction.bind(null, title.id, "announced")}>Annoncer (« Prochainement »)</ActionButton>
            )}
            {can("catalog.write") && title.status === "draft" && <ActionButton action={setTitleStatusAction.bind(null, title.id, "in_review")}>Envoyer en relecture</ActionButton>}
            {can("catalog.write") && ["published", "announced"].includes(title.status) && (
              <ConfirmAction
                action={setTitleStatusAction.bind(null, title.id, "unpublished")}
                label="Dépublier"
                title="Dépublier cette œuvre ?"
                description="Elle disparaît du catalogue et la lecture est refusée. Les abonnés qui l'avaient dans leur liste la retrouveront si elle est republiée."
              />
            )}
            {can("catalog.write") && title.status !== "archived" && (
              <ConfirmAction action={setTitleStatusAction.bind(null, title.id, "archived")} label="Archiver" title="Archiver cette œuvre ?" description="Elle n'est plus visible et reste consultable dans l'administration." />
            )}
            {can("takedown.execute") &&
              (title.takedown_at ? (
                <ConfirmAction
                  action={restoreTakedownAction.bind(null, title.id)}
                  label="Rétablir après retrait"
                  title="Rétablir le contenu ?"
                  description="À n'utiliser qu'une fois la réclamation résolue et les droits vérifiés. L'œuvre reste soumise au contrôle des licences."
                  withReason
                />
              ) : (
                <ConfirmAction
                  action={takedownTitleAction.bind(null, title.id)}
                  label="Retrait immédiat"
                  title="Retirer immédiatement ce contenu ?"
                  description="La lecture est bloquée sur-le-champ pour tous les utilisateurs (procédure de retrait sur réclamation). L'action est journalisée."
                  destructive
                  withReason
                  variant="destructive"
                />
              ))}
            {can("catalog.write") && (
              <ConfirmAction
                action={softDeleteTitleAction.bind(null, title.id)}
                label="Supprimer"
                title="Supprimer cette œuvre ?"
                description="Suppression logique : l'œuvre est archivée et masquée, l'historique et les droits sont conservés. Elle peut être restaurée."
                destructive
                variant="ghost"
              />
            )}
          </div>
        )}
        {title.deleted_at && can("catalog.write") && <ActionButton action={restoreTitleAction.bind(null, title.id)}>Restaurer en brouillon</ActionButton>}
      </section>

      <nav aria-label="Sections de la fiche" className="mb-6 flex gap-1 overflow-x-auto border-b scrollbar-none">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/catalogue/${title.id}?onglet=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm transition",
              tab === t.key ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "informations" && <InformationTab detail={detail} editable={can("catalog.write")} />}
      {tab === "visuels" && <VisualsTab detail={detail} editable={can("catalog.write")} />}
      {tab === "distribution" && <CreditsTab detail={detail} editable={can("catalog.write")} />}
      {tab === "episodes" && <EpisodesTab detail={detail} editable={can("catalog.write")} />}
      {tab === "medias" && <MediaTab detail={detail} canUpload={can("media.upload")} editable={can("catalog.write")} />}
      {tab === "droits" && <RightsTab detail={detail} canWrite={can("rights.write")} />}
    </>
  );
}

async function InformationTab({ detail, editable }: { detail: AdminTitle; editable: boolean }) {
  const genres = await getGenres();
  const { title } = detail;
  return (
    <div className="rounded-xl border bg-card/60 p-6">
      {editable ? (
        <TitleForm
          action={updateTitleAction.bind(null, title.id)}
          genres={genres.map((g) => ({ id: g.id, label: genreLabel(g.labels, "fr") }))}
          defaults={{ ...title, genreIds: detail.genreIds }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Lecture seule : votre rôle ne permet pas de modifier le catalogue.</p>
      )}
    </div>
  );
}

function VisualsTab({ detail, editable }: { detail: AdminTitle; editable: boolean }) {
  const { title } = detail;
  const fields = [
    { field: "poster_path" as const, label: "Affiche (2:3)", aspect: "aspect-[2/3] w-40", value: title.poster_path },
    { field: "backdrop_path" as const, label: "Image de fond (16:9)", aspect: "aspect-video w-72", value: title.backdrop_path },
    { field: "logo_path" as const, label: "Logo du titre (PNG transparent)", aspect: "aspect-[3/1] w-72", value: title.logo_path },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {fields.map(({ field, label, aspect, value }) => {
        const src = resolveImageUrl(value);
        return (
          <div key={field} className="space-y-4 rounded-xl border bg-card/60 p-5">
            <h2 className="font-semibold">{label}</h2>
            <div className={cn("relative overflow-hidden rounded-lg border bg-muted", aspect)}>
              {src ? <Image src={src} alt="" fill sizes="300px" className="object-cover" /> : <span className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">Aucune image</span>}
            </div>
            {editable && (
              <ActionForm action={uploadTitleImageAction.bind(null, title.id, field)} submitLabel="Envoyer" submitVariant="secondary" resetOnSuccess>
                <input
                  type="file"
                  name="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  required
                  aria-label={`Fichier : ${label}`}
                  className="block w-full text-sm file:me-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-foreground"
                />
                <p className="text-xs text-muted-foreground">JPEG, PNG, WebP ou AVIF, 4 Mo maximum. Utilisez uniquement des visuels dont les droits sont acquis.</p>
              </ActionForm>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CreditsTab({ detail, editable }: { detail: AdminTitle; editable: boolean }) {
  const { title, credits } = detail;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="rounded-xl border bg-card/60 p-5">
        <h2 className="mb-4 font-semibold">Distribution et équipe</h2>
        {credits.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun crédit enregistré.</p>
        ) : (
          <ul className="divide-y">
            {credits.map((credit) => (
              <li key={credit.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>
                  <span className="font-medium">{credit.people?.full_name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {CREDIT_ROLES[credit.role] ?? credit.role}
                    {credit.character_name ? ` (${credit.character_name})` : ""}
                  </span>
                </span>
                {editable && (
                  <ConfirmAction action={removeCreditAction.bind(null, credit.id, title.id)} label="Retirer" title="Retirer ce crédit ?" description="La fiche de la personne est conservée." variant="ghost" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {editable && (
        <div className="rounded-xl border bg-card/60 p-5">
          <h2 className="mb-4 font-semibold">Ajouter un crédit</h2>
          <ActionForm action={addCreditAction.bind(null, title.id)} submitLabel="Ajouter" resetOnSuccess>
            <TextField label="Nom" name="name" required maxLength={160} />
            <Field label="Fonction" name="role">
              <NativeSelect id="role" name="role" defaultValue="actor">
                {Object.entries(CREDIT_ROLES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <TextField label="Personnage (facultatif)" name="character" maxLength={120} />
          </ActionForm>
        </div>
      )}
    </div>
  );
}

function EpisodeFields({ seasons, episode }: { seasons: AdminTitle["seasons"]; episode?: AdminTitle["episodes"][number] }) {
  const prefix = episode ? `ep-${episode.id.slice(0, 8)}-` : "ep-new-";
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Saison" name={`${prefix}season`}>
          <NativeSelect id={`${prefix}season`} name="season_id" defaultValue={episode?.season_id ?? seasons.at(-1)?.id}>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name ?? `Saison ${s.season_number}`}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Numéro" name={`${prefix}number`}>
          <input id={`${prefix}number`} name="episode_number" type="number" min={0} required defaultValue={episode?.episode_number} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" />
        </Field>
        <Field label="Statut" name={`${prefix}status`}>
          <NativeSelect id={`${prefix}status`} name="status" defaultValue={episode?.status === "published" ? "published" : episode?.status === "unpublished" ? "unpublished" : "draft"}>
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
            <option value="unpublished">Dépublié</option>
          </NativeSelect>
        </Field>
      </div>
      <Field label="Titre de l'épisode" name={`${prefix}name`}>
        <input id={`${prefix}name`} name="name" required maxLength={200} defaultValue={episode?.name} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" />
      </Field>
      <Field label="Synopsis" name={`${prefix}synopsis`}>
        <Textarea id={`${prefix}synopsis`} name="synopsis" maxLength={2000} defaultValue={episode?.synopsis ?? ""} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-4">
        {(
          [
            ["runtime_minutes", "Durée (min)"],
            ["intro_start_seconds", "Début intro (s)"],
            ["intro_end_seconds", "Fin intro (s)"],
            ["credits_start_seconds", "Générique (s)"],
          ] as const
        ).map(([name, label]) => (
          <Field key={name} label={label} name={`${prefix}${name}`}>
            <input id={`${prefix}${name}`} name={name} type="number" min={0} defaultValue={episode?.[name] ?? ""} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" />
          </Field>
        ))}
      </div>
    </>
  );
}

function EpisodesTab({ detail, editable }: { detail: AdminTitle; editable: boolean }) {
  const { title, seasons, episodes, assets } = detail;
  return (
    <div className="space-y-6">
      {seasons.length === 0 && <p className="text-sm text-muted-foreground">Créez d&apos;abord une saison.</p>}
      {seasons.map((season) => {
        const seasonEpisodes = episodes.filter((e) => e.season_id === season.id);
        return (
          <section key={season.id} className="rounded-xl border bg-card/60 p-5">
            <h2 className="mb-3 font-semibold">{season.name ?? `Saison ${season.season_number}`}</h2>
            {seasonEpisodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun épisode.</p>
            ) : (
              <ul className="space-y-2">
                {seasonEpisodes.map((episode) => {
                  const media = assets.find((a) => a.id === episode.main_asset_id);
                  return (
                    <li key={episode.id}>
                      <details className="group rounded-lg border bg-background/40">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                          <span>
                            <span className="text-muted-foreground">É{episode.episode_number}</span> <span className="font-medium">{episode.name}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            {media ? <Badge variant="success">Vidéo prête</Badge> : <Badge variant="warning">Sans vidéo</Badge>}
                            <StatusBadge status={episode.status} label={STATUS_LABELS[episode.status]} />
                          </span>
                        </summary>
                        {editable && (
                          <div className="space-y-4 border-t p-4">
                            <ActionForm action={saveEpisodeAction.bind(null, title.id, episode.id)} submitLabel="Enregistrer l'épisode">
                              <EpisodeFields seasons={seasons} episode={episode} />
                            </ActionForm>
                            <ConfirmAction
                              action={deleteEpisodeAction.bind(null, episode.id, title.id)}
                              label="Supprimer l'épisode"
                              title="Supprimer cet épisode ?"
                              description="Suppression logique : il n'est plus proposé à la lecture."
                              destructive
                              variant="ghost"
                            />
                          </div>
                        )}
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
      {editable && (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          {seasons.length > 0 && (
            <section className="rounded-xl border bg-card/60 p-5">
              <h2 className="mb-4 font-semibold">Nouvel épisode</h2>
              <ActionForm action={saveEpisodeAction.bind(null, title.id, null)} submitLabel="Ajouter l'épisode" resetOnSuccess>
                <EpisodeFields seasons={seasons} />
              </ActionForm>
            </section>
          )}
          <section className="rounded-xl border bg-card/60 p-5">
            <h2 className="mb-4 font-semibold">Nouvelle saison</h2>
            <ActionForm action={addSeasonAction.bind(null, title.id)} submitLabel="Ajouter la saison" resetOnSuccess>
              <TextField label="Numéro" name="season_number" type="number" min={0} required defaultValue={(seasons.at(-1)?.season_number ?? 0) + 1} />
              <TextField label="Nom (facultatif)" name="name" maxLength={120} />
            </ActionForm>
          </section>
        </div>
      )}
    </div>
  );
}

async function MediaTab({ detail, canUpload, editable }: { detail: AdminTitle; canUpload: boolean; editable: boolean }) {
  const { title, assets, episodes } = detail;
  const devFolders = canUpload ? await listDevMediaFolders() : [];
  const episodeName = (id: string | null) => {
    const episode = episodes.find((e) => e.id === id);
    return episode ? `Épisode ${episode.episode_number} · ${episode.name}` : null;
  };
  const targets: { label: string; episodeId: string | null; kind: "main" | "trailer" }[] = [
    { label: "Bande-annonce", episodeId: null, kind: "trailer" },
    ...(title.structure === "single"
      ? [{ label: "Vidéo principale", episodeId: null, kind: "main" as const }]
      : episodes.map((e) => ({ label: `Épisode ${e.episode_number} · ${e.name}`, episodeId: e.id, kind: "main" as const }))),
  ];
  return (
    <div className="space-y-6">
      <Alert>
        <ShieldAlertIcon />
        <AlertTitle>Importer uniquement des vidéos autorisées</AlertTitle>
        <AlertDescription>
          L&apos;import exige une licence signée et une attestation de droits. Les URL signées et le contrôle territorial limitent l&apos;accès mais ne constituent pas une protection absolue contre la copie.
        </AlertDescription>
      </Alert>
      <section className="rounded-xl border bg-card/60 p-5">
        <h2 className="mb-4 font-semibold">Médias enregistrés</h2>
        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun média.</p>
        ) : (
          <ul className="space-y-4">
            {assets.map((asset) => (
              <li key={asset.id} className="space-y-3 rounded-lg border bg-background/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">
                      {asset.kind === "trailer" ? "Bande-annonce" : asset.episode_id ? episodeName(asset.episode_id) : "Vidéo principale"}
                      {[title.main_asset_id, title.trailer_asset_id, ...episodes.map((e) => e.main_asset_id)].includes(asset.id) && (
                        <Badge variant="gold" className="ms-2">
                          En service
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {asset.provider === "dev_local" ? "Média de test local" : "Cloudflare Stream"} · {asset.original_filename ?? "—"} · ajouté le {formatDateTime(asset.created_at)}
                      {asset.duration_seconds ? ` · ${formatClock(asset.duration_seconds)}` : ""}
                      {asset.height ? ` · ${asset.height}p` : ""}
                    </p>
                    {asset.error_message && <p className="text-xs text-destructive">{asset.error_message}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={asset.status === "processing" ? "processing_media" : asset.status} label={MEDIA_STATUS[asset.status]} />
                    {canUpload && asset.status !== "ready" && <ActionButton action={refreshMediaStatusAction.bind(null, asset.id)}>Actualiser</ActionButton>}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sous-titres</p>
                  {asset.subtitles.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucun sous-titre.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {asset.subtitles.map((subtitle) => (
                        <li key={subtitle.id} className="flex items-center gap-1 rounded-full border py-0.5 ps-3 pe-1 text-xs">
                          {subtitle.label} ({subtitle.language}
                          {subtitle.kind !== "subtitles" ? `, ${subtitle.kind}` : ""}){subtitle.is_machine_generated && " · traduction automatique"}
                          {editable && (
                            <ConfirmAction
                              action={deleteSubtitleAction.bind(null, subtitle.id, title.id)}
                              label="×"
                              title="Supprimer ces sous-titres ?"
                              description="Le fichier est retiré du stockage."
                              variant="ghost"
                              size="sm"
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {editable && (
                    <details>
                      <summary className="cursor-pointer text-xs text-primary">Ajouter des sous-titres (WebVTT)</summary>
                      <ActionForm action={uploadSubtitleAction.bind(null, asset.id, title.id)} submitLabel="Envoyer les sous-titres" submitVariant="secondary" resetOnSuccess className="mt-3">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <TextField label="Langue (code)" name="language" required placeholder="fr, kab, ar, en" pattern="[a-z]{2,3}(-[A-Za-z0-9]{2,8})?" />
                          <TextField label="Libellé" name="label" required placeholder="Français" maxLength={60} />
                          <Field label="Type" name="kind">
                            <NativeSelect id="kind" name="kind" defaultValue="subtitles">
                              <option value="subtitles">Sous-titres</option>
                              <option value="captions">Sourds et malentendants</option>
                              <option value="forced">Forcés</option>
                            </NativeSelect>
                          </Field>
                        </div>
                        <input type="file" name="file" accept=".vtt,text/vtt" required aria-label="Fichier WebVTT" className="block w-full text-sm file:me-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-foreground" />
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <input type="checkbox" name="machine" className="size-4 accent-primary" /> Traduction automatique non relue (signalée comme telle aux spectateurs)
                        </label>
                      </ActionForm>
                    </details>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {canUpload && (
        <section className="space-y-4 rounded-xl border bg-card/60 p-5">
          <h2 className="font-semibold">Importer une vidéo</h2>
          {targets.map((target) => (
            <div key={`${target.kind}-${target.episodeId ?? "title"}`} className="space-y-2">
              <p className="text-sm font-medium">{target.label}</p>
              <VideoUploader titleId={title.id} episodeId={target.episodeId} kind={target.kind} devFolders={devFolders} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function RightsTab({ detail, canWrite }: { detail: AdminTitle; canWrite: boolean }) {
  const { title, licenses } = detail;
  return (
    <section className="space-y-4 rounded-xl border bg-card/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Licences de diffusion</h2>
        {canWrite && (
          <Button asChild size="sm">
            <Link href={`/admin/droits/licences/nouvelle?titre=${title.id}`}>Nouvelle licence</Link>
          </Button>
        )}
      </div>
      {licenses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune licence : l&apos;œuvre ne peut être ni publiée ni annoncée.</p>
      ) : (
        <ul className="divide-y">
          {licenses.map((license) => {
            const included = license.license_territories.filter((t) => !t.is_excluded).map((t) => t.country_code);
            const excluded = license.license_territories.filter((t) => t.is_excluded).map((t) => t.country_code);
            return (
              <li key={license.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="space-y-1">
                  <Link href={`/admin/droits/licences/${license.id}`} className="font-medium hover:underline">
                    {license.rights_holders?.name ?? "Ayant droit non renseigné"} · {LICENSE_TYPE_LABELS[license.license_type] ?? license.license_type}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Du {formatDate(license.starts_at)} {license.ends_at ? `au ${formatDate(license.ends_at)}` : "sans date de fin"} · modes : {license.exploitation_modes.join(", ")} · supports : {license.supports.join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Territoires : {included.includes("WW") ? "monde entier" : included.join(", ") || "aucun"}
                    {excluded.length ? ` · exclus : ${excluded.join(", ")}` : ""}
                  </p>
                </div>
                <StatusBadge status={license.status} label={LICENSE_STATUS_LABELS[license.status]} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
