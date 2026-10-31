import type { PlanTier } from "@/lib/permissions";

/** Données minimales transmises aux composants clients de l'en-tête. */
export type HeaderViewer = {
  displayName: string;
  email: string;
  avatarKey: string;
  tier: PlanTier;
  isFounder: boolean;
  isStaff: boolean;
  unreadCount: number;
  activeProfileId: string;
  profiles: { id: string; name: string; avatarKey: string; isKids: boolean }[];
};

export type NavLink = { href: string; label: string; match?: string };
