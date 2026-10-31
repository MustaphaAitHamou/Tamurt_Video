import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GoogleButton } from "@/components/auth/google-button";
import { SignInForm } from "@/components/auth/sign-in-form";
import { safeNextPath } from "@/lib/navigation";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function SignInPage({ searchParams }: PageProps<"/connexion">) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/");
  if (await getSessionUser()) redirect(next);
  const t = await getTranslations("auth");
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("signInTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("signInSubtitle")}</p>
      </div>
      {params.erreur === "lien" && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {t("linkInvalid")}
        </p>
      )}
      <GoogleButton next={next} />
      <SignInForm next={next} />
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href={`/inscription${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("signUp")}
        </Link>
      </p>
    </div>
  );
}
