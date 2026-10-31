import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { admin, cleanup, createUser, pool, sql, type TestUser } from "./helpers";

let freeUser: TestUser;
let premium: TestUser;
let founder: TestUser;

beforeAll(async () => {
  [freeUser, premium, founder] = await Promise.all([
    createUser(),
    createUser({ tier: "premium" }),
    createUser({ tier: "founder" }),
  ]);
});
afterAll(async () => {
  await sql("delete from public.content_requests where title like 'IT %'");
  await cleanup();
  await pool.end();
});

describe("webhooks de paiement : idempotence", () => {
  it("un même événement n'est traité qu'une fois", async () => {
    const eventId = `evt_it_${randomUUID().slice(0, 12)}`;
    const args = {
      p_provider: "stripe",
      p_event_id: eventId,
      p_event_type: "customer.subscription.updated",
      p_event_created_at: new Date().toISOString(),
      p_livemode: false,
      p_payload: { id: eventId },
    };
    const first = (await admin.rpc("claim_payment_event", args)).data![0]!;
    expect(first.should_process).toBe(true);
    const concurrent = (await admin.rpc("claim_payment_event", args)).data![0]!;
    expect(concurrent.should_process).toBe(false);
    await admin.rpc("complete_payment_event", {
      p_event_row_id: first.event_row_id,
      p_status: "processed",
    });
    const replay = (await admin.rpc("claim_payment_event", args)).data![0]!;
    expect(replay).toMatchObject({ should_process: false, previous_status: "processed" });
    await sql("delete from public.payment_events where event_id = $1", [eventId]);
  });

  it("les fonctions de traitement des paiements sont inaccessibles aux comptes", async () => {
    const { error } = await premium.client.rpc("claim_payment_event", {
      p_provider: "stripe",
      p_event_id: "evt_x",
      p_event_type: "x",
      p_event_created_at: new Date().toISOString(),
      p_livemode: false,
      p_payload: {},
    });
    expect(error).not.toBeNull();
  });
});

describe("tarif fondateur", () => {
  it("attribue un numéro de fondateur et protège le tarif lors d'un changement de prix", async () => {
    const [profile] = await sql<{ founder_number: number | null }>(
      "select founder_number from public.profiles where id = $1",
      [founder.id],
    );
    expect(profile!.founder_number).not.toBeNull();
    const [plan] = await sql<{ id: string; price_cents: number }>(
      "select id, price_cents from public.subscription_plans where tier = 'founder'",
    );
    const [original] = await sql<{ id: string }>(
      "select id from public.plan_prices where plan_id = $1 and is_current",
      [plan!.id],
    );
    const administrator = await createUser({ roles: ["admin"] });
    try {
      // Un membre ne peut pas modifier un prix.
      expect(
        (await premium.client.rpc("admin_set_plan_price", { p_plan: plan!.id, p_amount_cents: 1 }))
          .error?.message,
      ).toMatch(/FORBIDDEN/);
      const { error } = await administrator.client.rpc("admin_set_plan_price", {
        p_plan: plan!.id,
        p_amount_cents: 500,
      });
      expect(error).toBeNull();
      const [current] = await sql<{ amount_cents: number }>(
        "select amount_cents from public.plan_prices where plan_id = $1 and is_current",
        [plan!.id],
      );
      expect(current!.amount_cents).toBe(500);
      // L'abonnement fondateur en cours conserve son tarif.
      const [subscription] = await sql<{ unit_amount_cents: number; is_founder_rate: boolean }>(
        "select unit_amount_cents, is_founder_rate from public.subscriptions where user_id = $1",
        [founder.id],
      );
      expect(subscription).toEqual({ unit_amount_cents: 200, is_founder_rate: true });
    } finally {
      await sql(
        "delete from public.plan_prices where plan_id = $1 and id <> $2 and created_by = $3",
        [plan!.id, original!.id, administrator.id],
      );
      await sql("update public.plan_prices set is_current = true where id = $1", [original!.id]);
      await sql("update public.subscription_plans set price_cents = $2 where id = $1", [
        plan!.id,
        plan!.price_cents,
      ]);
    }
  });
});

describe("demandes Premium", () => {
  it("seuls les membres Premium peuvent demander une œuvre", async () => {
    const refused = await freeUser.client
      .from("content_requests")
      .insert({ title: "IT Film refusé", content_type: "film", user_id: freeUser.id });
    expect(refused.error).not.toBeNull();
    const accepted = await premium.client
      .from("content_requests")
      .insert({
        title: `IT Film ${randomUUID().slice(0, 6)}`,
        content_type: "film",
        user_id: premium.id,
      })
      .select("id, status");
    expect(accepted.error).toBeNull();
    expect(accepted.data?.[0]?.status).toBe("received");
  });

  it("seuls les membres Premium votent, et une seule fois par demande", async () => {
    const created = await premium.client
      .from("content_requests")
      .insert({
        title: `IT Série ${randomUUID().slice(0, 6)}`,
        content_type: "series",
        user_id: premium.id,
      })
      .select("id")
      .single();
    const requestId = created.data!.id;
    // L'auteur d'une demande vote automatiquement pour elle.
    const author = await premium.client
      .from("content_request_votes")
      .insert({ request_id: requestId, user_id: premium.id });
    expect(author.error?.code).toBe("23505");
    const freeVote = await freeUser.client
      .from("content_request_votes")
      .insert({ request_id: requestId, user_id: freeUser.id });
    expect(freeVote.error).not.toBeNull();
    const voter = await createUser({ tier: "premium" });
    const vote = await voter.client
      .from("content_request_votes")
      .insert({ request_id: requestId, user_id: voter.id });
    expect(vote.error).toBeNull();
    const duplicate = await voter.client
      .from("content_request_votes")
      .insert({ request_id: requestId, user_id: voter.id });
    expect(duplicate.error).not.toBeNull();
    const [row] = await sql<{ vote_count: number }>(
      "select vote_count from public.content_requests where id = $1",
      [requestId],
    );
    expect(row!.vote_count).toBe(2);
  });

  it("un membre ne peut pas confirmer une acquisition", async () => {
    const created = await premium.client
      .from("content_requests")
      .insert({
        title: `IT Doc ${randomUUID().slice(0, 6)}`,
        content_type: "documentary",
        user_id: premium.id,
      })
      .select("id")
      .single();
    const { error } = await premium.client.rpc("set_request_status", {
      p_request: created.data!.id,
      p_status: "acquisition_confirmed",
    });
    expect(error?.message).toMatch(/FORBIDDEN/);
  });
});
