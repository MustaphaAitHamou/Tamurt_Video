import { saveLicenseAction } from "@/actions/admin/rights";
import { LicenseForm } from "@/components/admin/rights/license-form";
import { AdminPageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/server/auth/session";
import { getLicenseFormOptions } from "@/server/admin/rights";

export const metadata = { title: "Nouvelle licence" };

export default async function NewLicensePage({ searchParams }: PageProps<"/admin/droits/licences/nouvelle">) {
  await requireStaff("rights.write", "/admin/droits/licences/nouvelle");
  const { titre } = await searchParams;
  const options = await getLicenseFormOptions();
  const titleId = typeof titre === "string" && options.titles.some((t) => t.id === titre) ? titre : undefined;
  return (
    <>
      <AdminPageHeader
        title="Nouvelle licence"
        description="Saisissez les droits tels qu'ils figurent au contrat. En cas de doute sur la chaîne des droits, laissez la licence en brouillon : rien n'est diffusé sans licence signée."
      />
      <div className="rounded-xl border bg-card/60 p-6">
        <LicenseForm action={saveLicenseAction.bind(null, null)} titles={options.titles} holders={options.holders} defaults={{ title_id: titleId }} redirectOnCreate />
      </div>
    </>
  );
}
