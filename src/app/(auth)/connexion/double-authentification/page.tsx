import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheckIcon } from "lucide-react";

import { MfaLoginForm } from "@/components/account/mfa-forms";
import { safeNextPath } from "@/lib/navigation";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Double authentification", robots: { index: false } };

export default async function MfaChallengePage({ searchParams }: PageProps<"/connexion/double-authentification">) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/");
  const user = await getSessionUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  if (user.aal === "aal2") redirect(next);
  return (
    <div className="space-y-6">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <ShieldCheckIcon className="size-6" />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Double authentification</h1>
        <p className="text-sm text-muted-foreground">Saisissez le code généré par votre application d&apos;authentification.</p>
      </div>
      <MfaLoginForm next={next} />
    </div>
  );
}
