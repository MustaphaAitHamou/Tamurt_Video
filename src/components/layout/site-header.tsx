import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth/session";
import { getPublicSettings } from "@/server/settings";
import { tamurtServicesUrl } from "@/lib/tamurt-services";
import { HeaderShell } from "@/components/layout/header-shell";
import type { HeaderViewer, NavLink } from "@/components/layout/types";

export async function SiteHeader() {
  const [viewer, settings, t] = await Promise.all([
    getViewer(),
    getPublicSettings(),
    getTranslations("nav"),
  ]);
  const founderPhase = settings.launchPhase === "founder";

  let headerViewer: HeaderViewer | null = null;
  if (viewer) {
    const supabase = await createSupabaseServerClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", viewer.user.id)
      .is("read_at", null);
    headerViewer = {
      displayName: viewer.profile.displayName ?? viewer.user.email,
      email: viewer.user.email,
      avatarKey: viewer.activeProfile.avatarKey,
      tier: viewer.entitlements.tier,
      isFounder: viewer.entitlements.planTier === "founder",
      isStaff: viewer.staff.roles.length > 0,
      unreadCount: count ?? 0,
      activeProfileId: viewer.activeProfile.id,
      profiles: viewer.viewerProfiles.map((p) => ({
        id: p.id,
        name: p.name,
        avatarKey: p.avatarKey,
        isKids: p.isKids,
      })),
    };
  }

  const links: NavLink[] = [
    { href: "/", label: t("home") },
    { href: "/catalogue?type=film", label: t("films") },
    { href: "/catalogue?type=series", label: t("series") },
    { href: "/catalogue?type=documentary", label: t("documentaries") },
    { href: "/prochainement", label: t("comingSoon") },
    ...(viewer ? [{ href: "/compte/ma-liste", label: t("myList") }] : []),
    ...(founderPhase
      ? [{ href: "/fondateurs", label: t("founders") }]
      : [{ href: "/offres", label: t("pricing") }]),
  ];

  return (
    <Suspense>
      <HeaderShell
        viewer={headerViewer}
        links={links}
        founderPhase={founderPhase}
        tamurtServicesUrl={tamurtServicesUrl()}
      />
    </Suspense>
  );
}
