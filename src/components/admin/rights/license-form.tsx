"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Field, FormMessage, SubmitButton, TextField } from "@/components/forms/form-fields";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  LICENSE_STATUS_LABELS,
  LICENSE_TYPE_LABELS,
  MODE_LABELS,
  SUPPORT_LABELS,
} from "@/components/admin/rights/labels";
import type { ActionResult } from "@/server/errors";

export type LicenseFormValues = {
  title_id: string;
  rights_holder_id: string | null;
  license_type: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  exploitation_modes: string[];
  supports: string[];
  is_exclusive: boolean;
  max_quality: string | null;
  contract_reference: string | null;
  fee_terms: string | null;
  restrictions: string | null;
  notes: string | null;
  territories: string[];
  excluded: string[];
};

export function LicenseForm({
  action,
  titles,
  holders,
  defaults,
  redirectOnCreate = false,
}: {
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData,
  ) => Promise<ActionResult<{ id: string }>>;
  titles: { id: string; title: string }[];
  holders: { id: string; name: string }[];
  defaults?: Partial<LicenseFormValues>;
  redirectOnCreate?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, null);
  useEffect(() => {
    if (redirectOnCreate && state?.ok) router.push(`/admin/droits/licences/${state.data.id}`);
  }, [state, redirectOnCreate, router]);
  const d = defaults ?? {};
  const err = (name: string) => (!state?.ok ? state?.fieldErrors?.[name] : undefined);
  const day = (value: string | null | undefined) => (value ? value.slice(0, 10) : "");

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Œuvre" name="title_id" required>
          <NativeSelect id="title_id" name="title_id" defaultValue={d.title_id ?? ""} required>
            <option value="" disabled>
              Choisir une œuvre…
            </option>
            {titles.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="Ayant droit"
          name="rights_holder_id"
          hint="À créer au préalable dans « Ayants droit »."
        >
          <NativeSelect
            id="rights_holder_id"
            name="rights_holder_id"
            defaultValue={d.rights_holder_id ?? ""}
          >
            <option value="">Non renseigné</option>
            {holders.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Type de droits" name="license_type">
          <NativeSelect
            id="license_type"
            name="license_type"
            defaultValue={d.license_type ?? "non_exclusive_license"}
          >
            {Object.entries(LICENSE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="Statut du contrat"
          name="status"
          hint="Seule une licence « Signée » autorise la diffusion."
        >
          <NativeSelect id="status" name="status" defaultValue={d.status ?? "draft"}>
            {Object.entries(LICENSE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <TextField
          label="Début des droits"
          name="starts_at"
          type="date"
          required
          defaultValue={day(d.starts_at)}
          error={err("starts_at")}
        />
        <TextField
          label="Fin des droits"
          name="ends_at"
          type="date"
          defaultValue={day(d.ends_at)}
          error={err("ends_at")}
          hint="Obligatoire sauf production propre, domaine public vérifié ou licence libre. La diffusion s'arrête automatiquement à cette date."
        />
        <TextField
          label="Territoires autorisés"
          name="territories"
          required
          defaultValue={(d.territories ?? []).join(", ")}
          error={err("territories")}
          hint="Codes pays ISO séparés par des virgules (DZ, FR, BE…) ou WW pour le monde entier."
        />
        <TextField
          label="Territoires exclus"
          name="excluded"
          defaultValue={(d.excluded ?? []).join(", ")}
          error={err("excluded")}
          hint="Uniquement avec WW (ex. : monde entier sauf US, CA)."
        />
        <Field label="Qualité maximale autorisée" name="max_quality">
          <NativeSelect id="max_quality" name="max_quality" defaultValue={d.max_quality ?? ""}>
            <option value="">Non limitée par le contrat</option>
            <option value="sd">SD</option>
            <option value="hd">HD 720p</option>
            <option value="fhd">Full HD 1080p</option>
            <option value="uhd">Ultra HD</option>
          </NativeSelect>
        </Field>
        <TextField
          label="Référence du contrat"
          name="contract_reference"
          defaultValue={d.contract_reference ?? ""}
          maxLength={120}
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Modes d&apos;exploitation autorisés</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(MODE_LABELS).map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/15"
            >
              <input
                type="checkbox"
                name="modes"
                value={value}
                defaultChecked={(d.exploitation_modes ?? ["svod"]).includes(value)}
                className="size-4 accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
        {err("modes") && <p className="text-xs text-destructive-text">{err("modes")?.join(" ")}</p>}
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Supports autorisés</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SUPPORT_LABELS).map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/15"
            >
              <input
                type="checkbox"
                name="supports"
                value={value}
                defaultChecked={(d.supports ?? ["web"]).includes(value)}
                className="size-4 accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_exclusive"
          defaultChecked={d.is_exclusive}
          className="size-4 accent-primary"
        />{" "}
        Exclusivité accordée à Tamurt Vidéo
      </label>
      <div className="grid gap-5 md:grid-cols-3">
        <Field label="Conditions financières" name="fee_terms">
          <Textarea
            id="fee_terms"
            name="fee_terms"
            defaultValue={d.fee_terms ?? ""}
            maxLength={2000}
            placeholder="Minimum garanti, partage de recettes…"
          />
        </Field>
        <Field label="Restrictions" name="restrictions">
          <Textarea
            id="restrictions"
            name="restrictions"
            defaultValue={d.restrictions ?? ""}
            maxLength={2000}
            placeholder="Fenêtres, publicité interdite, crédits obligatoires…"
          />
        </Field>
        <Field label="Notes internes" name="notes">
          <Textarea id="notes" name="notes" defaultValue={d.notes ?? ""} maxLength={4000} />
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton>Enregistrer la licence</SubmitButton>
    </form>
  );
}
