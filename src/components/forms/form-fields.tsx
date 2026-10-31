"use client";

import { useFormStatus } from "react-dom";
import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/errors";

export function SubmitButton({
  children,
  pendingLabel,
  className,
  variant,
  size,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={className}
      variant={variant}
      size={size}
    >
      {pending && <Loader2Icon className="animate-spin" />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

/** Message de résultat d'une action serveur, annoncé aux lecteurs d'écran. */
export function FormMessage({
  state,
  className,
}: {
  state: ActionResult<unknown> | null | undefined;
  className?: string;
}) {
  if (!state) return null;
  const message = state.ok ? state.message : state.error;
  if (!message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      aria-live="polite"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
        state.ok
          ? "border-success/30 bg-success/10 text-success"
          : "border-destructive/30 bg-destructive/10 text-destructive-text",
        className,
      )}
    >
      {state.ok ? (
        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
      ) : (
        <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{message}</span>
    </p>
  );
}

export function Field({
  label,
  name,
  hint,
  error,
  className,
  children,
  required,
}: {
  label: string;
  name: string;
  hint?: string;
  error?: string[] | undefined;
  className?: string;
  children?: React.ReactNode;
  required?: boolean;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error?.length ? `${name}-error` : undefined;
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name}>
        {label}
        {required && (
          <span aria-hidden className="text-primary-text">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {errorId && (
        <p id={errorId} className="text-xs text-destructive-text">
          {error?.join(" ")}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  name,
  hint,
  error,
  className,
  ...props
}: React.ComponentProps<typeof Input> & {
  label: string;
  name: string;
  hint?: string;
  error?: string[];
}) {
  return (
    <Field
      label={label}
      name={name}
      hint={hint}
      error={error}
      className={className}
      required={props.required}
    >
      <Input
        id={name}
        name={name}
        aria-invalid={error?.length ? true : undefined}
        aria-describedby={
          [hint ? `${name}-hint` : null, error?.length ? `${name}-error` : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        {...props}
      />
    </Field>
  );
}
