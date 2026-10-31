"use client";

import { useActionState } from "react";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { createHqKeyAction } from "@/actions/admin/operations";
import { FormMessage, SubmitButton, TextField } from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";

/** Création d'une clé Tamurt HQ : la valeur en clair n'est montrée qu'une seule fois. */
export function HqKeyForm() {
  const [state, formAction] = useActionState(createHqKeyAction, null);
  return (
    <div className="space-y-4">
      <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <TextField
          label="Nom de la clé"
          name="name"
          required
          maxLength={80}
          placeholder="Tamurt HQ — production"
        />
        <TextField
          label="Validité (jours)"
          name="days"
          type="number"
          min={1}
          max={730}
          defaultValue={365}
        />
        <SubmitButton>Créer</SubmitButton>
      </form>
      <FormMessage state={state} />
      {state?.ok && (
        <div className="space-y-2 rounded-lg border border-gold/40 bg-gold/10 p-4">
          <p className="text-sm font-medium">
            Clé à transmettre à Tamurt HQ par un canal sûr (affichée une seule fois) :
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 rounded bg-background/60 px-3 py-2 text-xs break-all">
              {state.data.key}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                navigator.clipboard
                  .writeText(state.data.key)
                  .then(() => toast.success("Clé copiée."))
              }
            >
              <CopyIcon /> Copier
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
