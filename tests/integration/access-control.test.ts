import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ROLE_PERMISSIONS } from "@/lib/permissions";

import { anon, cleanup, createTitle, createUser, pool, sql, type TestUser } from "./helpers";

let member: TestUser;
let editor: TestUser;
let rightsManager: TestUser;
let draft: { id: string };

beforeAll(async () => {
  [member, editor, rightsManager] = await Promise.all([
    createUser(),
    createUser({ roles: ["catalog_editor"] }),
    createUser({ roles: ["rights_manager"] }),
  ]);
  draft = await createTitle({ status: "draft" });
});
afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe("habilitations", () => {
  it("le miroir applicatif des rôles correspond exactement à la base", async () => {
    const rows = await sql<{ role: string; permission: string }>(
      "select role::text as role, permission from public.role_permissions",
    );
    const fromDb = Object.fromEntries(
      Object.keys(ROLE_PERMISSIONS).map((role) => [
        role,
        rows
          .filter((r) => r.role === role)
          .map((r) => r.permission)
          .sort(),
      ]),
    );
    const fromCode = Object.fromEntries(
      Object.entries(ROLE_PERMISSIONS).map(([role, list]) => [role, [...list].sort()]),
    );
    expect(fromDb).toEqual(fromCode);
  });

  it("le dernier administrateur ne peut pas perdre son rôle", async () => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const admins = await client.query(
        "select user_id from public.user_roles where role = 'admin'",
      );
      // Retire tous les administrateurs sauf un, puis tente de retirer le dernier.
      for (const row of admins.rows.slice(1))
        await client.query("delete from public.user_roles where user_id = $1 and role = 'admin'", [
          row.user_id,
        ]);
      await expect(
        client.query("delete from public.user_roles where user_id = $1 and role = 'admin'", [
          admins.rows[0].user_id,
        ]),
      ).rejects.toThrow(/LAST_ADMIN/);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });

  it("le journal d'audit est immuable", async () => {
    await sql(
      "insert into public.audit_logs (action, entity_type) values ('test.integration', 'test')",
    );
    await expect(
      sql("update public.audit_logs set action = 'falsifie' where action = 'test.integration'"),
    ).rejects.toThrow();
    await expect(
      sql("delete from public.audit_logs where action = 'test.integration'"),
    ).rejects.toThrow();
  });
});

describe("sécurité au niveau des lignes (RLS)", () => {
  it("un visiteur ne voit ni brouillon, ni licence, ni journal", async () => {
    const titles = await anon.from("titles").select("id").eq("id", draft.id);
    expect(titles.data ?? []).toHaveLength(0);
    const licenses = await anon.from("licenses").select("id").limit(1);
    expect(licenses.data ?? []).toHaveLength(0);
    const audit = await anon.from("audit_logs").select("id").limit(1);
    expect(audit.data ?? []).toHaveLength(0);
  });

  it("un membre ne peut ni lire les droits ni modifier le catalogue", async () => {
    expect((await member.client.from("licenses").select("id").limit(5)).data ?? []).toHaveLength(0);
    expect(
      (await member.client.from("titles").select("id").eq("id", draft.id)).data ?? [],
    ).toHaveLength(0);
    const insert = await member.client
      .from("titles")
      .insert({ slug: "intrusion-test", title: "Intrusion", kind: "film" });
    expect(insert.error).not.toBeNull();
    const roles = await member.client
      .from("user_roles")
      .insert({ user_id: member.id, role: "admin" });
    expect(roles.error).not.toBeNull();
  });

  it("un membre ne peut pas s'attribuer une formule ni modifier son statut de fondateur", async () => {
    const subscription = await member.client.from("subscriptions").insert({
      user_id: member.id,
      plan_id: "00000000-0000-0000-0000-000000000000",
      provider: "manual",
      status: "active",
      unit_amount_cents: 0,
    } as never);
    expect(subscription.error).not.toBeNull();
    const profile = await member.client
      .from("profiles")
      .update({ founder_number: 1 } as never)
      .eq("id", member.id);
    expect(profile.error).not.toBeNull();
  });

  it("l'éditeur gère le catalogue mais pas les licences", async () => {
    expect((await editor.client.from("titles").select("id").eq("id", draft.id)).data).toHaveLength(
      1,
    );
    const update = await editor.client
      .from("titles")
      .update({ tagline: "Modifié par l'éditeur" })
      .eq("id", draft.id)
      .select("id");
    expect(update.error).toBeNull();
    expect(update.data).toHaveLength(1);
    const license = await editor.client.from("licenses").insert({
      title_id: draft.id,
      license_type: "non_exclusive_license",
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(license.error).not.toBeNull();
  });

  it("le gestionnaire des droits enregistre les licences mais ne publie pas", async () => {
    const license = await rightsManager.client
      .from("licenses")
      .insert({
        title_id: draft.id,
        license_type: "non_exclusive_license",
        status: "draft",
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .select("id");
    expect(license.error).toBeNull();
    const publish = await rightsManager.client
      .from("titles")
      .update({ status: "published" })
      .eq("id", draft.id)
      .select("id");
    expect(publish.data ?? []).toHaveLength(0);
  });
});
