import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GoogleButton } from "@/components/auth/google-button";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { safeNextPath } from "@/lib/navigation";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function SignUpPage({ searchParams }: PageProps<"/inscription">) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/");
  if (await getSessionUser()) redirect(next);
  const t = await getTranslations("auth");
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("signUpTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("signUpSubtitle")}</p>
      </div>
      <GoogleButton next={next} />
      <SignUpForm />
      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link
          href="/connexion"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
