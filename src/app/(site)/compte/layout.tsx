import { getTranslations } from "next-intl/server";

import { AccountNav } from "@/components/account/account-nav";
import { requireViewer } from "@/server/auth/session";

export default async function AccountLayout({ children }: LayoutProps<"/compte">) {
  await requireViewer("/compte");
  const t = await getTranslations("account");
  return (
    <div className="mx-auto max-w-[1300px] px-4 pt-28 pb-16 sm:px-6 lg:px-10">
      <h1 className="mb-8 text-3xl font-bold sm:text-4xl">{t("title")}</h1>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <AccountNav />
        </aside>
        <div className="min-w-0 space-y-8">{children}</div>
      </div>
    </div>
  );
}
