"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClockIcon, Loader2Icon, SendIcon } from "lucide-react";
import { toast } from "sonner";

import { setTitleStatusAction } from "@/actions/admin/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Publication immédiate ou programmée. La base refuse toute publication sans licence valide. */
export function PublishControls({ titleId, canPublish }: { titleId: string; canPublish: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState("");
  const run = (publishAt?: string) =>
    startTransition(async () => {
      const result = await setTitleStatusAction(titleId, "published", publishAt);
      if (result.ok) toast.success(publishAt ? "Publication programmée." : "Œuvre publiée.");
      else toast.error(result.error);
      router.refresh();
    });
  if (!canPublish) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={pending} onClick={() => run()}>
        {pending ? <Loader2Icon className="animate-spin" /> : <SendIcon />} Publier maintenant
      </Button>
      <div className="flex items-center gap-2">
        <label htmlFor="publish-at" className="sr-only">
          Date de publication
        </label>
        <Input id="publish-at" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-52" />
        <Button size="sm" variant="outline" disabled={pending || !date} onClick={() => run(new Date(date).toISOString())}>
          <CalendarClockIcon /> Programmer
        </Button>
      </div>
    </div>
  );
}
