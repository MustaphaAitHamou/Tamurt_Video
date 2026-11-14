import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Identité Tamurt Vidéo (DA Tamurt Services). Fichiers dans public/brand ;
 * l'application est toujours sombre, seules les versions pour fond sombre sont utilisées.
 */

/** Icône seule : le yaz en vol et le triangle de lecture, rouges sur la tuile noire. */
export function LogoMark({
  className,
  title = "Tamurt Vidéo",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <Image
      src="/brand/icone.svg"
      alt={title}
      width={64}
      height={64}
      unoptimized
      className={cn("size-8 shrink-0", className)}
    />
  );
}

/** Logotype : le mot TAMURT rouge et sa ligne ⵜⴰⵎⵓⵔⵜ, puis « Vidéo ». */
export function Logo({
  className,
  title = "Tamurt Vidéo",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <Image
      src="/brand/wordmark-sombre.svg"
      alt={title}
      width={119}
      height={30}
      unoptimized
      priority
      className={cn("h-8 w-auto shrink-0", className)}
    />
  );
}
