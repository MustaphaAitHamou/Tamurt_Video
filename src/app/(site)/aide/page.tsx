import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Questions fréquentes", description: "Aide et questions fréquentes sur Tamurt Vidéo." };

const EXTRA = [
  {
    q: "Pourquoi une œuvre n'est-elle pas disponible dans mon pays ?",
    a: "Les droits de diffusion sont accordés pays par pays. Une œuvre n'apparaît que dans les territoires couverts par sa licence ; la lecture est vérifiée à chaque démarrage.",
  },
  {
    q: "Combien d'écrans puis-je utiliser en même temps ?",
    a: "Le nombre d'écrans simultanés dépend de votre formule. Une nouvelle lecture sur le même appareil remplace la précédente.",
  },
  {
    q: "Puis-je télécharger les vidéos ?",
    a: "Non, la lecture se fait uniquement en streaming. Le téléchargement hors ligne pourra être proposé plus tard si les contrats de diffusion l'autorisent.",
  },
  {
    q: "Comment fonctionnent les demandes de films ?",
    a: "Les membres Premium proposent des œuvres et votent. Une demande aide l'équipe à prioriser ses recherches d'ayants droit, mais ne garantit ni l'acquisition ni la disponibilité.",
  },
  {
    q: "Comment supprimer mon compte ?",
    a: "Depuis Mon compte › Confidentialité. La suppression résilie l'abonnement et efface vos données personnelles, à l'exception des pièces comptables que la loi impose de conserver.",
  },
];

export default async function HelpPage() {
  const t = await getTranslations("founderLanding");
  const faq = [1, 2, 3, 4].map((n) => ({ q: t(`faq${n}Q`), a: t(`faq${n}A`) })).concat(EXTRA);
  return (
    <div className="mx-auto max-w-3xl px-4 pt-28 pb-16">
      <h1 className="mb-8 text-3xl font-bold">Questions fréquentes</h1>
      <div className="space-y-3">
        {faq.map(({ q, a }) => (
          <details key={q} className="group rounded-xl border bg-card/60 p-5 open:bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
              {q}
              <span className="text-xl text-muted-foreground transition group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
      <p className="mt-10 text-sm text-muted-foreground">
        Une autre question ?{" "}
        <Link href="/contact" className="text-foreground underline underline-offset-4">
          Contactez-nous
        </Link>
        .
      </p>
    </div>
  );
}
