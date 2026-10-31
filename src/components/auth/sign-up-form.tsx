"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { MailCheckIcon } from "lucide-react";

import { signUpAction } from "@/actions/auth";
import { FormMessage, SubmitButton, TextField } from "@/components/forms/form-fields";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function SignUpForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action] = useActionState(signUpAction, null);

  if (state?.ok) {
    return (
      <div className="space-y-4 text-center" role="status">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success/15 text-success">
          <MailCheckIcon className="size-7" />
        </span>
        <h2 className="text-xl font-semibold">{t("checkEmailTitle")}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("checkEmailText", { email: state.data.email })}</p>
        <p className="text-xs text-muted-foreground">{t("checkEmailSpam")}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <TextField label={t("displayName")} name="displayName" autoComplete="given-name" required maxLength={60} />
      <TextField label={t("email")} name="email" type="email" autoComplete="email" required inputMode="email" />
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
      <div className="flex items-start gap-3">
        <Checkbox id="acceptTerms" name="acceptTerms" required aria-required="true" className="mt-0.5" />
        <Label htmlFor="acceptTerms" className="block text-sm leading-relaxed font-normal text-muted-foreground">
          {t.rich("acceptTerms", {
            terms: (chunks) => (
              <Link href="/legal/cgu" target="_blank" className="text-foreground underline underline-offset-4">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/legal/confidentialite" target="_blank" className="text-foreground underline underline-offset-4">
                {chunks}
              </Link>
            ),
          })}
        </Label>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="marketingOptIn" name="marketingOptIn" className="mt-0.5" />
        <Label htmlFor="marketingOptIn" className="block text-sm leading-relaxed font-normal text-muted-foreground">
          {t("marketingOptIn")}
        </Label>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg">
        {t("signUp")}
      </SubmitButton>
    </form>
  );
}
