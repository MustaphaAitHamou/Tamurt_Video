import Image from "next/image";
import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon, EyeIcon, EyeOffIcon } from "lucide-react";

import {
  deleteBannerAction,
  deleteHomeSectionAction,
  moveHomeSectionAction,
  saveBannerAction,
  saveHomeSectionAction,
  toggleHomeSectionAction,
} from "@/actions/admin/editorial";
import { ActionButton } from "@/components/admin/action-button";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { EditorialNav } from "@/components/admin/editorial/editorial-nav";
import {
  AUDIENCE_LABELS,
  SECTION_LAYOUT_LABELS,
  SECTION_SOURCE_LABELS,
  toLocalInput,
} from "@/components/admin/editorial/labels";
import { AdminPageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/action-form";
import { Field, TextField } from "@/components/forms/form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { TITLE_KIND_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { resolveImageUrl } from "@/lib/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";
import { genreLabel, getGenres } from "@/server/catalog/queries";
import { nowMs } from "@/lib/time";

export const metadata = { title: "Éditorial" };

type Section = {
  id: string;
  slug: string;
  title: string;
  title_i18n: unknown;
  source: string;
  config: unknown;
  layout: string;
  max_items: number;
  audience: string;
  position: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};
type Option = { value: string; label: string };

function Select({
  name,
  id,
  options,
  defaultValue,
  emptyLabel,
}: {
  name: string;
  id: string;
  options: Option[];
  defaultValue?: string;
  emptyLabel?: string;
}) {
  return (
    <NativeSelect id={id} name={name} defaultValue={defaultValue ?? ""}>
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}

function SectionFields({
  section,
  genres,
  collections,
  nextPosition,
}: {
  section?: Section;
  genres: Option[];
  collections: Option[];
  nextPosition: number;
}) {
  const p = section ? `s-${section.id.slice(0, 8)}-` : "s-new-";
  const config = (section?.config ?? {}) as Record<string, string | boolean | undefined>;
  const i18n = (section?.title_i18n ?? {}) as Record<string, string | undefined>;
  const entries = (record: Record<string, string>) =>
    Object.entries(record).map(([value, label]) => ({ value, label }));
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          label="Titre (français)"
          name="title"
          id={`${p}title`}
          required
          maxLength={80}
          defaultValue={section?.title}
        />
        <TextField
          label="Slug"
          name="slug"
          id={`${p}slug`}
          maxLength={60}
          defaultValue={section?.slug}
          hint="Généré depuis le titre si vide."
        />
        <Field label="Source" name={`${p}source`}>
          <Select
            id={`${p}source`}
            name="source"
            options={entries(SECTION_SOURCE_LABELS)}
            defaultValue={section?.source ?? "filter"}
          />
        </Field>
        <TextField
          label="Titre (anglais)"
          name="title_en"
          id={`${p}en`}
          maxLength={80}
          defaultValue={i18n.en ?? ""}
        />
        <TextField
          label="Titre (arabe)"
          name="title_ar"
          id={`${p}ar`}
          maxLength={80}
          defaultValue={i18n.ar ?? ""}
          dir="rtl"
        />
        <TextField
          label="Titre (kabyle)"
          name="title_kab"
          id={`${p}kab`}
          maxLength={80}
          defaultValue={i18n.kab ?? ""}
        />
        <Field label="Présentation" name={`${p}layout`}>
          <Select
            id={`${p}layout`}
            name="layout"
            options={entries(SECTION_LAYOUT_LABELS)}
            defaultValue={section?.layout ?? "poster"}
          />
        </Field>
        <Field label="Public" name={`${p}audience`}>
          <Select
            id={`${p}audience`}
            name="audience"
            options={entries(AUDIENCE_LABELS)}
            defaultValue={section?.audience ?? "all"}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Œuvres max."
            name="max_items"
            id={`${p}max`}
            type="number"
            min={1}
            max={50}
            defaultValue={section?.max_items ?? 20}
          />
          <TextField
            label="Position"
            name="position"
            id={`${p}pos`}
            type="number"
            min={0}
            defaultValue={section?.position ?? nextPosition}
          />
        </div>
      </div>
      <fieldset className="space-y-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">
          Critères (sources « Collection », « Sélection filtrée », « Nouveautés », « Les plus
          regardés »)
        </legend>
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Collection" name={`${p}collection`}>
            <Select
              id={`${p}collection`}
              name="cfg_collection"
              options={collections}
              defaultValue={String(config.collection ?? "")}
              emptyLabel="—"
            />
          </Field>
          <Field label="Type d'œuvre" name={`${p}kind`}>
            <Select
              id={`${p}kind`}
              name="cfg_kind"
              options={entries(TITLE_KIND_LABELS)}
              defaultValue={String(config.kind ?? "")}
              emptyLabel="Tous"
            />
          </Field>
          <Field label="Genre" name={`${p}genre`}>
            <Select
              id={`${p}genre`}
              name="cfg_genre"
              options={genres}
              defaultValue={String(config.genre ?? "")}
              emptyLabel="Tous"
            />
          </Field>
          <Field label="Tri" name={`${p}sort`}>
            <Select
              id={`${p}sort`}
              name="cfg_sort"
              options={[
                { value: "popular", label: "Popularité" },
                { value: "new", label: "Date de publication" },
                { value: "year", label: "Année" },
                { value: "title", label: "Titre" },
              ]}
              defaultValue={String(config.sort ?? "popular")}
            />
          </Field>
          <TextField
            label="Pays d'origine (ISO)"
            name="cfg_country"
            id={`${p}country`}
            maxLength={2}
            defaultValue={String(config.country ?? "")}
          />
          <TextField
            label="Langue (ISO 639)"
            name="cfg_language"
            id={`${p}lang`}
            maxLength={8}
            defaultValue={String(config.language ?? "")}
          />
          <TextField
            label="Étiquette"
            name="cfg_tag"
            id={`${p}tag`}
            maxLength={60}
            defaultValue={String(config.tag ?? "")}
            hint="Ex. : ramadan"
          />
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              name="cfg_original"
              defaultChecked={config.original === true}
              className="size-4 accent-primary"
            />{" "}
            Productions Tamurt
          </label>
        </div>
      </fieldset>
      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          label="Début d'affichage (heure de Paris)"
          name="starts_at"
          id={`${p}start`}
          type="datetime-local"
          defaultValue={toLocalInput(section?.starts_at)}
        />
        <TextField
          label="Fin d'affichage (heure de Paris)"
          name="ends_at"
          id={`${p}end`}
          type="datetime-local"
          defaultValue={toLocalInput(section?.ends_at)}
          hint="Ex. : section Ramadan limitée au mois sacré."
        />
        <label className="flex items-center gap-2 self-center text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={section?.is_active ?? true}
            className="size-4 accent-primary"
          />{" "}
          Section active
        </label>
      </div>
    </>
  );
}

type Banner = {
  id: string;
  headline: string;
  subheadline: string | null;
  cta_label: string | null;
  cta_href: string | null;
  title_id: string | null;
  image_path: string | null;
  audience: string;
  position: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

function BannerFields({ banner, titles }: { banner?: Banner; titles: Option[] }) {
  const p = banner ? `b-${banner.id.slice(0, 8)}-` : "b-new-";
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Accroche"
          name="headline"
          id={`${p}headline`}
          required
          maxLength={120}
          defaultValue={banner?.headline}
        />
        <TextField
          label="Sous-titre"
          name="subheadline"
          id={`${p}sub`}
          maxLength={300}
          defaultValue={banner?.subheadline ?? ""}
        />
        <Field
          label="Œuvre associée"
          name={`${p}title`}
          hint="Son image de fond est utilisée si aucune image n'est fournie. La bannière disparaît si l'œuvre n'est plus disponible."
        >
          <Select
            id={`${p}title`}
            name="title_id"
            options={titles}
            defaultValue={banner?.title_id ?? ""}
            emptyLabel="Aucune"
          />
        </Field>
        <Field label="Public" name={`${p}audience`}>
          <Select
            id={`${p}audience`}
            name="audience"
            options={Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label }))}
            defaultValue={banner?.audience ?? "all"}
          />
        </Field>
        <TextField
          label="Libellé du bouton"
          name="cta_label"
          id={`${p}cta`}
          maxLength={40}
          defaultValue={banner?.cta_label ?? ""}
        />
        <TextField
          label="Lien du bouton"
          name="cta_href"
          id={`${p}href`}
          defaultValue={banner?.cta_href ?? ""}
          hint="Lien interne (/offres) ou https://"
        />
        <TextField
          label="Début (heure de Paris)"
          name="starts_at"
          id={`${p}start`}
          type="datetime-local"
          defaultValue={toLocalInput(banner?.starts_at)}
        />
        <TextField
          label="Fin (heure de Paris)"
          name="ends_at"
          id={`${p}end`}
          type="datetime-local"
          defaultValue={toLocalInput(banner?.ends_at)}
        />
        <TextField
          label="Position"
          name="position"
          id={`${p}pos`}
          type="number"
          min={0}
          defaultValue={banner?.position ?? 0}
        />
        <Field label="Image (16:9, 4 Mo max.)" name={`${p}image`}>
          <input
            id={`${p}image`}
            type="file"
            name="image"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="block w-full text-sm file:me-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-foreground"
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={banner?.is_active ?? true}
          className="size-4 accent-primary"
        />{" "}
        Bannière active
      </label>
    </>
  );
}

export default async function EditorialPage() {
  await requireStaff("editorial.write", "/admin/editorial");
  const supabase = await createSupabaseServerClient();
  const [{ data: sections }, { data: banners }, { data: collections }, { data: titles }, genres] =
    await Promise.all([
      supabase.from("home_sections").select("*").order("position").order("created_at"),
      supabase.from("home_banners").select("*, titles(title)").order("position"),
      supabase.from("collections").select("slug, name").order("name"),
      supabase
        .from("titles")
        .select("id, title")
        .is("deleted_at", null)
        .in("status", ["published", "announced"])
        .order("title")
        .limit(2000),
      getGenres(),
    ]);
  const genreOptions = genres.map((g) => ({ value: g.slug, label: genreLabel(g.labels, "fr") }));
  const collectionOptions = (collections ?? []).map((c) => ({ value: c.slug, label: c.name }));
  const titleOptions = (titles ?? []).map((t) => ({ value: t.id, label: t.title }));
  const list = sections ?? [];
  const now = nowMs();

  return (
    <>
      <AdminPageHeader
        title="Éditorial"
        description="L'accueil est entièrement piloté par ces sections et bannières : ordre, public visé, période d'affichage. Les sections personnelles (reprise, liste, recommandations) ne s'affichent qu'aux membres concernés."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/" target="_blank">
              Voir l&apos;accueil
            </Link>
          </Button>
        }
      />
      <EditorialNav active="/admin/editorial" />

      <section className="mb-10 space-y-3">
        <h2 className="text-lg font-semibold">Sections de l&apos;accueil</h2>
        <ul className="space-y-2">
          {list.map((section, index) => {
            const scheduled =
              (section.starts_at && Date.parse(section.starts_at) > now) ||
              (section.ends_at && Date.parse(section.ends_at) <= now);
            return (
              <li key={section.id}>
                <details className="rounded-xl border bg-card/60">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="w-6 text-center text-xs text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="font-medium">{section.title}</span>
                      <Badge variant="outline">
                        {SECTION_SOURCE_LABELS[section.source] ?? section.source}
                      </Badge>
                      {section.audience !== "all" && (
                        <Badge variant="muted">{AUDIENCE_LABELS[section.audience]}</Badge>
                      )}
                      {!section.is_active && <Badge variant="warning">Masquée</Badge>}
                      {section.is_active && scheduled && <Badge variant="gold">Hors période</Badge>}
                    </span>
                    <span className="flex items-center gap-1">
                      <ActionButton
                        action={moveHomeSectionAction.bind(null, section.id, "up")}
                        variant="ghost"
                        size="icon-sm"
                      >
                        <ArrowUpIcon />
                        <span className="sr-only">Monter</span>
                      </ActionButton>
                      <ActionButton
                        action={moveHomeSectionAction.bind(null, section.id, "down")}
                        variant="ghost"
                        size="icon-sm"
                      >
                        <ArrowDownIcon />
                        <span className="sr-only">Descendre</span>
                      </ActionButton>
                      <ActionButton
                        action={toggleHomeSectionAction.bind(null, section.id, !section.is_active)}
                        variant="ghost"
                        size="icon-sm"
                      >
                        {section.is_active ? <EyeOffIcon /> : <EyeIcon />}
                        <span className="sr-only">
                          {section.is_active ? "Masquer" : "Afficher"}
                        </span>
                      </ActionButton>
                    </span>
                  </summary>
                  <div className="space-y-4 border-t p-5">
                    <ActionForm
                      action={saveHomeSectionAction.bind(null, section.id)}
                      submitLabel="Enregistrer la section"
                    >
                      <SectionFields
                        section={section}
                        genres={genreOptions}
                        collections={collectionOptions}
                        nextPosition={section.position}
                      />
                    </ActionForm>
                    <ConfirmAction
                      action={deleteHomeSectionAction.bind(null, section.id)}
                      label="Supprimer la section"
                      title="Supprimer cette section ?"
                      description="Elle disparaît de l'accueil."
                      variant="ghost"
                      destructive
                    />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
        <details className="rounded-xl border border-dashed p-4">
          <summary className="cursor-pointer text-sm font-medium text-primary">
            Ajouter une section
          </summary>
          <ActionForm
            action={saveHomeSectionAction.bind(null, null)}
            submitLabel="Ajouter la section"
            resetOnSuccess
            className="mt-4"
          >
            <SectionFields
              genres={genreOptions}
              collections={collectionOptions}
              nextPosition={((list.at(-1)?.position ?? 0) as number) + 10}
            />
          </ActionForm>
        </details>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Bannières principales</h2>
        <p className="text-sm text-muted-foreground">
          Sans bannière active, l&apos;accueil présente automatiquement les œuvres mises en avant
          puis les plus regardées.
        </p>
        <ul className="grid gap-3 lg:grid-cols-2">
          {(banners ?? []).map((banner) => {
            const image = resolveImageUrl(banner.image_path);
            return (
              <li key={banner.id} className="rounded-xl border bg-card/60">
                <details>
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
                    <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md border bg-muted">
                      {image && (
                        <Image src={image} alt="" fill sizes="112px" className="object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{banner.headline}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {banner.titles?.title ?? "Sans œuvre"} · {AUDIENCE_LABELS[banner.audience]}
                        {banner.ends_at ? ` · jusqu'au ${formatDateTime(banner.ends_at)}` : ""}
                      </span>
                    </span>
                    {!banner.is_active && <Badge variant="warning">Inactive</Badge>}
                  </summary>
                  <div className="space-y-4 border-t p-4">
                    <ActionForm
                      action={saveBannerAction.bind(null, banner.id)}
                      submitLabel="Enregistrer"
                    >
                      <BannerFields banner={banner} titles={titleOptions} />
                    </ActionForm>
                    <ConfirmAction
                      action={deleteBannerAction.bind(null, banner.id)}
                      label="Supprimer"
                      title="Supprimer cette bannière ?"
                      description="Elle disparaît de l'accueil."
                      variant="ghost"
                      destructive
                    />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
        <details className="rounded-xl border border-dashed p-4">
          <summary className="cursor-pointer text-sm font-medium text-primary">
            Ajouter une bannière
          </summary>
          <ActionForm
            action={saveBannerAction.bind(null, null)}
            submitLabel="Ajouter la bannière"
            resetOnSuccess
            className="mt-4"
          >
            <BannerFields titles={titleOptions} />
          </ActionForm>
        </details>
      </section>
    </>
  );
}
