import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, ShieldCheckIcon, ShieldAlertIcon } from "lucide-react";

import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/permissions";
import { requireStaff } from "@/server/auth/session";

export const metadata: Metadata = { title: { default: "Administration", template: "%s · Administration Tamurt" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireStaff("admin.access", "/admin");
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b bg-card/40 p-4 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-e lg:border-b-0">
        <div className="mb-4 flex items-center justify-between gap-3 lg:mb-6 lg:block">
          <Link href="/admin" aria-label="Administration Tamurt Vidéo">
            <Logo className="h-6" />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground lg:mt-4">
            <ArrowLeftIcon className="size-3.5" /> Retour au site
          </Link>
        </div>
        <AdminNav permissions={viewer.staff.permissions} />
        <div className="mt-6 hidden space-y-2 border-t pt-4 text-xs text-muted-foreground lg:block">
          <p className="truncate">{viewer.user.email}</p>
          <div className="flex flex-wrap gap-1">
            {viewer.staff.roles.map((role) => (
              <Badge key={role} variant="outline">
                {ROLE_LABELS[role]}
              </Badge>
            ))}
          </div>
          <p className="flex items-center gap-1.5">
            {viewer.user.aal === "aal2" ? (
              <>
                <ShieldCheckIcon className="size-3.5 text-success" /> Double authentification vérifiée
              </>
            ) : (
              <>
                <ShieldAlertIcon className="size-3.5 text-warning" /> Double authentification non exigée par les paramètres
              </>
            )}
          </p>
        </div>
      </aside>
      <main id="contenu" className="min-w-0 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
