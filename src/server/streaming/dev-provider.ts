import { signMediaToken } from "@/server/streaming/tokens";
import type { StreamingProvider } from "@/server/streaming/types";

/**
 * Fournisseur de DÉVELOPPEMENT : sert les médias synthétiques de dev-media/
 * via /api/dev-stream, derrière un jeton signé à durée limitée — même
 * principe que les URL signées de Cloudflare Stream, pour tester la chaîne
 * d'autorisation de bout en bout sans service externe.
 */
export class DevStreamingProvider implements StreamingProvider {
  readonly id = "dev_local" as const;

  constructor(
    private readonly secret: string,
    private readonly geoLock: boolean,
  ) {}

  async grantPlayback(input: { providerAssetId: string; ttlSeconds: number; country: string }) {
    const token = await signMediaToken(
      { sub: input.providerAssetId, uid: null, ...(this.geoLock && input.country !== "XX" ? { ctry: input.country } : {}) },
      this.secret,
      input.ttlSeconds,
    );
    return {
      manifestUrl: `/api/dev-stream/${token}/master.m3u8`,
      expiresAt: new Date(Date.now() + input.ttlSeconds * 1000),
      drm: null,
    };
  }
}

/** Dossier de média dérivé de l'identifiant fournisseur (« demo-feature#slug » → « demo-feature »). */
export function devAssetFolder(providerAssetId: string): string | null {
  const folder = providerAssetId.split("#")[0] ?? "";
  return /^[a-z0-9-]{1,64}$/.test(folder) ? folder : null;
}
