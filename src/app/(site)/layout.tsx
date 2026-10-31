import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangleIcon } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CookieConsent } from "@/components/legal/cookie-consent";
import { isLocale, localeStatus } from "@/i18n/config";
import { getPublicSettings } from "@/server/settings";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [settings, rawLocale, t] = await Promise.all([
    getPublicSettings(),
    getLocale(),
    getTranslations("common"),
  ]);
  const draftLocale = isLocale(rawLocale) && localeStatus[rawLocale] !== "reference";

  return (
    <>
      <SiteHeader />
      {(settings.maintenanceMode || draftLocale) && (
        <div className="fixed inset-x-0 top-16 z-30 flex flex-col">
          {settings.maintenanceMode && (
            <p
              role="status"
              className="flex items-center justify-center gap-2 bg-warning/90 px-4 py-1.5 text-center text-xs font-medium text-black"
            >
              <AlertTriangleIcon className="size-3.5" /> {t("maintenance")}
            </p>
          )}
          {draftLocale && (
            <p className="bg-black/70 px-4 py-1 text-center text-[11px] text-white/70 backdrop-blur">
              {t("draftTranslation")}
            </p>
          )}
        </div>
      )}
      <main id="contenu" tabIndex={-1} className="min-h-dvh outline-none">
        {children}
      </main>
      <SiteFooter />
      <CookieConsent />
    </>
  );
}
