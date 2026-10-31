"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  clearWatchHistoryAction,
  deleteAccountAction,
  markNotificationsReadAction,
} from "@/actions/account";
import { removeMfaFactorAction } from "@/actions/mfa";
import { FormMessage, SubmitButton, TextField } from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";

export function DeleteAccountForm({ requirePassword }: { requirePassword: boolean }) {
  const t = useTranslations("account");
  const [state, action] = useActionState(deleteAccountAction, null);
  return (
    <form action={action} className="space-y-4">
      {requirePassword && (
        <TextField
          label={t("currentPassword")}
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      )}
      <TextField
        label={t("deleteConfirmLabel")}
        name="confirmation"
        autoComplete="off"
        required
        placeholder={t("deleteConfirmWord")}
      />
      <FormMessage state={state} />
      <SubmitButton variant="destructive">{t("deleteAccount")}</SubmitButton>
    </form>
  );
}

export function ClearHistoryButton() {
  const t = useTranslations("account");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await clearWatchHistoryAction();
          router.refresh();
        })
      }
    >
      {t("clearHistory")}
    </Button>
  );
}

export function MarkAllReadButton() {
  const t = useTranslations("account");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markNotificationsReadAction();
          router.refresh();
        })
      }
    >
      {t("markAllRead")}
    </Button>
  );
}

export function RemoveMfaButton({ factorId }: { factorId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await removeMfaFactorAction(factorId);
          if (result.ok) toast.success(result.message);
          else toast.error(result.error);
          router.refresh();
        })
      }
    >
      Désactiver
    </Button>
  );
}
