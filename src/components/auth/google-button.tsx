import { getTranslations } from "next-intl/server";

import { googleSignInAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/lib/public-env";

/** Connexion Google facultative (activée via NEXT_PUBLIC_AUTH_GOOGLE_ENABLED). */
export async function GoogleButton({ next }: { next: string }) {
  if (!publicEnv.googleAuthEnabled) return null;
  const t = await getTranslations("auth");
  const tc = await getTranslations("common");
  return (
    <>
      <form action={googleSignInAction}>
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="outline" size="lg" className="w-full">
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1S8.7 5.8 12 5.8c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"
            />
          </svg>
          {t("continueWithGoogle")}
        </Button>
      </form>
      <p className="my-5 flex items-center gap-3 text-xs text-muted-foreground uppercase before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        {tc("or")}
      </p>
    </>
  );
}
