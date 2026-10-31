/**
 * Économie unitaire de la plateforme (fonctions pures, sans accès réseau).
 * Toutes les valeurs monétaires sont en centimes d'euro. Les coûts sont des
 * ESTIMATIONS fondées sur les paramètres saisis dans l'administration ; les
 * montants exacts figurent dans les tableaux de bord des prestataires.
 */
export type CostModel = {
  streamDeliveredUsdPer1000Min: number;
  streamStoredUsdPer1000Min: number;
  usdToEurRate: number;
  paymentFeePercent: number;
  paymentFeeFixedCents: number;
  fixedMonthlyCostsCents: Record<string, number>;
};

export type PlanUsage = {
  code: string;
  name: string;
  priceCents: number;
  activeSubscribers: number;
  /** Minutes regardées sur la période par les abonnés de cette formule. */
  minutesWatched: number;
};

export type PlanEconomics = PlanUsage & {
  revenueCents: number;
  paymentFeesCents: number;
  streamingCostCents: number;
  fixedCostShareCents: number;
  marginCents: number;
  marginRate: number | null;
  /** Minutes de visionnage par abonné et par mois avant que la marge ne devienne nulle (hors coûts fixes). */
  breakEvenMinutesPerSubscriber: number | null;
};

const round = (value: number) => Math.round(value);

/** Montant en euros au format français (ex. 0,28 €), pour les messages d'alerte. */
export function formatEuros(cents: number) {
  return `${(cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function streamingCostCents(minutes: number, model: CostModel) {
  return round(
    (Math.max(minutes, 0) / 1000) * model.streamDeliveredUsdPer1000Min * model.usdToEurRate * 100,
  );
}

export function storageCostCents(minutesStored: number, model: CostModel) {
  return round(
    (Math.max(minutesStored, 0) / 1000) *
      model.streamStoredUsdPer1000Min *
      model.usdToEurRate *
      100,
  );
}

export function paymentFeeCents(amountCents: number, model: CostModel) {
  if (amountCents <= 0) return 0;
  return round((amountCents * model.paymentFeePercent) / 100 + model.paymentFeeFixedCents);
}

export function totalFixedCostsCents(model: CostModel) {
  return Object.values(model.fixedMonthlyCostsCents).reduce(
    (sum, value) => sum + (Number.isFinite(value) ? value : 0),
    0,
  );
}

/** Coût de diffusion d'une minute, en centimes. */
export function costPerMinuteCents(model: CostModel) {
  return (model.streamDeliveredUsdPer1000Min * model.usdToEurRate * 100) / 1000;
}

/**
 * Marge mensuelle par formule. Les coûts fixes sont répartis au prorata du
 * nombre d'abonnés ; les coûts de diffusion selon les minutes réellement vues.
 */
export function planEconomics(
  plans: PlanUsage[],
  model: CostModel,
  extraFixedCostsCents = 0,
): PlanEconomics[] {
  const fixed = totalFixedCostsCents(model) + extraFixedCostsCents;
  const totalSubscribers = plans.reduce((sum, p) => sum + p.activeSubscribers, 0);
  const minuteCost = costPerMinuteCents(model);
  return plans.map((plan) => {
    const revenueCents = plan.priceCents * plan.activeSubscribers;
    const paymentFeesCents = paymentFeeCents(plan.priceCents, model) * plan.activeSubscribers;
    const streaming = streamingCostCents(plan.minutesWatched, model);
    const fixedShare =
      totalSubscribers > 0 ? round((fixed * plan.activeSubscribers) / totalSubscribers) : 0;
    const marginCents = revenueCents - paymentFeesCents - streaming - fixedShare;
    const netPerSubscriber = plan.priceCents - paymentFeeCents(plan.priceCents, model);
    return {
      ...plan,
      revenueCents,
      paymentFeesCents,
      streamingCostCents: streaming,
      fixedCostShareCents: fixedShare,
      marginCents,
      marginRate: revenueCents > 0 ? marginCents / revenueCents : null,
      breakEvenMinutesPerSubscriber:
        minuteCost > 0 ? Math.floor(netPerSubscriber / minuteCost) : null,
    };
  });
}

/** Points de vigilance sur la rentabilité, exprimés en clair pour le tableau de bord. */
export function profitabilityRisks(input: {
  economics: PlanEconomics[];
  model: CostModel;
  founderPriceCents: number;
  standardPriceCents: number;
  launchPhase: "founder" | "commercial";
}): string[] {
  const risks: string[] = [];
  const fee = paymentFeeCents(input.founderPriceCents, input.model);
  const feeShare = input.founderPriceCents > 0 ? fee / input.founderPriceCents : 0;
  if (feeShare >= 0.1) {
    risks.push(
      `La commission de paiement absorbe environ ${Math.round(feeShare * 100)} % du forfait Fondateur (${formatEuros(fee)} sur ${formatEuros(input.founderPriceCents)}) : la part fixe pèse lourd sur les petits montants.`,
    );
  }
  const founder = input.economics.find((e) => e.code === "founder");
  if (
    founder?.breakEvenMinutesPerSubscriber !== null &&
    founder?.breakEvenMinutesPerSubscriber !== undefined
  ) {
    risks.push(
      `Au tarif fondateur, la diffusion seule devient déficitaire au-delà d'environ ${founder.breakEvenMinutesPerSubscriber} minutes de visionnage par mois et par abonné, avant coûts fixes et droits de diffusion.`,
    );
  }
  if (input.launchPhase === "commercial") {
    risks.push(
      `En phase commerciale, les fondateurs accèdent au catalogue Standard à ${formatEuros(input.founderPriceCents)} au lieu de ${formatEuros(input.standardPriceCents)} : les droits de diffusion rémunérés au visionnage ou au prorata des abonnés peuvent rendre ce segment déficitaire. Suivez la marge de la formule Fondateur.`,
    );
  }
  for (const plan of input.economics) {
    if (plan.activeSubscribers > 0 && plan.marginCents < 0) {
      risks.push(
        `La formule ${plan.name} est déficitaire sur la période (${formatEuros(plan.marginCents)}).`,
      );
    }
  }
  const totalSubscribers = input.economics.reduce((sum, p) => sum + p.activeSubscribers, 0);
  const fixed = totalFixedCostsCents(input.model);
  if (totalSubscribers > 0 && fixed / totalSubscribers > input.founderPriceCents) {
    risks.push(
      `Les coûts fixes (${formatEuros(fixed)} par mois) dépassent le revenu d'un abonné fondateur par abonné actif : la base d'abonnés doit croître pour les couvrir.`,
    );
  }
  return risks;
}
