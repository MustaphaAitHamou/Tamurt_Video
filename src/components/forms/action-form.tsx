"use client";

import { useActionState, useEffect, useRef } from "react";

import { FormMessage, SubmitButton } from "@/components/forms/form-fields";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/errors";

/** Formulaire relié à une action serveur, avec message de résultat accessible. */
export function ActionForm({
  action,
  children,
  submitLabel,
  submitVariant,
  className,
  resetOnSuccess = false,
}: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submitLabel: string;
  submitVariant?: React.ComponentProps<typeof SubmitButton>["variant"];
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) formRef.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={formRef} action={formAction} className={cn("space-y-5", className)}>
      {children}
      <FormMessage state={state} />
      <SubmitButton variant={submitVariant}>{submitLabel}</SubmitButton>
    </form>
  );
}
