"use client";

import { OPEN_CONSENT_EVENT } from "@/components/legal/consent";

export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
      className="cursor-pointer text-sm text-muted-foreground transition hover:text-foreground"
    >
      {label}
    </button>
  );
}
