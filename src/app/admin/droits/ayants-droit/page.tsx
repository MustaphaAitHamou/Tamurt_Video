import { saveRightsHolderAction } from "@/actions/admin/rights";
import { RightsNav } from "@/components/admin/rights/rights-nav";
import { AdminPageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/action-form";
import { Field, TextField } from "@/components/forms/form-fields";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";

export const metadata = { title: "Ayants droit" };

const KINDS: Record<string, string> = {
  producer: "Producteur",
  distributor: "Distributeur",
  broadcaster: "Diffuseur",
  author: "Auteur·rice",
  estate: "Ayants droit d'un auteur",
  institution: "Institution / archives",
  other: "Autre",
};

type Holder = {
  id: string;
  name: string;
  legal_name: string | null;
  kind: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  country_code: string | null;
  address: string | null;
  notes: string | null;
};

function HolderFields({ holder }: { holder?: Holder }) {
  const p = holder ? `h-${holder.id.slice(0, 8)}-` : "h-new-";
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Nom d'usage" name="name" id={`${p}name`} required maxLength={200} defaultValue={holder?.name} />
        <TextField label="Raison sociale" name="legal_name" id={`${p}legal`} maxLength={200} defaultValue={holder?.legal_name ?? ""} />
        <Field label="Catégorie" name={`${p}kind`}>
          <NativeSelect id={`${p}kind`} name="kind" defaultValue={holder?.kind ?? "producer"}>
            {Object.entries(KINDS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <TextField label="Pays (code ISO)" name="country_code" id={`${p}country`} maxLength={2} defaultValue={holder?.country_code ?? ""} />
        <TextField label="Contact" name="contact_name" id={`${p}contact`} maxLength={160} defaultValue={holder?.contact_name ?? ""} />
        <TextField label="E-mail" name="contact_email" id={`${p}email`} type="email" defaultValue={holder?.contact_email ?? ""} />
        <TextField label="Téléphone" name="contact_phone" id={`${p}phone`} maxLength={40} defaultValue={holder?.contact_phone ?? ""} />
        <TextField label="Adresse" name="address" id={`${p}address`} maxLength={500} defaultValue={holder?.address ?? ""} />
      </div>
      <Field label="Notes internes" name={`${p}notes`}>
        <Textarea id={`${p}notes`} name="notes" maxLength={4000} defaultValue={holder?.notes ?? ""} />
      </Field>
    </>
  );
}

export default async function RightsHoldersPage() {
  const viewer = await requireStaff("rights.read", "/admin/droits/ayants-droit");
  const canWrite = viewer.staff.permissions.includes("rights.write");
  const supabase = await createSupabaseServerClient();
  const { data: holders } = await supabase
    .from("rights_holders")
    .select("id, name, legal_name, kind, contact_name, contact_email, contact_phone, country_code, address, notes, licenses(id, status)")
    .order("name");

  return (
    <>
      <AdminPageHeader title="Ayants droit" description="Producteurs, distributeurs, auteurs et institutions avec lesquels Tamurt Vidéo contracte. Ces données sont réservées à l'équipe des droits." />
      <RightsNav active="/admin/droits/ayants-droit" />
      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <ul className="space-y-2">
          {(holders ?? []).length === 0 && <li className="text-sm text-muted-foreground">Aucun ayant droit enregistré.</li>}
          {(holders ?? []).map((holder) => (
            <li key={holder.id}>
              <details className="rounded-xl border bg-card/60">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <span>
                    <span className="font-medium">{holder.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      · {KINDS[holder.kind] ?? holder.kind}
                      {holder.country_code ? ` · ${holder.country_code}` : ""}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {holder.licenses.length} licence{holder.licenses.length > 1 ? "s" : ""} · {holder.licenses.filter((l) => l.status === "signed").length} signée(s)
                  </span>
                </summary>
                <div className="border-t p-5">
                  {canWrite ? (
                    <ActionForm action={saveRightsHolderAction.bind(null, holder.id)} submitLabel="Enregistrer">
                      <HolderFields holder={holder} />
                    </ActionForm>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {holder.contact_name} {holder.contact_email}
                    </p>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
        {canWrite && (
          <section className="h-fit rounded-xl border bg-card/60 p-5">
            <h2 className="mb-4 font-semibold">Nouvel ayant droit</h2>
            <ActionForm action={saveRightsHolderAction.bind(null, null)} submitLabel="Ajouter" resetOnSuccess>
              <HolderFields />
            </ActionForm>
          </section>
        )}
      </div>
    </>
  );
}
