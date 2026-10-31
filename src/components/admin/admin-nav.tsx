"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  BookOpenIcon,
  CreditCardIcon,
  FilmIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  MessagesSquareIcon,
  ScaleIcon,
  ScrollTextIcon,
  SettingsIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboardIcon, permission: "admin.access" },
  { href: "/admin/catalogue", label: "Catalogue", icon: FilmIcon, permission: "catalog.read_all" },
  { href: "/admin/droits", label: "Droits et licences", icon: ScaleIcon, permission: "rights.read" },
  { href: "/admin/editorial", label: "Éditorial", icon: BookOpenIcon, permission: "editorial.write" },
  { href: "/admin/demandes", label: "Demandes", icon: MessagesSquareIcon, permission: "requests.moderate" },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: UsersIcon, permission: "users.read" },
  { href: "/admin/abonnements", label: "Abonnements", icon: CreditCardIcon, permission: "billing.read" },
  { href: "/admin/finances", label: "Finances", icon: WalletIcon, permission: "finance.read" },
  { href: "/admin/publicite", label: "Publicité", icon: MegaphoneIcon, permission: "ads.manage" },
  { href: "/admin/messages", label: "Messages", icon: MessageSquareIcon, permission: "messages.read" },
  { href: "/admin/hq", label: "Tamurt HQ", icon: KeyRoundIcon, permission: "hq.manage" },
  { href: "/admin/audit", label: "Journal d'audit", icon: ScrollTextIcon, permission: "audit.read" },
  { href: "/admin/parametres", label: "Paramètres", icon: SettingsIcon, permission: "settings.write" },
] as const;

export function AdminNav({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const visible = ITEMS.filter((item) => permissions.includes(item.permission) || (item.href === "/admin/demandes" && permissions.includes("requests.confirm_acquisition")));
  return (
    <nav aria-label="Administration" className="scrollbar-none flex gap-1 overflow-x-auto lg:flex-col">
      {visible.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm whitespace-nowrap text-muted-foreground transition hover:bg-accent hover:text-foreground",
              active && "bg-accent font-medium text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
      <span className="hidden items-center gap-3 px-3 py-2 text-xs text-muted-foreground lg:flex">
        <BarChart3Icon className="size-3.5" /> Interface d&apos;administration
      </span>
    </nav>
  );
}
