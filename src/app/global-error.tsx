"use client";

import "./globals.css";

/** Dernier filet de sécurité (erreur dans le layout racine) : aucune dépendance externe. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
        <h1 className="text-3xl font-bold">Une erreur est survenue</h1>
        <p className="max-w-md text-muted-foreground">
          Tamurt Vidéo n&apos;a pas pu s&apos;afficher. Réessayez dans un instant.
          {error.digest ? ` (réf. ${error.digest})` : ""}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
