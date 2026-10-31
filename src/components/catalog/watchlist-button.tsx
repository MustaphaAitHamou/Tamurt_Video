"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { toggleWatchlistAction } from "@/actions/watchlist";
import { Button } from "@/components/ui/button";

export function WatchlistButton({
  titleId,
  initialInList,
  signedIn,
  nextPath,
}: {
  titleId: string;
  initialInList: boolean;
  signedIn: boolean;
  nextPath: string;
}) {
  const t = useTranslations("title");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [inList, setOptimistic] = useOptimistic(initialInList);

  return (
    <Button
      size="lg"
      variant="glass"
      aria-pressed={inList}
      disabled={pending}
      onClick={() => {
        if (!signedIn) {
          router.push(`/connexion?next=${encodeURIComponent(nextPath)}`);
          return;
        }
        startTransition(async () => {
          setOptimistic(!inList);
          const result = await toggleWatchlistAction(titleId);
          if (result.ok) toast.success(result.message);
          else toast.error(result.error);
          router.refresh();
        });
      }}
    >
      {inList ? <CheckIcon /> : <PlusIcon />}
      {inList ? t("removeFromList") : t("addToList")}
    </Button>
  );
}
