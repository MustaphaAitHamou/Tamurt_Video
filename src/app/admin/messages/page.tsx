import { updateContactMessageAction } from "@/actions/admin/operations";
import { AdminPageHeader, StatusBadge } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/action-form";
import { Field } from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";

export const metadata = { title: "Messages" };

const STATUS: Record<string, string> = { new: "Nouveau", in_progress: "En cours", closed: "Clos" };
const CATEGORY: Record<string, string> = {
  general: "Question générale",
  support: "Assistance",
  billing: "Abonnement et paiement",
  rights: "Droits et contenus",
  press: "Presse",
  partnership: "Partenariat",
  privacy: "Données personnelles",
};

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  await requireStaff("messages.read", "/admin/messages");
  const { statut } = await searchParams;
  const status =
    typeof statut === "string" && statut in STATUS ? statut : statut === "tous" ? "tous" : "";
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status === "") query = query.neq("status", "closed");
  else if (status !== "tous") query = query.eq("status", status);
  const [{ data: messages }, { data: outbox }] = await Promise.all([
    query,
    supabase
      .from("email_outbox")
      .select("id, to_email, subject, template, provider, status, error, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Messages"
        description="Formulaire de contact et journal des emails transactionnels envoyés par la plateforme."
      />
      <form className="mb-4 flex gap-3">
        <NativeSelect name="statut" defaultValue={status} className="w-48">
          <option value="">À traiter</option>
          {Object.entries(STATUS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          <option value="tous">Tous</option>
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>
      <ul className="mb-10 space-y-2">
        {(messages ?? []).length === 0 && (
          <li className="text-sm text-muted-foreground">Aucun message.</li>
        )}
        {(messages ?? []).map((message) => (
          <li key={message.id}>
            <details className="rounded-xl border bg-card/60">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{message.subject}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {message.name} &lt;{message.email}&gt; ·{" "}
                    {CATEGORY[message.category] ?? message.category} ·{" "}
                    {formatDateTime(message.created_at)}
                  </span>
                </span>
                <StatusBadge status={message.status} label={STATUS[message.status]} />
              </summary>
              <div className="space-y-4 border-t p-4">
                <p className="rounded-lg border bg-background/40 p-3 text-sm whitespace-pre-wrap">
                  {message.message}
                </p>
                <ActionForm
                  action={updateContactMessageAction.bind(null, message.id)}
                  submitLabel="Enregistrer"
                  submitVariant="secondary"
                >
                  <Field label="Statut" name={`st-${message.id.slice(0, 8)}`}>
                    <NativeSelect
                      id={`st-${message.id.slice(0, 8)}`}
                      name="status"
                      defaultValue={message.status === "new" ? "in_progress" : message.status}
                      className="w-48"
                    >
                      {Object.entries(STATUS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field
                    label="Réponse par email (facultatif)"
                    name={`re-${message.id.slice(0, 8)}`}
                  >
                    <Textarea
                      id={`re-${message.id.slice(0, 8)}`}
                      name="reply"
                      maxLength={5000}
                      className="min-h-28"
                    />
                  </Field>
                </ActionForm>
              </div>
            </details>
          </li>
        ))}
      </ul>
      <section>
        <h2 className="mb-1 text-lg font-semibold">Emails envoyés (50 derniers)</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          « logged » : fournisseur console de développement, aucun email réel n&apos;est parti.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Destinataire</TableHead>
              <TableHead>Objet</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(outbox ?? []).map((email) => (
              <TableRow key={email.id}>
                <TableCell className="text-sm">{formatDateTime(email.created_at)}</TableCell>
                <TableCell className="text-sm">{email.to_email}</TableCell>
                <TableCell className="max-w-96 truncate text-sm">{email.subject}</TableCell>
                <TableCell className="text-sm">{email.provider}</TableCell>
                <TableCell>
                  <StatusBadge
                    status={
                      email.status === "sent"
                        ? "processed"
                        : email.status === "failed"
                          ? "failed"
                          : "ignored"
                    }
                    label={email.status}
                  />
                  {email.error && <p className="text-xs text-destructive-text">{email.error}</p>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </>
  );
}
