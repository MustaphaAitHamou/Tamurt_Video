import { LogoMark } from "@/components/brand/logo";

/** Écran de chargement : emblème pulsant et barre de progression indéterminée. */
export function PageLoader({ label = "Chargement" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60dvh] flex-col items-center justify-center gap-6"
    >
      <LogoMark className="size-16 animate-pulse drop-shadow-[0_0_24px_rgba(227,38,58,0.45)]" />
      <div className="h-0.5 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/3 animate-loader rounded-full bg-primary" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
