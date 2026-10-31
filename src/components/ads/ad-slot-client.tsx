"use client";

import { useEffect, useState } from "react";

import { CONSENT_EVENT, readConsentFromDocument } from "@/components/legal/consent";
import { cn } from "@/lib/utils";

/** Affiche l'annonce uniquement après consentement publicitaire. */
export function AdSlotClient({ imageUrl, href, alt, label, className }: { imageUrl: string; href: string; alt: string; label: string; className?: string }) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const update = () => setAllowed(Boolean(readConsentFromDocument()?.ads));
    update();
    window.addEventListener(CONSENT_EVENT, update);
    return () => window.removeEventListener(CONSENT_EVENT, update);
  }, []);
  if (!allowed) return null;
  return (
    <aside aria-label={label} className={cn("overflow-hidden rounded-xl border bg-card/60", className)}>
      <p className="px-3 pt-2 text-[10px] tracking-widest text-muted-foreground uppercase">{label}</p>
      <a href={href} target="_blank" rel="sponsored noopener noreferrer" className="block p-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- visuel publicitaire configuré par l'administration */}
        <img src={imageUrl} alt={alt} className="h-auto w-full rounded-lg" loading="lazy" />
      </a>
    </aside>
  );
}
