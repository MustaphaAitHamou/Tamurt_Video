import { createHmac, generateKeyPairSync, createVerify } from "node:crypto";

import { describe, expect, it } from "vitest";

import { signStreamToken, verifyCloudflareWebhook } from "@/server/streaming/cloudflare-provider";
import { signMediaToken, verifyMediaToken } from "@/server/streaming/tokens";

describe("jetons de média (HS256)", () => {
  const secret = "secret-de-test-suffisamment-long";
  it("signe et vérifie un jeton avec pays et utilisateur", async () => {
    const token = await signMediaToken({ sub: "asset-1", uid: "user-1", ctry: "FR" }, secret, 600);
    expect(await verifyMediaToken(token, secret)).toMatchObject({
      sub: "asset-1",
      uid: "user-1",
      ctry: "FR",
    });
  });
  it("rejette un secret différent ou un jeton altéré", async () => {
    const token = await signMediaToken({ sub: "asset-1", uid: null }, secret, 600);
    expect(await verifyMediaToken(token, "autre-secret")).toBeNull();
    const [h, p, s] = token.split(".");
    expect(await verifyMediaToken(`${h}.${p}x.${s}`, secret)).toBeNull();
  });
  it("impose une durée minimale de 60 s", async () => {
    const token = await signMediaToken({ sub: "a", uid: null }, secret, 1);
    const claims = await verifyMediaToken(token, secret);
    expect(claims!.exp - Math.floor(Date.now() / 1000)).toBeGreaterThanOrEqual(59);
  });
});

describe("jetons Cloudflare Stream (RS256)", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  it("produit un JWT vérifiable avec règle géographique", () => {
    const token = signStreamToken({
      videoUid: "video123",
      keyId: "kid1",
      key: privateKey,
      expiresAt: new Date(Date.now() + 3_600_000),
      country: "FR",
    });
    const [header, payload, signature] = token.split(".");
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${header}.${payload}`);
    expect(verifier.verify(publicKey, Buffer.from(signature!, "base64url"))).toBe(true);
    const claims = JSON.parse(Buffer.from(payload!, "base64url").toString());
    expect(claims).toMatchObject({ sub: "video123", kid: "kid1", downloadable: false });
    expect(claims.accessRules[0]).toEqual({
      type: "ip.geoip.country",
      action: "allow",
      country: ["FR"],
    });
    expect(claims.accessRules[1]).toEqual({ type: "any", action: "block" });
  });
});

describe("webhooks Cloudflare", () => {
  const secret = "cf-webhook-secret";
  const body = JSON.stringify({ uid: "video123", readyToStream: true });
  const sign = (time: number, payload = body, key = secret) =>
    `time=${time},sig1=${createHmac("sha256", key).update(`${time}.${payload}`).digest("hex")}`;
  const now = Math.floor(Date.now() / 1000);
  it("accepte une signature valide et récente", () => {
    expect(verifyCloudflareWebhook(body, sign(now), secret)).toBe(true);
  });
  it("rejette signature erronée, corps modifié, horodatage ancien ou en-tête absent", () => {
    expect(verifyCloudflareWebhook(body, sign(now, body, "autre"), secret)).toBe(false);
    expect(verifyCloudflareWebhook(`${body} `, sign(now), secret)).toBe(false);
    expect(verifyCloudflareWebhook(body, sign(now - 3600), secret)).toBe(false);
    expect(verifyCloudflareWebhook(body, null, secret)).toBe(false);
    expect(verifyCloudflareWebhook(body, "time=abc,sig1=zz", secret)).toBe(false);
  });
});
