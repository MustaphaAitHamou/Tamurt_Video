import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import "./globals.css";
import { directionFor, isLocale, localeIntlTag } from "@/i18n/config";
import { publicEnv } from "@/lib/public-env";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const outfit = localFont({
  src: "../../node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2",
  variable: "--font-outfit",
  weight: "100 900",
  display: "swap",
});

const notoArabic = localFont({
  src: "../../node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-arabic-wght-normal.woff2",
  variable: "--font-arabic",
  weight: "100 900",
  display: "swap",
  preload: false,
});

const notoTifinagh = localFont({
  src: "../../node_modules/@fontsource/noto-sans-tifinagh/files/noto-sans-tifinagh-tifinagh-400-normal.woff2",
  variable: "--font-tifinagh",
  weight: "400",
  display: "swap",
  preload: false,
});

const isIndexable = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : process.env.NODE_ENV === "production";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("footer");
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: "Tamurt Vidéo", template: "%s · Tamurt Vidéo" },
    description: t("tagline"),
    applicationName: "Tamurt Vidéo",
    openGraph: {
      type: "website",
      siteName: "Tamurt Vidéo",
      locale: "fr_FR",
      title: "Tamurt Vidéo",
      description: t("tagline"),
    },
    twitter: { card: "summary_large_image", title: "Tamurt Vidéo", description: t("tagline") },
    robots: isIndexable ? { index: true, follow: true } : { index: false, follow: false },
    manifest: "/manifest.webmanifest",
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0b0e",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : "fr";
  const t = await getTranslations("common");

  return (
    <html
      lang={locale}
      dir={directionFor(locale)}
      data-intl={localeIntlTag[locale]}
      className={cn(GeistSans.variable, GeistMono.variable, outfit.variable, notoArabic.variable, notoTifinagh.variable)}
      suppressHydrationWarning
    >
      <body>
        <a
          href="#contenu"
          className="sr-only z-[100] rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <TooltipProvider>
            {children}
            <Toaster position="bottom-center" />
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
