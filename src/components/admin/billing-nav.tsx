import { AdminSubNav } from "@/components/admin/sub-nav";

const LINKS = [
  { href: "/admin/abonnements", label: "Abonnements" },
  { href: "/admin/abonnements/formules", label: "Formules et prix" },
  { href: "/admin/abonnements/evenements", label: "Événements de paiement" },
];

export function BillingNav({ active }: { active: string }) {
  return <AdminSubNav links={LINKS} active={active} label="Abonnements" />;
}
