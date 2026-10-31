import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { submitContactAction } from "@/actions/public-forms";
import { ActionForm } from "@/components/forms/action-form";
import { Field, TextField } from "@/components/forms/form-fields";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { getViewer } from "@/server/auth/session";
import { getPublicSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Contact", description: "Contacter l'équipe Tamurt Vidéo." };

export default async function ContactPage() {
  const [t, tc, viewer, settings] = await Promise.all([getTranslations("contact"), getTranslations("common"), getViewer(), getPublicSettings()]);
  return (
    <div className="mx-auto max-w-2xl px-4 pt-28 pb-16">
      <h1 className="mb-3 text-3xl font-bold">{t("title")}</h1>
      <p className="mb-8 text-muted-foreground">{t("subtitle")}</p>
      <div className="rounded-2xl border bg-card/60 p-6">
        <ActionForm action={submitContactAction} submitLabel={t("submit")} resetOnSuccess>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label={t("name")} name="name" required maxLength={120} defaultValue={viewer?.profile.displayName ?? ""} />
            <TextField label={t("email")} name="email" type="email" required defaultValue={viewer?.user.email ?? ""} />
          </div>
          <Field label={t("category")} name="category">
            <NativeSelect id="category" name="category" defaultValue="general">
              {(["general", "support", "billing", "rights", "press", "partnership", "privacy"] as const).map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <TextField label={t("subject")} name="subject" required maxLength={200} />
          <Field label={t("message")} name="message" required>
            <Textarea id="message" name="message" required minLength={10} maxLength={5000} className="min-h-40" />
          </Field>
          {/* Champ piège anti-robots, invisible pour les humains */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        </ActionForm>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        {tc("or")} : {settings.supportEmail}
      </p>
    </div>
  );
}
