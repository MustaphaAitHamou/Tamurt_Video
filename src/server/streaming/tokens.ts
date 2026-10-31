import { SignJWT, jwtVerify } from "jose";

/**
 * Jetons HMAC courts utilisés pour les ressources servies par l'application :
 * sous-titres et médias du fournisseur de développement.
 */
export type MediaTokenClaims = {
  /** Identifiant de la ressource (média interne ou identifiant fournisseur). */
  sub: string;
  /** Utilisateur titulaire de l'autorisation (null pour une bande-annonce publique). */
  uid: string | null;
  /** Pays autorisé (verrouillage géographique facultatif). */
  ctry?: string;
};

const encoder = new TextEncoder();

export async function signMediaToken(claims: MediaTokenClaims, secret: string, ttlSeconds: number) {
  return new SignJWT({ uid: claims.uid, ...(claims.ctry ? { ctry: claims.ctry } : {}) })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setNotBefore("0s")
    .setExpirationTime(`${Math.max(60, Math.floor(ttlSeconds))}s`)
    .setIssuer("tamurt-video")
    .sign(encoder.encode(secret));
}

export async function verifyMediaToken(
  token: string,
  secret: string,
): Promise<(MediaTokenClaims & { exp: number }) | null> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret), {
      issuer: "tamurt-video",
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    return {
      sub: payload.sub,
      uid: typeof payload.uid === "string" ? payload.uid : null,
      ctry: typeof payload.ctry === "string" ? payload.ctry : undefined,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
