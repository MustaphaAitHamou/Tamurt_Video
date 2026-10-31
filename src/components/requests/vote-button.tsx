"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ThumbsUpIcon } from "lucide-react";
import { toast } from "sonner";

import { toggleVoteAction } from "@/actions/requests";
import { Button } from "@/components/ui/button";

export function VoteButton({
  requestId,
  voted,
  votes,
  canVote,
}: {
  requestId: string;
  voted: boolean;
  votes: number;
  canVote: boolean;
}) {
  const t = useTranslations("requests");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useOptimistic({ voted, votes });
  return (
    <Button
      variant={state.voted ? "default" : "outline"}
      size="sm"
      aria-pressed={state.voted}
      disabled={!canVote || pending}
      title={canVote ? undefined : t("premiumOnly")}
      onClick={() =>
        startTransition(async () => {
          setState({ voted: !state.voted, votes: state.votes + (state.voted ? -1 : 1) });
          const result = await toggleVoteAction(requestId);
          if (!result.ok) toast.error(result.error);
          router.refresh();
        })
      }
      className="min-w-24"
    >
      <ThumbsUpIcon />
      <span className="tabular-nums">{state.votes}</span>
      <span className="sr-only">{state.voted ? t("unvote") : t("vote")}</span>
    </Button>
  );
}
