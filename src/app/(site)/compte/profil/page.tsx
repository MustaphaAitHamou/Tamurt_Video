import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { changeEmailAction, updateAccountSettingsAction } from "@/actions/account";
import { AccountSection } from "@/components/account/section";
import { ActionForm } from "@/components/forms/action-form";
import { Field, TextField } from "@/components/forms/form-fields";
import { NativeSelect } from "@/components/ui/native-select";
import { localeLabels, locales, localeStatus } from "@/i18n/config";
import { COUNTRIES } from "@/lib/constants";
import { requireViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Informations personnelles", robots: { index: false } };

const SUBTITLE_LANGUAGES: Record<string, string> = { fr: "Français", ar: "العربية", en: "English", kab: "Taqbaylit", es: "Español" };

export default async function ProfileSettingsPage() {
  const viewer = await requireViewer("/compte/profil");
  const [t, tc] = await Promise.all([getTranslations("account"), getTranslations("common")]);
  return (
    <>
      <AccountSection title={t("profile")}>
        <ActionForm action={updateAccountSettingsAction} submitLabel={tc("save")}>
          <TextField label={t("displayName")} name="displayName" defaultValue={viewer.profile.displayName ?? ""} required maxLength={60} />
          <Field label={t("country")} name="countryCode" hint={t("countryHint")}>
            <NativeSelect id="countryCode" name="countryCode" defaultValue={viewer.profile.countryCode ?? ""}>
              <option value="">—</option>
              {Object.entries(COUNTRIES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("interfaceLanguage")} name="preferredLocale">
            <NativeSelect id="preferredLocale" name="preferredLocale" defaultValue={viewer.profile.preferredLocale}>
              {locales.map((code) => (
                <option key={code} value={code}>
                  {localeLabels[code]}
                  {localeStatus[code] !== "reference" ? " (bêta)" : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("subtitleLanguage")} name="subtitleLocale">
            <NativeSelect id="subtitleLocale" name="subtitleLocale" defaultValue={viewer.profile.subtitleLocale ?? ""}>
              <option value="">{t("noSubtitlePreference")}</option>
              {Object.entries(SUBTITLE_LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="autoplayNext" defaultChecked={viewer.profile.autoplayNext} className="size-4 accent-primary" />
            {t("autoplayNext")}
          </label>
        </ActionForm>
      </AccountSection>

      <AccountSection title={t("changeEmail")} description={viewer.user.email}>
        <ActionForm action={changeEmailAction} submitLabel={t("changeEmail")} resetOnSuccess>
          <TextField label={t("email")} name="email" type="email" autoComplete="email" required />
        </ActionForm>
      </AccountSection>
    </>
  );
}
