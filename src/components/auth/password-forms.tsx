"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { forgotPasswordAction, updatePasswordAction } from "@/actions/auth";
import { FormMessage, SubmitButton, TextField } from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [state, action] = useActionState(forgotPasswordAction, null);
  return (
    <form action={action} className="space-y-5">
      <TextField label={t("email")} name="email" type="email" autoComplete="email" required />
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg">
        {t("sendResetLink")}
      </SubmitButton>
    </form>
  );
}

export function UpdatePasswordForm() {
  const t = useTranslations("auth");
  const tn = useTranslations("nav");
  const [state, action] = useActionState(updatePasswordAction, null);
  if (state?.ok) {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <Button asChild className="w-full">
          <Link href="/">{tn("home")}</Link>
        </Button>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5">
      <TextField
        label={t("password")}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={10}
        hint={t("passwordHint")}
      />
      <TextField label={t("confirmPassword")} name="confirmPassword" type="password" autoComplete="new-password" required />
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg">
        {t("updatePassword")}
      </SubmitButton>
    </form>
  );
}
