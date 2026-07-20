import {
  PATREON_PLAN_RATES,
  PATREON_PROCESSING_DEFAULT,
} from "../../data/patreonConfig";

export interface PatreonTier {
  patrons: number;
  price: number;
}

export interface PatreonRevenueInput {
  tiers: {
    tier1: PatreonTier;
    tier2: PatreonTier;
    tier3: PatreonTier;
  };
  plan: keyof typeof PATREON_PLAN_RATES;
  processing?: { percent: number; fixedPerTransaction: number };
}

export interface PatreonRevenueResult {
  gross: number;
  platformFee: number;
  processingFee: number;
  net: number;
  annual: number;
  effectiveRate: number;
  perTier: { tier1: number; tier2: number; tier3: number };
}

const g = (n: number): number => (Number.isFinite(n) && n >= 0 ? n : 0);

export function estimatePatreonRevenue(
  i: PatreonRevenueInput,
): PatreonRevenueResult {
  const planRate = PATREON_PLAN_RATES[i.plan] ?? PATREON_PLAN_RATES.standard;
  const processing = i.processing ?? PATREON_PROCESSING_DEFAULT;
  const tiers = [
    {
      key: "tier1" as const,
      patrons: g(i.tiers.tier1.patrons),
      price: g(i.tiers.tier1.price),
    },
    {
      key: "tier2" as const,
      patrons: g(i.tiers.tier2.patrons),
      price: g(i.tiers.tier2.price),
    },
    {
      key: "tier3" as const,
      patrons: g(i.tiers.tier3.patrons),
      price: g(i.tiers.tier3.price),
    },
  ];
  let gross = 0;
  let platformFee = 0;
  let processingFee = 0;
  const perTier = { tier1: 0, tier2: 0, tier3: 0 };
  for (const t of tiers) {
    const tierGross = t.patrons * t.price;
    const tierPlatform = tierGross * planRate;
    // per pledge: price * percent + fixed; summed over patrons ->
    // tierGross * percent + patrons * fixed
    const tierProcessing =
      tierGross * processing.percent +
      t.patrons * processing.fixedPerTransaction;
    const tierNet = tierGross - tierPlatform - tierProcessing;
    gross += tierGross;
    platformFee += tierPlatform;
    processingFee += tierProcessing;
    perTier[t.key] = tierNet > 0 ? tierNet : 0;
  }
  let net = gross - platformFee - processingFee;
  if (net < 0) net = 0;
  const annual = net * 12;
  const effectiveRate = gross > 0 ? (gross - net) / gross : 0;
  return {
    gross,
    platformFee,
    processingFee,
    net,
    annual,
    effectiveRate,
    perTier,
  };
}

export function patreonPatronsForGoal(
  goalUsd: number,
  tierPrice: number,
  plan: keyof typeof PATREON_PLAN_RATES,
  processing: {
    percent: number;
    fixedPerTransaction: number;
  } = PATREON_PROCESSING_DEFAULT,
): number {
  if (!Number.isFinite(goalUsd) || goalUsd <= 0) return 0;
  const price = g(tierPrice);
  if (price <= 0) return 0;
  const planRate = PATREON_PLAN_RATES[plan] ?? PATREON_PLAN_RATES.standard;
  const netPerPatron =
    price -
    price * planRate -
    (price * processing.percent + processing.fixedPerTransaction);
  if (netPerPatron <= 0) return 0;
  return Math.ceil(goalUsd / netPerPatron);
}
