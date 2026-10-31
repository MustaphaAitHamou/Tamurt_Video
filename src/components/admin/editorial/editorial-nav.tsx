import { AdminSubNav } from "@/components/admin/sub-nav";

const LINKS = [
  { href: "/admin/editorial", label: "Accueil" },
  { href: "/admin/editorial/collections", label: "Collections" },
  { href: "/admin/editorial/actualites", label: "Actualités" },
  { href: "/admin/editorial/feuille-de-route", label: "Feuille de route" },
];

export function EditorialNav({ active }: { active: string }) {
  return <AdminSubNav links={LINKS} active={active} label="Éditorial" />;
}
