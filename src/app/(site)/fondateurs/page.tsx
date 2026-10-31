import type { Metadata } from "next";

import { FounderLanding } from "@/components/founder/founder-landing";

export const metadata: Metadata = {
  title: "Devenir membre fondateur",
  description: "Soutenez la construction de Tamurt Vidéo pour 2 € par mois et conservez ce tarif au lancement du catalogue Standard.",
  alternates: { canonical: "/fondateurs" },
};

export default function FoundersPage() {
  return <FounderLanding />;
}
