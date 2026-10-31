"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BellIcon,
  CreditCardIcon,
  HistoryIcon,
  LayoutGridIcon,
  ListVideoIcon,
  LockKeyholeIcon,
  ReceiptIcon,
  ShieldIcon,
  UserIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export function AccountNav() {
  const t = useTranslations("account");
  const pathname = usePathname();
  const items = [
    { href: "/compte", label: t("overview"), icon: LayoutGridIcon },
    { href: "/compte/profil", label: t("profile"), icon: UserIcon },
    { href: "/compte/abonnement", label: t("subscription"), icon: CreditCardIcon },
    { href: "/compte/factures", label: t("invoices"), icon: ReceiptIcon },
    { href: "/compte/ma-liste", label: t("myList"), icon: ListVideoIcon },
    { href: "/compte/historique", label: t("history"), icon: HistoryIcon },
    { href: "/compte/notifications", label: t("notifications"), icon: BellIcon },
    { href: "/compte/securite", label: t("security"), icon: LockKeyholeIcon },
    { href: "/compte/confidentialite", label: t("privacy"), icon: ShieldIcon },
  ];
  return (
    <nav aria-label={t("title")} className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/compte" ? pathname === "/compte" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition hover:bg-accent hover:text-foreground",
              active && "bg-accent text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
