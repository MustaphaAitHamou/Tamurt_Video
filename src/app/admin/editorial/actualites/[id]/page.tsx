import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteAnnouncementAction, saveAnnouncementAction } from "@/actions/admin/editorial";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AnnouncementForm } from "@/components/admin/editorial/announcement-form";
import { toLocalInput } from "@/components/admin/editorial/labels";
import { AdminPageHeader } from "@/components/admin/ui";
import { Markdown } from "@/components/content/markdown";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";
import { uuidPattern } from "@/server/admin/guard";

export const metadata = { title: "Actualité" };

/** « nouvelle » crée une actualité ; un identifiant ouvre l'édition. */
export default async function AnnouncementEditPage({
  params,
}: PageProps<"/admin/editorial/actualites/[id]">) {
  const { id } = await params;
  await requireStaff("editorial.write", `/admin/editorial/actualites/${id}`);
  if (id === "nouvelle") {
    return (
      <>
        <AdminPageHeader
          title="Nouvelle actualité"
          description="Enregistrée en brouillon tant que le statut « Publiée » n'est pas choisi."
        />
        <div className="rounded-xl border bg-card/60 p-6">
          <AnnouncementForm action={saveAnnouncementAction.bind(null, null)} />
        </div>
      </>
    );
  }
  if (!uuidPattern.test(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: announcement } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!announcement) notFound();
  return (
    <>
      <AdminPageHeader
        title={announcement.title}
        description={`/actualites/${announcement.slug}`}
        actions={
          announcement.status === "published" ? (
            <Link
              href={`/actualites/${announcement.slug}`}
              target="_blank"
              className="text-sm underline"
            >
              Voir la page publique
            </Link>
          ) : null
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card/60 p-6">
          <AnnouncementForm
            action={saveAnnouncementAction.bind(null, id)}
            defaults={announcement}
            publishedAtLocal={toLocalInput(announcement.published_at)}
          />
          <ConfirmAction
            action={deleteAnnouncementAction.bind(null, id)}
            label="Supprimer"
            title="Supprimer cette actualité ?"
            description="Action définitive (journalisée)."
            variant="ghost"
            destructive
          />
        </div>
        <section className="rounded-xl border bg-card/40 p-6">
          <p className="mb-4 text-xs tracking-wide text-muted-foreground uppercase">
            Aperçu (version enregistrée)
          </p>
          <h2 className="mb-2 font-display text-2xl font-bold">{announcement.title}</h2>
          {announcement.excerpt && (
            <p className="mb-4 text-muted-foreground">{announcement.excerpt}</p>
          )}
          <Markdown>{announcement.body}</Markdown>
        </section>
      </div>
    </>
  );
}
