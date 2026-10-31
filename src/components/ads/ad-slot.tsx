import { tierAtLeast } from "@/lib/permissions";
import { resolveImageUrl } from "@/lib/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth/session";
import { AdSlotClient } from "@/components/ads/ad-slot-client";

/**
 * Emplacement publicitaire facultatif. N'affiche rien si : l'interrupteur
 * général est désactivé, l'emplacement est inactif, le visiteur est abonné
 * payant (sauf formule incluant la publicité), ou le consentement manque.
 * Aucune régie externe n'est chargée sans configuration explicite.
 */
export async function AdSlot({ slotKey, className }: { slotKey: string; className?: string }) {
  const viewer = await getViewer();
  if (viewer && tierAtLeast(viewer.entitlements.tier, "founder") && !viewer.entitlements.includesAds) return null;
  const supabase = await createSupabaseServerClient();
  const { data: slot } = await supabase
    .from("ad_slots")
    .select("key, provider, config, audience, is_enabled")
    .eq("key", slotKey)
    .maybeSingle();
  if (!slot?.is_enabled) return null;
  if (slot.audience === "visitors" && viewer) return null;
  const config = (slot.config ?? {}) as { image_path?: string; href?: string; alt?: string; label?: string };
  if (slot.provider !== "house" || !config.image_path || !config.href) return null;
  return (
    <AdSlotClient
      className={className}
      imageUrl={resolveImageUrl(config.image_path) ?? ""}
      href={config.href}
      alt={config.alt ?? "Annonce"}
      label={config.label ?? "Annonce"}
    />
  );
}
