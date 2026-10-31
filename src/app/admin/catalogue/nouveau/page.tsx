import { createTitleAction } from "@/actions/admin/catalog";
import { TitleForm } from "@/components/admin/title-form";
import { AdminPageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/server/auth/session";
import { genreLabel, getGenres } from "@/server/catalog/queries";

export const metadata = { title: "Nouvelle œuvre" };

export default async function NewTitlePage() {
  await requireStaff("catalog.write", "/admin/catalogue/nouveau");
  const genres = await getGenres();
  return (
    <>
      <AdminPageHeader
        title="Nouvelle œuvre"
        description="L'œuvre est créée en brouillon. Enregistrez ensuite ses droits de diffusion, ses médias et ses visuels avant publication."
      />
      <div className="rounded-xl border bg-card/60 p-6">
        <TitleForm
          action={createTitleAction}
          genres={genres.map((g) => ({ id: g.id, label: genreLabel(g.labels, "fr") }))}
          redirectOnCreate
        />
      </div>
    </>
  );
}
