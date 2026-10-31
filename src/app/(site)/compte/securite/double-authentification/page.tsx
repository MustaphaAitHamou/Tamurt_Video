import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MfaEnrollment, MfaLoginForm } from "@/components/account/mfa-forms";
import { AccountSection } from "@/components/account/section";
import { safeNextPath } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Double authentification", robots: { index: false } };

export default async function MfaSetupPage({
  searchParams,
}: PageProps<"/compte/securite/double-authentification">) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "");
  const viewer = await requireViewer("/compte/securite/double-authentification");
  const t = await getTranslations("account");
  const supabase = await createSupabaseServerClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasVerified = (factors?.totp ?? []).some((f) => f.status === "verified");

  return (
    <AccountSection
      title={t("mfaTitle")}
      description={
        viewer.staff.roles.length > 0
          ? "L'accès au back-office exige la double authentification. Activez-la ou confirmez votre code pour continuer."
          : t("mfaDescription")
      }
    >
      {hasVerified ? (
        viewer.user.aal === "aal2" ? (
          <p className="text-sm text-success">
            Double authentification active et vérifiée pour cette session.
          </p>
        ) : (
          <MfaLoginForm next={next || "/compte/securite"} />
        )
      ) : (
        <MfaEnrollment next={next || undefined} />
      )}
    </AccountSection>
  );
}
