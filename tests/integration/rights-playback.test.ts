import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  admin,
  cleanup,
  createTitle,
  createUser,
  playback,
  pool,
  setSetting,
  sql,
  type TestUser,
} from "./helpers";

let freeUser: TestUser;
let founder: TestUser;
let standard: TestUser;
let editor: TestUser;

beforeAll(async () => {
  [freeUser, founder, standard, editor] = await Promise.all([
    createUser(),
    createUser({ tier: "founder" }),
    createUser({ tier: "standard" }),
    createUser({ roles: ["catalog_editor"] }),
  ]);
});
afterAll(async () => {
  await setSetting("launch_phase", "founder");
  await setSetting("maintenance_mode", false);
  await cleanup();
  await pool.end();
});

describe("garde de publication", () => {
  it("refuse la publication sans licence valide, puis l'accepte une fois la licence signée", async () => {
    const title = await createTitle({ status: "draft", license: null });
    const refused = await editor.client
      .from("titles")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", title.id);
    expect(refused.error?.message).toMatch(/PUBLICATION_REQUIRES_VALID_LICENSE/);

    const expired = await createTitle({
      status: "draft",
      license: {
        endsAt: new Date(Date.now() - 86_400_000).toISOString(),
        startsAt: new Date(Date.now() - 86_400_000 * 90).toISOString(),
      },
    });
    const refusedExpired = await editor.client
      .from("titles")
      .update({ status: "published" })
      .eq("id", expired.id);
    expect(refusedExpired.error?.message).toMatch(/PUBLICATION_REQUIRES_VALID_LICENSE/);

    const licensed = await createTitle({ status: "draft" });
    const accepted = await editor.client
      .from("titles")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", licensed.id)
      .select("status");
    expect(accepted.error).toBeNull();
    expect(accepted.data?.[0]?.status).toBe("published");
  });

  it("dépublie automatiquement une œuvre dont la licence a expiré", async () => {
    const title = await createTitle({ status: "published" });
    await sql(
      "update public.licenses set ends_at = now() - interval '1 minute', starts_at = now() - interval '30 days' where title_id = $1",
      [title.id],
    );
    const { data } = await admin.rpc("unpublish_titles_without_rights");
    expect((data ?? []).map((row) => row.title_id)).toContain(title.id);
    const [row] = await sql<{ status: string }>("select status from public.titles where id = $1", [
      title.id,
    ]);
    expect(row!.status).toBe("unpublished");
  });
});

describe("contrôle d'accès à la lecture", () => {
  it("exige une connexion pour la vidéo principale", async () => {
    const title = await createTitle({ status: "published" });
    expect(await playback(null, title.id, "FR")).toMatchObject({
      allowed: false,
      reason: "login_required",
    });
  });

  it("applique la formule requise", async () => {
    const title = await createTitle({ status: "published", minTier: "standard" });
    expect(await playback(freeUser.id, title.id, "FR")).toMatchObject({
      allowed: false,
      reason: "subscription_required",
      required_tier: "standard",
    });
    expect(await playback(founder.id, title.id, "FR")).toMatchObject({
      allowed: false,
      reason: "subscription_required",
    });
    expect(await playback(standard.id, title.id, "FR")).toMatchObject({
      allowed: true,
      reason: "ok",
    });
  });

  it("ouvre le catalogue Standard aux fondateurs actifs en phase commerciale", async () => {
    const title = await createTitle({ status: "published", minTier: "standard" });
    await setSetting("launch_phase", "commercial");
    try {
      expect(await playback(founder.id, title.id, "FR")).toMatchObject({ allowed: true });
      const { data } = await admin.rpc("get_entitlements_internal", { p_user: founder.id });
      expect(data?.[0]).toMatchObject({
        tier: "standard",
        plan_tier: "founder",
        is_founder_rate: true,
      });
    } finally {
      await setSetting("launch_phase", "founder");
    }
    const { data } = await admin.rpc("get_entitlements_internal", { p_user: founder.id });
    expect(data?.[0]?.tier).toBe("founder");
  });

  it("refuse la lecture hors des territoires de la licence", async () => {
    const title = await createTitle({
      status: "published",
      minTier: "free",
      license: { territories: ["FR", "BE"] },
    });
    expect(await playback(standard.id, title.id, "FR")).toMatchObject({ allowed: true });
    expect(await playback(standard.id, title.id, "DZ")).toMatchObject({
      allowed: false,
      reason: "territory_not_allowed",
    });
    expect(await playback(standard.id, title.id, "XX")).toMatchObject({
      allowed: false,
      reason: "territory_not_allowed",
    });
  });

  it("applique les exclusions d'une licence mondiale", async () => {
    const title = await createTitle({
      status: "published",
      minTier: "free",
      license: { territories: ["WW"], excluded: ["US"] },
    });
    expect(await playback(freeUser.id, title.id, "DZ")).toMatchObject({ allowed: true });
    expect(await playback(freeUser.id, title.id, "US")).toMatchObject({
      allowed: false,
      reason: "territory_not_allowed",
    });
  });

  it("bloque immédiatement une licence expirée, même avant la dépublication automatique", async () => {
    const title = await createTitle({ status: "published", minTier: "free" });
    await sql(
      "update public.licenses set ends_at = now() - interval '1 minute', starts_at = now() - interval '30 days' where title_id = $1",
      [title.id],
    );
    expect(await playback(standard.id, title.id, "FR")).toMatchObject({
      allowed: false,
      reason: "license_expired",
    });
  });

  it("refuse un mode d'exploitation non couvert (licence promotionnelle seule)", async () => {
    const title = await createTitle({
      status: "published",
      minTier: "standard",
      license: { modes: ["trailer"] },
    });
    const result = await playback(standard.id, title.id, "FR");
    expect(result.allowed).toBe(false);
    expect(["mode_not_covered", "no_license"]).toContain(result.reason);
  });

  it("bloque les œuvres annoncées, retirées, et les comptes suspendus", async () => {
    const announced = await createTitle({ status: "announced", minTier: "free" });
    expect(await playback(standard.id, announced.id, "FR")).toMatchObject({
      allowed: false,
      reason: "coming_soon",
    });

    const takenDown = await createTitle({ status: "published", minTier: "free" });
    await sql(
      "update public.titles set takedown_at = now(), takedown_reason = 'test' where id = $1",
      [takenDown.id],
    );
    expect(await playback(standard.id, takenDown.id, "FR")).toMatchObject({
      allowed: false,
      reason: "taken_down",
    });

    const title = await createTitle({ status: "published", minTier: "free" });
    const suspended = await createUser({ tier: "standard" });
    await sql(
      "update public.profiles set suspended_at = now(), suspension_reason = 'test' where id = $1",
      [suspended.id],
    );
    expect(await playback(suspended.id, title.id, "FR")).toMatchObject({
      allowed: false,
      reason: "account_suspended",
    });
  });

  it("suspend la lecture en mode maintenance", async () => {
    const title = await createTitle({ status: "published", minTier: "free" });
    await setSetting("maintenance_mode", true);
    try {
      expect(await playback(standard.id, title.id, "FR")).toMatchObject({
        allowed: false,
        reason: "maintenance",
      });
    } finally {
      await setSetting("maintenance_mode", false);
    }
  });
});
