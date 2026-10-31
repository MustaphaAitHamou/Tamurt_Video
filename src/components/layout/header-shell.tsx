"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { MenuIcon, SearchIcon } from "lucide-react";

import { Logo, LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { SearchBox } from "@/components/layout/search-box";
import { UserMenu } from "@/components/layout/user-menu";
import type { HeaderViewer, NavLink } from "@/components/layout/types";
import { cn } from "@/lib/utils";

function isActive(link: NavLink, pathname: string, search: string) {
  if (link.href === "/") return pathname === "/";
  const [path, query] = link.href.split("?");
  if (pathname !== path) return false;
  if (!query) return !search.includes("type=");
  return search.includes(query);
}

export function HeaderShell({ viewer, links, founderPhase }: { viewer: HeaderViewer | null; links: NavLink[]; founderPhase: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [scrolled, setScrolled] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        scrolled
          ? "bg-background/90 shadow-[0_1px_0_0_var(--border)] backdrop-blur-xl"
          : "bg-gradient-to-b from-black/80 via-black/40 to-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-10">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label={t("openMenu")}>
              <MenuIcon className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0" closeLabel={t("menu")}>
            <SheetHeader className="border-b">
              <SheetTitle>
                <Logo className="h-7" />
              </SheetTitle>
            </SheetHeader>
            <nav aria-label={t("mainNavigation")} className="flex flex-col gap-1 px-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-base font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground",
                    isActive(link, pathname, search) && "bg-accent text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto border-t p-4">
              <LocaleSwitcher />
            </div>
          </SheetContent>
        </Sheet>

        <Link href="/" className="shrink-0 rounded-md text-foreground" aria-label="Tamurt Vidéo — accueil">
          <Logo className="hidden h-7 sm:block" />
          <LogoMark className="size-8 sm:hidden" />
        </Link>

        <nav aria-label={t("mainNavigation")} className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium text-white/75 transition hover:text-white",
                isActive(link, pathname, search) && "text-white",
                link.href === "/fondateurs" && founderPhase && "text-gold hover:text-gold",
              )}
              aria-current={isActive(link, pathname, search) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <SearchBox className="hidden w-64 md:block xl:w-80" />
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label={t("menu")}
            onClick={() => setMobileSearch((value) => !value)}
          >
            <SearchIcon className="size-5" />
          </Button>
          <div className="hidden sm:block">
            <LocaleSwitcher compact />
          </div>
          {viewer ? (
            <UserMenu viewer={viewer} />
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/connexion">{t("signIn")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={founderPhase ? "/fondateurs" : "/inscription"}>{founderPhase ? t("founders") : t("signUp")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
      {mobileSearch && (
        <div className="px-4 pb-3 md:hidden">
          <SearchBox autoFocus />
        </div>
      )}
    </header>
  );
}
