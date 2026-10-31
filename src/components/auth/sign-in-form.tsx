"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { signInAction } from "@/actions/auth";
import { FormMessage, SubmitButton, TextField } from "@/components/forms/form-fields";

export function SignInForm({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState(signInAction, null);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <TextField label={t("email")} name="email" type="email" autoComplete="email" required inputMode="email" />
      <TextField label={t("password")} name="password" type="password" autoComplete="current-password" required />
      <div className="flex justify-end">
        <Link href="/mot-de-passe-oublie" className="text-sm text-muted-foreground hover:text-foreground">
          {t("forgotPassword")}
        </Link>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg">
        {t("signIn")}
      </SubmitButton>
    </form>
  );
}
