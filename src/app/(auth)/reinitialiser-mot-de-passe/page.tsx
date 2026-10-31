import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { UpdatePasswordForm } from "@/components/auth/password-forms";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth");
  const user = await getSessionUser();
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("resetTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {user ? t("resetSubtitle") : t("linkInvalid")}
        </p>
      </div>
      {user ? (
        <UpdatePasswordForm />
      ) : (
        <Button asChild className="w-full">
          <Link href="/mot-de-passe-oublie">{t("sendResetLink")}</Link>
        </Button>
      )}
    </div>
  );
}
