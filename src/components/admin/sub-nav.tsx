import Link from "next/link";

import { cn } from "@/lib/utils";

/** Onglets de navigation secondaire d'une section d'administration. */
export function AdminSubNav({ links, active, label }: { links: { href: string; label: string }[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="mb-6 flex gap-1 overflow-x-auto border-b scrollbar-none">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={active === link.href ? "page" : undefined}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2 text-sm transition",
            active === link.href ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
