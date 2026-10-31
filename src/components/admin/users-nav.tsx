import { AdminSubNav } from "@/components/admin/sub-nav";

const LINKS = [
  { href: "/admin/utilisateurs", label: "Comptes" },
  { href: "/admin/utilisateurs/donnees", label: "Demandes RGPD" },
];

export function UsersNav({ active }: { active: string }) {
  return <AdminSubNav links={LINKS} active={active} label="Utilisateurs" />;
}
