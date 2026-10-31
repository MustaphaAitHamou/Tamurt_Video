import { describe, expect, it } from "vitest";

import { buildEnvForTests } from "@/lib/env";
import { renderEmail, templateForNotificationType } from "@/server/email/templates";
import { dbErrorCode, dbErrorMessage } from "@/server/errors";

const base = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk",
  SUPABASE_SECRET_KEY: "sk",
};

describe("configuration serveur", () => {
  it("désactive les paiements et utilise la diffusion de développement par défaut", () => {
    const env = buildEnvForTests({ ...base, NODE_ENV: "development" });
    expect(env.payments.provider).toBe("disabled");
    expect(env.streaming.provider).toBe("dev");
    expect(env.email.provider).toBe("console");
  });
  it("active Stripe dès qu'une clé est fournie, sans autoriser le mode réel", () => {
    const env = buildEnvForTests({
      ...base,
      NODE_ENV: "development",
      STRIPE_SECRET_KEY: "sk_test_x",
    });
    expect(env.payments.provider).toBe("stripe");
    expect(env.payments.liveModeAllowed).toBeFalsy();
  });
  it("ignore les facilités de développement en production", () => {
    const env = buildEnvForTests({
      ...base,
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      DEV_COUNTRY_OVERRIDE: "FR",
      RATE_LIMIT_DISABLED: "true",
    });
    expect(env.geo.devOverride).toBeUndefined();
    expect(env.rateLimitDisabled).toBe(false);
  });
  it("refuse une configuration incomplète", () => {
    expect(() => buildEnvForTests({ NODE_ENV: "development" })).toThrow(/Configuration invalide/);
  });
});

describe("emails transactionnels", () => {
  it("échappe le contenu et produit des liens absolus", () => {
    const email = renderEmail("request.status_changed", {
      title: "Demande <b>X</b>",
      body: "Note <script>alert(1)</script>",
      link: "/demandes/1",
      siteUrl: "https://tamurt.example",
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain('href="https://tamurt.example/demandes/1"');
    expect(email.text).toContain("https://tamurt.example/demandes/1");
    expect(email.text).toContain("ne constitue pas une promesse");
  });
  it("associe les notifications à leur modèle", () => {
    expect(templateForNotificationType("billing.payment_failed")).toBe("billing.payment_failed");
    expect(templateForNotificationType("staff.content_claim")).toBe("staff.alert");
    expect(templateForNotificationType("account.role_granted")).toBe("account.notice");
  });
  it("utilise un pied de page adapté aux destinataires sans compte", () => {
    const email = renderEmail("external.notice", {
      title: "Suite donnée",
      body: "Paragraphe 1\n\nParagraphe 2",
      siteUrl: "https://tamurt.example",
    });
    expect(email.html).toContain("démarche effectuée auprès de Tamurt Vidéo");
    expect(email.text).toContain("Paragraphe 2");
  });
});

describe("erreurs de base de données", () => {
  it("traduit les codes PostgreSQL et métier", () => {
    expect(dbErrorCode({ code: "42501" })).toBe("FORBIDDEN");
    expect(dbErrorCode({ code: "P0001", message: "PUBLICATION_REQUIRES_VALID_LICENSE: ..." })).toBe(
      "PUBLICATION_REQUIRES_VALID_LICENSE",
    );
    expect(
      dbErrorMessage({ code: "P0001", message: "PUBLICATION_REQUIRES_VALID_LICENSE: x" }),
    ).toMatch(/licence signée/);
    expect(dbErrorMessage({ code: "XX000", message: "boom" })).toMatch(/erreur est survenue/);
  });
});
