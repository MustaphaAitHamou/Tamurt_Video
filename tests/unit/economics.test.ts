import { describe, expect, it } from "vitest";

import {
  costPerMinuteCents,
  formatEuros,
  paymentFeeCents,
  planEconomics,
  profitabilityRisks,
  storageCostCents,
  streamingCostCents,
  totalFixedCostsCents,
  type CostModel,
} from "@/server/finance/economics";

const model: CostModel = {
  streamDeliveredUsdPer1000Min: 1,
  streamStoredUsdPer1000Min: 5,
  usdToEurRate: 0.9,
  paymentFeePercent: 1.5,
  paymentFeeFixedCents: 25,
  fixedMonthlyCostsCents: { hosting: 2000, email: 500 },
};

describe("économie unitaire", () => {
  it("calcule les coûts de diffusion et de stockage en centimes d'euro", () => {
    expect(streamingCostCents(10_000, model)).toBe(900); // 10 000 min × 1 $/1000 × 0,9
    expect(storageCostCents(2_000, model)).toBe(900); // 2 000 min × 5 $/1000 × 0,9
    expect(streamingCostCents(-50, model)).toBe(0);
    expect(costPerMinuteCents(model)).toBeCloseTo(0.09);
  });

  it("calcule la commission de paiement (part variable + part fixe)", () => {
    expect(paymentFeeCents(200, model)).toBe(28); // 3 + 25
    expect(paymentFeeCents(1000, model)).toBe(40);
    expect(paymentFeeCents(0, model)).toBe(0);
    expect(totalFixedCostsCents(model)).toBe(2500);
  });

  it("répartit coûts et marges par formule", () => {
    const [founder, standard] = planEconomics(
      [
        {
          code: "founder",
          name: "Fondateur",
          priceCents: 200,
          activeSubscribers: 10,
          minutesWatched: 3_000,
        },
        {
          code: "standard",
          name: "Standard",
          priceCents: 1000,
          activeSubscribers: 30,
          minutesWatched: 60_000,
        },
      ],
      model,
    );
    expect(founder!.revenueCents).toBe(2000);
    expect(founder!.paymentFeesCents).toBe(280);
    expect(founder!.fixedCostShareCents).toBe(625); // 2 500 × 10/40
    expect(founder!.marginCents).toBe(2000 - 280 - 270 - 625);
    expect(standard!.fixedCostShareCents).toBe(1875);
    expect(founder!.breakEvenMinutesPerSubscriber).toBe(Math.floor((200 - 28) / 0.09));
    expect(standard!.marginRate).toBeGreaterThan(0);
  });

  it("signale les risques de rentabilité du tarif fondateur", () => {
    const economics = planEconomics(
      [
        {
          code: "founder",
          name: "Fondateur",
          priceCents: 200,
          activeSubscribers: 1,
          minutesWatched: 50_000,
        },
      ],
      model,
    );
    const risks = profitabilityRisks({
      economics,
      model,
      founderPriceCents: 200,
      standardPriceCents: 1000,
      launchPhase: "commercial",
    });
    expect(risks.some((r) => r.includes("commission de paiement absorbe environ 14 %"))).toBe(true);
    expect(risks.some((r) => r.includes("phase commerciale"))).toBe(true);
    expect(risks.some((r) => r.includes("déficitaire"))).toBe(true);
    expect(risks.join(" ")).toContain(formatEuros(28));
  });

  it("formate les montants à la française", () => {
    expect(formatEuros(28)).toMatch(/^0,28\s€$/);
    expect(formatEuros(-991)).toMatch(/^-9,91\s€$/);
  });
});
