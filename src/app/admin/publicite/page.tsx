import Image from "next/image";

import { setAdsEnabledAction, updateAdSlotAction } from "@/actions/admin/operations";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminPageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/action-form";
import { Field, TextField } from "@/components/forms/form-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { resolveImageUrl } from "@/lib/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth/session";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Publicité" };

export default async function AdsPage() {
  await requireStaff("ads.manage", "/admin/publicite");
  const settings = await getSettings();
  const supabase = await createSupabaseServerClient();
  const { data: slots } = await supabase.from("ad_slots").select("*").order("placement");

  return (
    <>
      <AdminPageHeader title="Publicité" description="Encarts facultatifs, réservés aux visiteurs et aux comptes gratuits. Ils n'interrompent jamais une lecture et ne sont jamais montrés aux abonnés payants." />
      <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card/60 p-5">
        <div>
          <h2 className="font-semibold">
            Interrupteur général {settings.adsEnabled ? <Badge variant="success">Activé</Badge> : <Badge variant="muted">Désactivé</Badge>}
          </h2>
          <p className="text-sm text-muted-foreground">Désactivé, aucun encart n&apos;est affiché, quels que soient les réglages des emplacements.</p>
        </div>
        <ConfirmAction
          action={setAdsEnabledAction.bind(null, !settings.adsEnabled)}
          label={settings.adsEnabled ? "Désactiver la publicité" : "Activer la publicité"}
          title={settings.adsEnabled ? "Désactiver toute publicité ?" : "Activer la publicité ?"}
          description={
            settings.adsEnabled
              ? "Tous les encarts disparaissent immédiatement."
              : "Seuls les emplacements actifs et complets s'affichent, aux visiteurs ou comptes gratuits, après consentement du visiteur aux cookies publicitaires."
          }
          variant={settings.adsEnabled ? "outline" : "default"}
        />
      </section>
      <Alert className="mb-6">
        <AlertTitle>Annonces internes uniquement</AlertTitle>
        <AlertDescription>
          Seules des annonces « maison » (image et lien gérés ici) sont proposées. Aucune régie externe n&apos;est chargée : son intégration exigerait une configuration explicite, une mise à jour de la politique de confidentialité et du bandeau de consentement.
        </AlertDescription>
      </Alert>
      <div className="grid gap-4 lg:grid-cols-2">
        {(slots ?? []).map((slot) => {
          const config = (slot.config ?? {}) as { image_path?: string; href?: string; alt?: string; label?: string };
          const image = resolveImageUrl(config.image_path ?? null);
          return (
            <section key={slot.id} className="space-y-4 rounded-xl border bg-card/60 p-5">
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  {slot.name} {slot.is_enabled ? <Badge variant="success">Actif</Badge> : <Badge variant="muted">Inactif</Badge>}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {slot.description} · clé <code>{slot.key}</code>
                </p>
              </div>
              {image && (
                <div className="relative aspect-[6/1] overflow-hidden rounded-lg border">
                  <Image src={image} alt={config.alt ?? ""} fill sizes="600px" className="object-cover" />
                </div>
              )}
              <ActionForm action={updateAdSlotAction.bind(null, slot.id)} submitLabel="Enregistrer" submitVariant="secondary">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Public" name={`aud-${slot.key}`}>
                    <NativeSelect id={`aud-${slot.key}`} name="audience" defaultValue={slot.audience}>
                      <option value="visitors">Visiteurs non connectés</option>
                      <option value="non_paying">Visiteurs et comptes gratuits</option>
                    </NativeSelect>
                  </Field>
                  <TextField label="Lien" name="href" id={`href-${slot.key}`} defaultValue={config.href ?? ""} hint="/offres ou https://…" />
                  <TextField label="Texte alternatif" name="alt" id={`alt-${slot.key}`} maxLength={160} defaultValue={config.alt ?? ""} />
                  <TextField label="Mention" name="label" id={`lbl-${slot.key}`} maxLength={40} defaultValue={config.label ?? "Annonce"} />
                </div>
                <Field label="Image (bannière large, 4 Mo max.)" name={`img-${slot.key}`}>
                  <input id={`img-${slot.key}`} type="file" name="image" accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full text-sm file:me-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-foreground" />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="is_enabled" defaultChecked={slot.is_enabled} className="size-4 accent-primary" /> Emplacement actif
                </label>
              </ActionForm>
            </section>
          );
        })}
      </div>
    </>
  );
}
