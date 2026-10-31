"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CookieIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  CONSENT_COOKIE,
  CONSENT_EVENT,
  CONSENT_POLICY_VERSION,
  OPEN_CONSENT_EVENT,
  parseConsent,
  readConsentFromDocument,
  type ConsentChoices,
} from "@/components/legal/consent";

const SIX_MONTHS = 60 * 60 * 24 * 182;

function persist(choices: Omit<ConsentChoices, "necessary">) {
  const value = encodeURIComponent(JSON.stringify({ ...choices, version: CONSENT_POLICY_VERSION }));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${SIX_MONTHS}; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(CONSENT_EVENT));
  // Preuve du consentement (journal minimal, sans adresse IP en clair).
  void fetch("/api/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...choices, version: CONSENT_POLICY_VERSION }),
    keepalive: true,
  }).catch(() => undefined);
}

function subscribe(callback: () => void) {
  window.addEventListener(CONSENT_EVENT, callback);
  return () => window.removeEventListener(CONSENT_EVENT, callback);
}

function getRawConsent() {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  return match?.slice(CONSENT_COOKIE.length + 1) ?? "";
}

// Côté serveur, le consentement est inconnu : rien n'est affiché avant l'hydratation.
const getServerSnapshot = () => null;

/** Bandeau de consentement : refuser est aussi simple qu'accepter. */
export function CookieConsent() {
  const t = useTranslations("cookies");
  const rawConsent = useSyncExternalStore(subscribe, getRawConsent, getServerSnapshot);
  const needsChoice = rawConsent !== null && parseConsent(rawConsent) === null;
  const [reopened, setReopened] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);

  useEffect(() => {
    const reopen = () => {
      const current = readConsentFromDocument();
      setAnalytics(current?.analytics ?? false);
      setAds(current?.ads ?? false);
      setCustomizing(true);
      setReopened(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  const open = needsChoice || reopened;
  if (!open) return null;

  const save = (choices: { analytics: boolean; ads: boolean }) => {
    persist(choices);
    setReopened(false);
    setCustomizing(false);
  };

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl animate-fade-up rounded-2xl border bg-popover/95 p-5 shadow-2xl backdrop-blur-xl sm:inset-x-6 sm:bottom-6"
    >
      <div className="flex items-start gap-3">
        <CookieIcon className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
        <div className="space-y-2">
          <h2 id="cookie-consent-title" className="font-display text-base font-semibold">
            {t("title")}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("text")}{" "}
            <Link href="/legal/cookies" className="text-foreground underline underline-offset-4">
              {t("learnMore")}
            </Link>
          </p>
        </div>
      </div>
      {customizing && (
        <div className="mt-4 space-y-3 rounded-xl border bg-black/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{t("necessary")}</p>
              <p className="text-xs text-muted-foreground">{t("necessaryText")}</p>
            </div>
            <Switch checked disabled aria-label={t("necessary")} />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{t("analytics")}</p>
              <p className="text-xs text-muted-foreground">{t("analyticsText")}</p>
            </div>
            <Switch
              checked={analytics}
              onCheckedChange={setAnalytics}
              aria-label={t("analytics")}
            />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{t("ads")}</p>
              <p className="text-xs text-muted-foreground">{t("adsText")}</p>
            </div>
            <Switch checked={ads} onCheckedChange={setAds} aria-label={t("ads")} />
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {customizing ? (
          <Button variant="secondary" onClick={() => save({ analytics, ads })}>
            {t("save")}
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setCustomizing(true)}>
            {t("customize")}
          </Button>
        )}
        <Button variant="outline" onClick={() => save({ analytics: false, ads: false })}>
          {t("rejectAll")}
        </Button>
        <Button onClick={() => save({ analytics: true, ads: true })}>{t("acceptAll")}</Button>
      </div>
    </section>
  );
}
