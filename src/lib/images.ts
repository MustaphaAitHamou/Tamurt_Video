import { publicEnv } from "@/lib/public-env";

export const PUBLIC_MEDIA_BUCKET = "media-public";

/**
 * Résout une référence d'image : chemin local (/demo/...), URL absolue, ou
 * chemin relatif au bucket public Supabase.
 */
export function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("/") || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/${PUBLIC_MEDIA_BUCKET}/${path.replace(/^\/+/, "")}`;
}
