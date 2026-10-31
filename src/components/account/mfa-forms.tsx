"use client";

import { useActionState, useState, useTransition } from "react";
import { ShieldCheckIcon } from "lucide-react";

import { startMfaEnrollmentAction, verifyMfaEnrollmentAction, verifyMfaLoginAction, type MfaEnrollment } from "@/actions/mfa";
import { FormMessage, SubmitButton, TextField } from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";

export function MfaLoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(verifyMfaLoginAction, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <TextField label="Code à 6 chiffres" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required autoFocus />
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg">
        Vérifier
      </SubmitButton>
    </form>
  );
}

/** Inscription TOTP : QR code à scanner puis vérification d'un premier code. */
export function MfaEnrollment({ next }: { next?: string }) {
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [state, action] = useActionState(verifyMfaEnrollmentAction, null);

  if (state?.ok) return <FormMessage state={state} />;

  if (!enrollment) {
    return (
      <div className="space-y-3">
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await startMfaEnrollmentAction();
              if (result.ok) setEnrollment(result.data);
              else setError(result.error);
            })
          }
        >
          <ShieldCheckIcon /> Activer la double authentification
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
      {/* eslint-disable-next-line @next/next/no-img-element -- QR code fourni en data URL SVG par Supabase */}
      <img src={enrollment.qrCode} alt="QR code à scanner avec votre application d'authentification" className="size-[200px] rounded-xl bg-white p-2" />
      <form action={action} className="space-y-4">
        <input type="hidden" name="factorId" value={enrollment.factorId} />
        {next && <input type="hidden" name="next" value={next} />}
        <p className="text-sm text-muted-foreground">
          Scannez le QR code avec une application d&apos;authentification (Aegis, Google Authenticator, 1Password…), ou saisissez la clé :
        </p>
        <code className="block rounded-lg bg-muted px-3 py-2 font-mono text-sm break-all">{enrollment.secret}</code>
        <TextField label="Code affiché par l'application" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required />
        <FormMessage state={state} />
        <SubmitButton>Confirmer</SubmitButton>
      </form>
    </div>
  );
}
