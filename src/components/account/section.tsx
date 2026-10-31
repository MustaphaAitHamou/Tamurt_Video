import { cn } from "@/lib/utils";

export function AccountSection({
  title,
  description,
  children,
  className,
  tone,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  tone?: "danger";
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-card/60 p-6",
        tone === "danger" && "border-destructive/40",
        className,
      )}
    >
      <div className="mb-5 space-y-1">
        <h2 className={cn("text-lg font-semibold", tone === "danger" && "text-destructive")}>
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
