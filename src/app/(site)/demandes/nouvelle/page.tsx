import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { RequestForm } from "@/components/requests/request-form";
import { requireViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Nouvelle demande", robots: { index: false } };

export default async function NewRequestPage() {
  const viewer = await requireViewer("/demandes/nouvelle");
  if (viewer.entitlements.tier !== "premium") redirect("/demandes");
  const t = await getTranslations("requests");
  return (
    <div className="mx-auto max-w-2xl px-4 pt-28 pb-16">
      <h1 className="mb-8 text-3xl font-bold">{t("newRequest")}</h1>
      <div className="rounded-2xl border bg-card/60 p-6">
        <RequestForm />
      </div>
    </div>
  );
}
