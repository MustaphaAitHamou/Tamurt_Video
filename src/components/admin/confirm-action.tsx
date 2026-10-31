"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/server/errors";

/** Bouton d'action d'administration avec confirmation et retour visuel. */
export function ConfirmAction({
  action,
  label,
  title,
  description,
  confirmLabel = "Confirmer",
  variant = "outline",
  size = "sm",
  destructive = false,
  withReason = false,
  reasonLabel = "Motif (obligatoire)",
  reasonPlaceholder,
}: {
  action: (reason?: string) => Promise<ActionResult<unknown>>;
  label: string;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  destructive?: boolean;
  withReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} disabled={pending}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {withReason && (
          <label className="space-y-2 text-sm">
            <span className="font-medium">{reasonLabel}</span>
            <textarea
              value={reason}
              placeholder={reasonPlaceholder}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-20 w-full rounded-lg border bg-transparent p-3 text-sm"
              maxLength={1000}
            />
          </label>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={withReason && reason.trim().length < 3}
            className={destructive ? "bg-destructive hover:bg-destructive/90" : undefined}
            onClick={() =>
              startTransition(async () => {
                const result = await action(withReason ? reason.trim() : undefined);
                if (result.ok) toast.success(result.message ?? "Action effectuée.");
                else toast.error(result.error);
                router.refresh();
              })
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
