import Link from "next/link";
import { ShieldOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <ShieldOffIcon className="size-10 text-destructive-text" />
      <h1 className="text-2xl font-bold">Accès refusé</h1>
      <p className="text-sm text-muted-foreground">
        Votre rôle ne donne pas accès à cette section du back-office.
      </p>
      <Button asChild variant="secondary">
        <Link href="/admin">Tableau de bord</Link>
      </Button>
    </div>
  );
}
