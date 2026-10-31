"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { StatusPage } from "@/components/feedback/status-page";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  const tc = useTranslations("common");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <StatusPage
      code="500"
      title={t("genericTitle")}
      description={`${t("genericText")}${error.digest ? ` (réf. ${error.digest})` : ""}`}
      actions={
        <>
          <Button onClick={() => reset()}>{tc("retry")}</Button>
          <Button asChild variant="outline">
            <Link href="/">{t("backHome")}</Link>
          </Button>
        </>
      }
    />
  );
}
