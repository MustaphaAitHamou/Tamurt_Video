import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ProfileManager } from "@/components/account/profile-manager";
import { requireViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Profils", robots: { index: false } };

export default async function ProfilesPage() {
  const viewer = await requireViewer("/profils");
  const t = await getTranslations("account");
  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-4xl flex-col items-center justify-center px-4 pt-28 pb-16">
      <h1 className="mb-12 text-4xl font-bold">{t("profilesTitle")}</h1>
      <ProfileManager
        profiles={viewer.viewerProfiles}
        activeId={viewer.activeProfile.id}
        maxProfiles={viewer.entitlements.maxProfiles}
      />
    </div>
  );
}
