import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "warning" | "danger" | "success" | "gold";
  href?: string;
}) {
  const content = (
    <div
      className={cn(
        "h-full rounded-xl border bg-card/70 p-4 transition",
        href && "hover:border-white/20",
        tone === "warning" && "border-warning/40",
        tone === "danger" && "border-destructive/40",
        tone === "success" && "border-success/30",
        tone === "gold" && "border-gold/40",
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        {Icon && <Icon className="size-4" />}
      </div>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

const STATUS_TONES: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  published: "success",
  announced: "gold",
  draft: "muted",
  in_review: "outline",
  unpublished: "warning",
  archived: "muted",
  signed: "success",
  pending_signature: "gold",
  suspended: "warning",
  terminated: "destructive",
  active: "success",
  trialing: "success",
  past_due: "warning",
  canceled: "muted",
  unpaid: "destructive",
  processed: "success",
  failed: "destructive",
  ignored: "muted",
  processing: "gold",
  ready: "success",
  processing_media: "gold",
  error: "destructive",
  received: "muted",
  reviewing: "gold",
  content_disabled: "destructive",
  resolved: "success",
  rejected: "muted",
  open: "warning",
  monitoring: "gold",
  new: "gold",
  in_progress: "gold",
  closed: "muted",
  completed: "success",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge variant={STATUS_TONES[status] ?? "outline"}>{label ?? status}</Badge>;
}

export function AdminPagination({ basePath, page, pageSize, total, params }: { basePath: string; page: number; pageSize: number; total: number; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const search = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])));
    search.set("page", String(p));
    return `${basePath}?${search.toString()}`;
  };
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Page {page} / {pages} · {total} élément{total > 1 ? "s" : ""}
      </span>
      <span className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className="rounded-lg border px-3 py-1.5 hover:bg-accent">
            Précédent
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1)} className="rounded-lg border px-3 py-1.5 hover:bg-accent">
            Suivant
          </Link>
        )}
      </span>
    </nav>
  );
}
