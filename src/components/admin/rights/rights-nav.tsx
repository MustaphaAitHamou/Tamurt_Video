import { AdminSubNav } from "@/components/admin/sub-nav";

const LINKS = [
  { href: "/admin/droits", label: "Licences" },
  { href: "/admin/droits/ayants-droit", label: "Ayants droit" },
  { href: "/admin/droits/reclamations", label: "Réclamations" },
];

export function RightsNav({ active }: { active: string }) {
  return <AdminSubNav links={LINKS} active={active} label="Gestion des droits" />;
}
