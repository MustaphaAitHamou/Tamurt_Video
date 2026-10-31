import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ShieldAlertIcon } from "lucide-react";

import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Compte suspendu", robots: { index: false } };

export default async function SuspendedPage() {
  const t = await getTranslations("auth");
  const tn = await getTranslations("nav");
  const tf = await getTranslations("footer");
  return (
    <div className="space-y-5 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive-text">
        <ShieldAlertIcon className="size-7" />
      </span>
      <h1 className="text-2xl font-bold">{t("suspendedTitle")}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{t("suspendedText")}</p>
      <div className="flex flex-col gap-2">
        <Button asChild variant="secondary">
          <Link href="/contact">{tf("contact")}</Link>
        </Button>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" className="w-full">
            {tn("signOut")}
          </Button>
        </form>
      </div>
    </div>
  );
}
