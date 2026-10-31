"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  BellIcon,
  CrownIcon,
  GemIcon,
  LayoutDashboardIcon,
  ListVideoIcon,
  LogOutIcon,
  MessageSquarePlusIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";

import { signOutAction } from "@/actions/auth";
import { switchProfileAction } from "@/actions/profiles";
import { ProfileAvatar } from "@/components/account/profile-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HeaderViewer } from "@/components/layout/types";

export function UserMenu({ viewer }: { viewer: HeaderViewer }) {
  const t = useTranslations("nav");
  const tt = useTranslations("tiers");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = viewer.profiles.find((p) => p.id === viewer.activeProfileId) ?? viewer.profiles[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative flex cursor-pointer items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("account")}
        disabled={pending}
      >
        <ProfileAvatar avatarKey={active?.avatarKey ?? viewer.avatarKey} name={active?.name} />
        {viewer.unreadCount > 0 && (
          <span className="absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold">
            {viewer.unreadCount > 9 ? "9+" : viewer.unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-3 py-2">
          <ProfileAvatar avatarKey={active?.avatarKey ?? viewer.avatarKey} className="size-10" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {active?.name ?? viewer.displayName}
            </span>
            <span className="block truncate text-xs font-normal">{viewer.email}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-foreground/80">
              {viewer.isFounder ? (
                <CrownIcon className="size-3 text-gold" />
              ) : (
                <GemIcon className="size-3" />
              )}
              {viewer.isFounder ? tt("founder") : tt(viewer.tier)}
            </span>
          </span>
        </DropdownMenuLabel>
        {viewer.profiles.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("switchProfile")}</DropdownMenuLabel>
            <DropdownMenuGroup>
              {viewer.profiles
                .filter((p) => p.id !== viewer.activeProfileId)
                .map((profile) => (
                  <DropdownMenuItem
                    key={profile.id}
                    onSelect={() =>
                      startTransition(async () => {
                        await switchProfileAction(profile.id);
                        router.refresh();
                      })
                    }
                  >
                    <ProfileAvatar avatarKey={profile.avatarKey} className="size-6 text-xs" />
                    {profile.name}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profils">
              <UsersIcon /> {t("manageProfiles")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/compte/ma-liste">
              <ListVideoIcon /> {t("myList")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/compte/notifications">
              <BellIcon /> {t("notifications")}
              {viewer.unreadCount > 0 && (
                <span className="ms-auto rounded-full bg-primary px-1.5 text-[10px] font-bold">
                  {viewer.unreadCount}
                </span>
              )}
            </Link>
          </DropdownMenuItem>
          {viewer.isFounder && (
            <DropdownMenuItem asChild>
              <Link href="/espace-fondateur">
                <CrownIcon className="text-gold" /> {t("founderSpace")}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/demandes">
              <MessageSquarePlusIcon /> {t("requests")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/compte">
              <SettingsIcon /> {t("account")}
            </Link>
          </DropdownMenuItem>
          {viewer.isStaff && (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <LayoutDashboardIcon /> {t("admin")}
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="w-full">
              <LogOutIcon /> {t("signOut")}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
