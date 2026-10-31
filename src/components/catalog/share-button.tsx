"use client";

import { useTranslations } from "next-intl";
import { Share2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ShareButton({ title, path }: { title: string; path: string }) {
  const t = useTranslations("title");
  return (
    <Button
      size="icon-lg"
      variant="glass"
      aria-label={t("share")}
      onClick={async () => {
        const url = `${window.location.origin}${path}`;
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
            return;
          } catch {
            // Partage annulé : on retombe sur la copie du lien.
          }
        }
        await navigator.clipboard.writeText(url);
        toast.success(t("linkCopied"));
      }}
    >
      <Share2Icon />
    </Button>
  );
}
