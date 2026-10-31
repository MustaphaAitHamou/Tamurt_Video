import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { FilmIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** État vide soigné : jamais d'interface « cassée » quand il n'y a rien à montrer. */
export function EmptyState({
  title,
  description,
  icon: Icon = FilmIcon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-tamurt-pattern relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed px-6 py-16 text-center",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary-text ring-1 ring-primary/20">
        <Icon className="size-6" />
      </span>
      <div className="max-w-md space-y-1.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <Button asChild variant="secondary">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
