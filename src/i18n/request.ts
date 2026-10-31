import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  defaultLocale,
  isLocale,
  localeCookieName,
  negotiateLocale,
  type Locale,
} from "@/i18n/config";
import { mergeMessages } from "@/i18n/merge";

async function loadMessages(locale: Locale) {
  const base = (await import("../../messages/fr.json")).default;
  if (locale === "fr") return base;
  const override = (await import(`../../messages/${locale}.json`)).default;
  return mergeMessages(base, override);
}

export default getRequestConfig(async ({ locale: explicitLocale }) => {
  let locale: Locale = defaultLocale;
  if (isLocale(explicitLocale)) {
    locale = explicitLocale;
  } else {
    const cookieLocale = (await cookies()).get(localeCookieName)?.value;
    locale = isLocale(cookieLocale)
      ? cookieLocale
      : negotiateLocale((await headers()).get("accept-language"));
  }

  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: "Europe/Paris",
  };
});
