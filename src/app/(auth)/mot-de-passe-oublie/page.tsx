import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ForgotPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("forgotTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("forgotSubtitle")}</p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-sm">
        <Link href="/connexion" className="text-muted-foreground hover:text-foreground">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
