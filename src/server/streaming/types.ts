/**
 * Abstraction du fournisseur de diffusion vidéo.
 *
 * Les URL signées limitent le partage des liens et l'accès hors des droits
 * accordés ; elles ne constituent PAS une protection absolue contre la copie.
 * Un contrat de distribution exigeant une gestion des droits numériques (DRM :
 * Widevine, FairPlay, PlayReady) nécessitera un fournisseur de chiffrement et
 * de licences : le champ `drm` de la session de lecture est prévu à cet effet
 * et le lecteur sait déjà recevoir une configuration de ce type (voir
 * ARCHITECTURE.md, section « DRM »).
 */
export type StreamingProviderId = "cloudflare_stream" | "dev_local";

export type DrmConfiguration = {
  system: "widevine" | "fairplay" | "playready";
  licenseUrl: string;
  certificateUrl?: string;
  headers?: Record<string, string>;
};

export type PlaybackGrant = {
  manifestUrl: string;
  expiresAt: Date;
  drm: DrmConfiguration[] | null;
};

export type DirectUpload = {
  /** URL d'envoi direct depuis le navigateur (protocole tus). */
  uploadUrl: string;
  providerAssetId: string;
};

export type AssetStatus = {
  state: "processing" | "ready" | "error";
  durationSeconds?: number;
  width?: number;
  height?: number;
  errorMessage?: string;
};

export interface StreamingProvider {
  readonly id: StreamingProviderId;
  /** Délivre une autorisation de lecture à durée limitée pour un média privé. */
  grantPlayback(input: {
    providerAssetId: string;
    ttlSeconds: number;
    country: string;
  }): Promise<PlaybackGrant>;
  createDirectUpload?(input: {
    fileName: string;
    sizeBytes: number;
    maxDurationSeconds: number;
    creatorId: string;
  }): Promise<DirectUpload>;
  getAssetStatus?(providerAssetId: string): Promise<AssetStatus>;
  deleteAsset?(providerAssetId: string): Promise<void>;
}

export class StreamingUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreamingUnavailableError";
  }
}
