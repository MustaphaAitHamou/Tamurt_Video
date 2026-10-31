import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { CookieSettingsButton } from "@/components/legal/cookie-settings-button";
import { getPublicSettings } from "@/server/settings";

export async function SiteFooter() {
  const [t, tn, settings] = await Promise.all([getTranslations("footer"), getTranslations("nav"), getPublicSettings()]);
  const year = new Date().getFullYear();

  const columns = [
    {
      title: t("platform"),
      links: [
        { href: "/catalogue", label: tn("browse") },
        { href: "/prochainement", label: tn("comingSoon") },
        { href: "/fondateurs", label: tn("founders") },
        { href: "/offres", label: tn("pricing") },
        { href: "/actualites", label: tn("news") },
        { href: "/feuille-de-route", label: tn("roadmap") },
      ],
    },
    {
      title: t("account"),
      links: [
        { href: "/compte", label: tn("account") },
        { href: "/compte/abonnement", label: tn("pricing") },
        { href: "/demandes", label: tn("requests") },
        { href: "/compte/confidentialite", label: t("dataRequests") },
      ],
    },
    {
      title: t("legal"),
      links: [
        { href: "/legal/mentions-legales", label: t("legalNotice") },
        { href: "/legal/cgu", label: t("terms") },
        { href: "/legal/cga", label: t("subscriptionTerms") },
        { href: "/legal/confidentialite", label: t("privacy") },
        { href: "/legal/cookies", label: t("cookies") },
        { href: "/legal/remboursement", label: t("refunds") },
      ],
    },
    {
      title: t("help"),
      links: [
        { href: "/aide", label: t("faq") },
        { href: "/contact", label: t("contact") },
        { href: "/signalement", label: t("report") },
      ],
    },
  ];

  return (
    <footer className="relative mt-24 border-t bg-black/40">
      <div className="bg-tamurt-pattern absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-[1600px] px-4 py-14 sm:px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div className="max-w-sm space-y-4">
            <Logo className="h-8" />
            <p className="text-sm leading-relaxed text-muted-foreground">{t("tagline")}</p>
            <p className="font-tifinagh text-lg tracking-[0.3em] text-white/30" aria-hidden>
              ⵜⴰⵎⵓⵔⵜ
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="mb-3 font-sans text-xs font-semibold tracking-widest text-white/50 uppercase">{column.title}</h2>
                <ul className="space-y-2">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-muted-foreground transition hover:text-foreground">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  {column.title === t("legal") && (
                    <li>
                      <CookieSettingsButton label={t("cookieSettings")} />
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            © {year} Tamurt Vidéo — {t("rights")} · Tamurt Services
          </p>
          <div className="flex flex-col gap-1 md:items-end">
            {settings.showDemoContent && <p>{t("demoNotice")}</p>}
            <p>{t("legalDraft")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
