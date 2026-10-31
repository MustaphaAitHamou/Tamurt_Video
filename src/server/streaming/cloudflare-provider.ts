import { createHmac, createPrivateKey, sign as cryptoSign, timingSafeEqual, type KeyObject } from "node:crypto";

import { StreamingUnavailableError, type AssetStatus, type DirectUpload, type StreamingProvider } from "@/server/streaming/types";

/**
 * Cloudflare Stream : HLS adaptatif, vidéos privées (requireSignedURLs) et
 * jetons de lecture auto-signés (RS256) avec règles d'accès géographiques.
 *
 * ⚠️ Implémentation écrite d'après la documentation publique de Cloudflare
 * Stream, mais NON TESTÉE contre le service réel depuis l'environnement de
 * développement (accès réseau indisponible). Points à vérifier lors de la
 * mise en service : voir docs/SERVICES_SETUP.md, section « Cloudflare Stream ».
 */
export type CloudflareConfig = {
  accountId: string;
  apiToken: string;
  customerCode: string;
  signingKeyId: string;
  /** Clé privée renvoyée par l'API « stream/keys » (PEM encodé en base64, ou PEM brut). */
  signingKeyPem: string;
  geoLock: boolean;
};

const API = "https://api.cloudflare.com/client/v4";

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

export function loadSigningKey(pemOrBase64: string): KeyObject {
  const pem = pemOrBase64.includes("-----BEGIN") ? pemOrBase64 : Buffer.from(pemOrBase64, "base64").toString("utf8");
  return createPrivateKey(pem);
}

/** Jeton de lecture signé : sujet = UID de la vidéo, expiration, règles d'accès. */
export function signStreamToken(input: {
  videoUid: string;
  keyId: string;
  key: KeyObject;
  expiresAt: Date;
  country?: string;
}) {
  const header = { alg: "RS256", kid: input.keyId, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    sub: input.videoUid,
    kid: input.keyId,
    nbf: now - 30,
    exp: Math.floor(input.expiresAt.getTime() / 1000),
    downloadable: false,
  };
  if (input.country) {
    payload.accessRules = [
      { type: "ip.geoip.country", action: "allow", country: [input.country] },
      { type: "any", action: "block" },
    ];
  }
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = cryptoSign("RSA-SHA256", Buffer.from(signingInput), input.key);
  return `${signingInput}.${base64url(signature)}`;
}

/**
 * Vérifie l'en-tête « Webhook-Signature: time=<unix>,sig1=<hex> » :
 * HMAC-SHA256 de « <time>.<corps brut> » avec le secret du webhook.
 */
export function verifyCloudflareWebhook(rawBody: string, signatureHeader: string | null, secret: string, toleranceSeconds = 300) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")];
    }),
  );
  const time = Number(parts.time);
  const provided = parts.sig1;
  if (!Number.isFinite(time) || !provided || !/^[0-9a-f]{64}$/i.test(provided)) return false;
  if (Math.abs(Date.now() / 1000 - time) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${time}.${rawBody}`).digest();
  const given = Buffer.from(provided, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export class CloudflareStreamProvider implements StreamingProvider {
  readonly id = "cloudflare_stream" as const;
  private readonly key: KeyObject;

  constructor(private readonly config: CloudflareConfig) {
    this.key = loadSigningKey(config.signingKeyPem);
  }

  private async api<T>(path: string, init: RequestInit = {}): Promise<{ result: T; response: Response }> {
    const response = await fetch(`${API}/accounts/${this.config.accountId}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.config.apiToken}`, ...(init.headers ?? {}) },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new StreamingUnavailableError(`Cloudflare Stream a répondu ${response.status} sur ${path}.`);
    }
    const body = (await response.json().catch(() => ({}))) as { success?: boolean; result?: T };
    return { result: body.result as T, response };
  }

  async grantPlayback(input: { providerAssetId: string; ttlSeconds: number; country: string }) {
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
    const token = signStreamToken({
      videoUid: input.providerAssetId,
      keyId: this.config.signingKeyId,
      key: this.key,
      expiresAt,
      country: this.config.geoLock && input.country !== "XX" ? input.country : undefined,
    });
    return {
      manifestUrl: `https://customer-${this.config.customerCode}.cloudflarestream.com/${token}/manifest/video.m3u8`,
      expiresAt,
      drm: null,
    };
  }

  /**
   * Envoi direct depuis le navigateur via le protocole tus (fichiers volumineux).
   * Le serveur crée l'emplacement ; le navigateur envoie ensuite les morceaux
   * directement à Cloudflare sans transiter par l'application.
   */
  async createDirectUpload(input: { fileName: string; sizeBytes: number; maxDurationSeconds: number; creatorId: string }): Promise<DirectUpload> {
    const metadata = [
      `name ${Buffer.from(input.fileName).toString("base64")}`,
      "requiresignedurls",
      `maxdurationseconds ${Buffer.from(String(input.maxDurationSeconds)).toString("base64")}`,
    ].join(",");
    const response = await fetch(`${API}/accounts/${this.config.accountId}/stream?direct_user=true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": String(input.sizeBytes),
        "Upload-Metadata": metadata,
        "Upload-Creator": input.creatorId,
      },
      cache: "no-store",
    });
    const uploadUrl = response.headers.get("location");
    const uid = response.headers.get("stream-media-id");
    if (!response.ok || !uploadUrl || !uid) {
      throw new StreamingUnavailableError(`Création de l'envoi impossible (statut ${response.status}).`);
    }
    return { uploadUrl, providerAssetId: uid };
  }

  async getAssetStatus(providerAssetId: string): Promise<AssetStatus> {
    const { result } = await this.api<{
      readyToStream?: boolean;
      duration?: number;
      input?: { width?: number; height?: number };
      status?: { state?: string; errorReasonText?: string };
    }>(`/stream/${encodeURIComponent(providerAssetId)}`);
    const state = result?.status?.state;
    return {
      state: result?.readyToStream ? "ready" : state === "error" ? "error" : "processing",
      durationSeconds: result?.duration && result.duration > 0 ? Math.round(result.duration) : undefined,
      width: result?.input?.width,
      height: result?.input?.height,
      errorMessage: result?.status?.errorReasonText,
    };
  }

  async deleteAsset(providerAssetId: string) {
    await this.api(`/stream/${encodeURIComponent(providerAssetId)}`, { method: "DELETE" });
  }
}
