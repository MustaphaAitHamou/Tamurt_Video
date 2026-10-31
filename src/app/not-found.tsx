import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { StatusPage } from "@/components/feedback/status-page";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors");
  const tn = await getTranslations("nav");
  return (
    <StatusPage
      code="404"
      title={t("notFoundTitle")}
      description={t("notFoundText")}
      actions={
        <>
          <Button asChild>
            <Link href="/">{t("backHome")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/catalogue">{tn("browse")}</Link>
          </Button>
        </>
      }
    />
  );
}
