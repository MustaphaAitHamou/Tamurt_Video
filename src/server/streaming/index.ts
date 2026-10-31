import "server-only";

import { getEnv } from "@/lib/env";
import { CloudflareStreamProvider } from "@/server/streaming/cloudflare-provider";
import { DevStreamingProvider } from "@/server/streaming/dev-provider";
import { StreamingUnavailableError, type StreamingProvider, type StreamingProviderId } from "@/server/streaming/types";

const cache = new Map<StreamingProviderId, StreamingProvider>();

/** Fournisseur correspondant au média ; refuse le fournisseur de développement en production. */
export function getStreamingProvider(id: StreamingProviderId): StreamingProvider {
  const cached = cache.get(id);
  if (cached) return cached;
  const env = getEnv();
  let provider: StreamingProvider;
  if (id === "dev_local") {
    if (env.isProductionDeployment && !env.streaming.allowDevInProduction) {
      throw new StreamingUnavailableError("Le fournisseur de développement est désactivé en production.");
    }
    provider = new DevStreamingProvider(env.streaming.devSecret, env.streaming.geoLock);
  } else {
    const cf = env.streaming.cloudflare;
    if (!cf.accountId || !cf.apiToken || !cf.customerCode || !cf.signingKeyId || !cf.signingKeyPem) {
      throw new StreamingUnavailableError("Cloudflare Stream n'est pas configuré (voir docs/SERVICES_SETUP.md).");
    }
    provider = new CloudflareStreamProvider({
      accountId: cf.accountId,
      apiToken: cf.apiToken,
      customerCode: cf.customerCode,
      signingKeyId: cf.signingKeyId,
      signingKeyPem: cf.signingKeyPem,
      geoLock: env.streaming.geoLock,
    });
  }
  cache.set(id, provider);
  return provider;
}

/** Fournisseur utilisé pour les nouveaux envois de vidéos. */
export function getUploadProvider(): StreamingProvider {
  return getStreamingProvider(getEnv().streaming.provider === "cloudflare" ? "cloudflare_stream" : "dev_local");
}
