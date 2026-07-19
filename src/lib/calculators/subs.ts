import { SUB_PRICES } from "../../data/subConfig";

export interface SubRevenueInput {
  tier1: number;
  tier2: number;
  tier3: number;
  prime: number;
  gift: number;
  split: number; // share the streamer keeps
}

const g = (n: number) => (Number.isFinite(n) && n >= 0 ? n : 0);

export function estimateSubRevenue(i: SubRevenueInput) {
  const split = i.split > 0 && i.split <= 1 ? i.split : 0.5;
  const raw = {
    tier1: g(i.tier1) * SUB_PRICES.tier1,
    tier2: g(i.tier2) * SUB_PRICES.tier2,
    tier3: g(i.tier3) * SUB_PRICES.tier3,
    prime: g(i.prime) * SUB_PRICES.tier1,
    gift: g(i.gift) * SUB_PRICES.tier1,
  };
  const monthly = {
    tier1: raw.tier1 * split,
    tier2: raw.tier2 * split,
    tier3: raw.tier3 * split,
    prime: raw.prime * split,
    gift: raw.gift * split,
    total: (raw.tier1 + raw.tier2 + raw.tier3 + raw.prime + raw.gift) * split,
  };
  const annualTotal = monthly.total * 12;
  const hoursPerMonth = 120; // assume ~120 streaming hours/month
  const hourlyEquivalent = monthly.total / hoursPerMonth;
  return {
    monthly,
    annualTotal,
    hourlyEquivalent,
    rawCount: {
      tier1: g(i.tier1),
      tier2: g(i.tier2),
      tier3: g(i.tier3),
      prime: g(i.prime),
      gift: g(i.gift),
      total: g(i.tier1) + g(i.tier2) + g(i.tier3) + g(i.prime) + g(i.gift),
    },
  };
}

// How many Tier-1-equivalent subs are needed to hit a monthly USD goal?
export function subsForGoal(goalUsd: number, split = 0.5): number {
  if (!Number.isFinite(goalUsd) || goalUsd <= 0) return 0;
  if (split <= 0 || split > 1) split = 0.5;
  const perSub = SUB_PRICES.tier1 * split;
  return Math.ceil(goalUsd / perSub);
}

export function subBulkTable(
  split = 0.5,
  counts: number[] = [1, 10, 50, 100, 250, 500, 1000],
) {
  return counts.map((count) => ({
    count,
    monthly: count * SUB_PRICES.tier1 * split,
    annual: count * SUB_PRICES.tier1 * split * 12,
  }));
}
