"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/server/errors";

/** Bouton déclenchant une action serveur sans confirmation (opérations réversibles). */
export function ActionButton({
  action,
  children,
  variant = "outline",
  size = "sm",
  className,
}: {
  action: () => Promise<ActionResult<unknown>>;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      aria-busy={pending}
      onClick={(event) => {
        // Évite d'ouvrir ou de fermer un <details> parent lorsque le bouton est dans un <summary>.
        event.preventDefault();
        startTransition(async () => {
          const result = await action();
          if (result.ok) toast.success(result.message ?? "Action effectuée.");
          else toast.error(result.error);
          router.refresh();
        });
      }}
    >
      {pending && <Loader2Icon className="animate-spin" />}
      {children}
    </Button>
  );
}
