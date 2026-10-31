import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { submitClaimAction } from "@/actions/public-forms";
import { ActionForm } from "@/components/forms/action-form";
import { Field, TextField } from "@/components/forms/form-fields";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export const metadata: Metadata = {
  title: "Signaler un contenu",
  description: "Procédure de signalement et de retrait de contenu pour les titulaires de droits.",
};

export default async function ReportPage({ searchParams }: PageProps<"/signalement">) {
  const params = await searchParams;
  const t = await getTranslations("report");
  const prefill = typeof params.oeuvre === "string" ? params.oeuvre.slice(0, 300) : "";
  return (
    <div className="mx-auto max-w-2xl px-4 pt-28 pb-16">
      <h1 className="mb-3 text-3xl font-bold">{t("title")}</h1>
      <p className="mb-8 leading-relaxed text-muted-foreground">{t("subtitle")}</p>
      <div className="rounded-2xl border bg-card/60 p-6">
        <ActionForm action={submitClaimAction} submitLabel={t("submit")} resetOnSuccess>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Nom" name="claimantName" required maxLength={200} />
            <TextField label="Adresse email" name="claimantEmail" type="email" required />
          </div>
          <TextField label={t("organization")} name="organization" maxLength={200} />
          <TextField
            label={t("titleReference")}
            name="titleReference"
            required
            maxLength={300}
            defaultValue={prefill}
          />
          <Field label={t("claimType")} name="claimType">
            <NativeSelect id="claimType" name="claimType" defaultValue="copyright">
              {(["copyright", "trademark", "privacy", "defamation", "other"] as const).map(
                (type) => (
                  <option key={type} value={type}>
                    {t(`types.${type}`)}
                  </option>
                ),
              )}
            </NativeSelect>
          </Field>
          <Field label={t("description")} name="description" required>
            <Textarea
              id="description"
              name="description"
              required
              minLength={10}
              maxLength={5000}
              className="min-h-40"
            />
          </Field>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="sworn" required className="mt-0.5 size-4 accent-primary" />
            {t("sworn")}
          </label>
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden
          />
        </ActionForm>
      </div>
    </div>
  );
}
