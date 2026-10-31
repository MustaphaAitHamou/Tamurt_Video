import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DownloadIcon } from "lucide-react";

import { submitDataRequestAction, updatePrivacyAction } from "@/actions/account";
import { DeleteAccountForm } from "@/components/account/danger-forms";
import { AccountSection } from "@/components/account/section";
import { ActionForm } from "@/components/forms/action-form";
import { Field } from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { requireViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Confidentialité", robots: { index: false } };

export default async function PrivacyPage() {
  const viewer = await requireViewer("/compte/confidentialite");
  const [t, tc] = await Promise.all([getTranslations("account"), getTranslations("common")]);
  const checkbox = (name: string, label: string, checked: boolean) => (
    <label className="flex items-center gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} className="size-4 accent-primary" />
      {label}
    </label>
  );
  return (
    <>
      <AccountSection title={t("privacyTitle")}>
        <ActionForm action={updatePrivacyAction} submitLabel={tc("save")}>
          {checkbox("marketingOptIn", t("marketingOptIn"), viewer.profile.marketingOptIn)}
          {checkbox("personalizedRecommendations", t("personalizedRecommendations"), viewer.profile.personalizedRecommendations)}
          {checkbox("searchHistoryEnabled", t("searchHistory"), viewer.profile.searchHistoryEnabled)}
        </ActionForm>
      </AccountSection>

      <AccountSection title={t("exportData")} description={t("exportDataText")}>
        <Button asChild variant="secondary">
          <a href="/api/account/export" download>
            <DownloadIcon /> {t("exportData")}
          </a>
        </Button>
      </AccountSection>

      <AccountSection title={t("dataRequest")} description={t("dataRequestDescription")}>
        <ActionForm action={submitDataRequestAction} submitLabel={tc("send")} resetOnSuccess>
          <Field label={t("dataRequestType")} name="requestType">
            <NativeSelect id="requestType" name="requestType" defaultValue="access">
              {(["access", "export", "rectification", "erasure", "restriction", "objection"] as const).map((type) => (
                <option key={type} value={type}>
                  {t(`dataRequestTypes.${type}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("dataRequestDetails")} name="details">
            <Textarea id="details" name="details" maxLength={2000} />
          </Field>
        </ActionForm>
      </AccountSection>

      <AccountSection title={t("deleteAccount")} description={t("deleteAccountText")} tone="danger">
        <DeleteAccountForm requirePassword={viewer.user.provider === "email" || viewer.user.provider === undefined} />
      </AccountSection>
    </>
  );
}
