import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/** Mise en page commune des pages d'erreur et d'information. */
export function StatusPage({
  code,
  title,
  description,
  actions,
  className,
}: {
  code?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16 text-center", className)}>
      <div className="bg-tamurt-pattern absolute inset-0 -z-10" aria-hidden />
      <div
        className="absolute top-1/3 start-1/2 -z-10 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(227,38,58,0.22),transparent)] rtl:translate-x-1/2"
        aria-hidden
      />
      <Link href="/" className="mb-12" aria-label="Tamurt Vidéo — accueil">
        <Logo className="h-8" />
      </Link>
      {code && (
        <p className="mb-4 font-display text-8xl font-black tracking-tight text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.25)] sm:text-9xl" aria-hidden>
          {code}
        </p>
      )}
      <h1 className="mb-3 text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="mb-8 max-w-md text-muted-foreground">{description}</p>
      {actions && <div className="flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}
