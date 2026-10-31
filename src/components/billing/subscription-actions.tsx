"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { changePlanAction, setCancelAtPeriodEndAction } from "@/actions/billing";
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

export function CancelSubscriptionButton({ cancelScheduled, endDate }: { cancelScheduled: boolean; endDate: string | null }) {
  const t = useTranslations("billing");
  const ta = useTranslations("account");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (cancel: boolean) =>
    startTransition(async () => {
      const result = await setCancelAtPeriodEndAction(cancel);
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
      router.refresh();
    });

  if (cancelScheduled) {
    return (
      <Button onClick={() => run(false)} disabled={pending}>
        {ta("reactivate")}
      </Button>
    );
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={pending}>
          {ta("cancel")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("cancelTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{endDate ? t("cancelText", { date: endDate }) : t("cancelTextNoDate")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
          <AlertDialogAction onClick={() => run(true)} className="bg-destructive hover:bg-destructive/90">
            {t("confirmCancel")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ChangePlanButton({
  planCode,
  planName,
  priceLabel,
  losesFounderRate,
}: {
  planCode: string;
  planName: string;
  priceLabel: string;
  losesFounderRate: boolean;
}) {
  const t = useTranslations("billing");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" disabled={pending}>
          {t("switchTo", { plan: planName })}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("switchTitle", { plan: planName })}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>{t("switchText", { price: priceLabel })}</p>
              {losesFounderRate && <p className="font-medium text-warning">{t("founderLoss")}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                const result = await changePlanAction(planCode);
                if (result.ok) toast.success(result.message);
                else toast.error(result.error);
                setOpen(false);
                router.refresh();
              })
            }
          >
            {tc("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
