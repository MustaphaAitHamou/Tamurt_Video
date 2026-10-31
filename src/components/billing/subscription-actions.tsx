"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
        Réactiver l&apos;abonnement
      </Button>
    );
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={pending}>
          Résilier
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Résilier votre abonnement ?</AlertDialogTitle>
          <AlertDialogDescription>
            Aucun nouveau prélèvement ne sera effectué. Vous gardez l&apos;accès jusqu&apos;au {endDate ?? "terme de la période en cours"}.
            Vous pourrez réactiver l&apos;abonnement avant cette date.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Conserver</AlertDialogCancel>
          <AlertDialogAction onClick={() => run(true)} className="bg-destructive hover:bg-destructive/90">
            Confirmer la résiliation
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" disabled={pending}>
          Passer à {planName}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Passer à la formule {planName} ?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Nouveau tarif : {priceLabel} par mois, facturé en euros. La différence pour la période en cours est calculée au prorata.
              </p>
              {losesFounderRate && (
                <p className="font-medium text-warning">
                  Attention : ce changement met fin définitivement à votre tarif fondateur. Il ne pourra pas être rétabli.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
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
            Confirmer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
