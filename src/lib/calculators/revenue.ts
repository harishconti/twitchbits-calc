import { SUB_PRICES } from "../../data/subConfig";
import { MIN_WAGE_USD_HOURLY } from "../../data/adConfig";
import { BITS_RATE_USD } from "../../data/bitsConfig";

export interface RevenueInput {
  subs: {
    tier1: number;
    tier2: number;
    tier3: number;
    prime: number;
    gift: number;
  };
  split: number; // share the streamer keeps (0.5 default)
  bits: number;
  ads: { cpm: number; minutes: number; viewers: number };
}
const g = (n: number) => (Number.isFinite(n) && n >= 0 ? n : 0);

export function estimateRevenue(i: RevenueInput) {
  const split = i.split > 0 && i.split <= 1 ? i.split : 0.5;
  const rawSubs = {
    tier1: g(i.subs.tier1) * SUB_PRICES.tier1,
    tier2: g(i.subs.tier2) * SUB_PRICES.tier2,
    tier3: g(i.subs.tier3) * SUB_PRICES.tier3,
    prime: g(i.subs.prime) * SUB_PRICES.tier1,
    gift: g(i.subs.gift) * SUB_PRICES.tier1,
  };
  const subsUsd =
    (rawSubs.tier1 +
      rawSubs.tier2 +
      rawSubs.tier3 +
      rawSubs.prime +
      rawSubs.gift) *
    split;
  const bitsUsd = g(i.bits) * BITS_RATE_USD;
  const adsUsd = g(i.ads.cpm) * (g(i.ads.minutes) / 1000) * g(i.ads.viewers);
  const monthlyTotal = subsUsd + bitsUsd + adsUsd;
  const annual = {
    subs: subsUsd * 12,
    bits: bitsUsd * 12,
    ads: adsUsd * 12,
    total: monthlyTotal * 12,
  };
  // assume ~120 streaming hours/month for hourly equivalent
  const hoursPerMonth = 120;
  const hourlyEquivalent = monthlyTotal / hoursPerMonth;
  return {
    monthly: { subs: subsUsd, bits: bitsUsd, ads: adsUsd, total: monthlyTotal },
    annual,
    hourlyEquivalent,
    minWageMultiple: hourlyEquivalent / MIN_WAGE_USD_HOURLY,
    subsBreakdown: {
      tier1: rawSubs.tier1 * split,
      tier2: rawSubs.tier2 * split,
      tier3: rawSubs.tier3 * split,
      prime: rawSubs.prime * split,
      gift: rawSubs.gift * split,
      total: subsUsd,
    },
  };
}

// How many tier-1-equivalent subs are needed to hit a monthly USD goal?
export function subsForGoal(goalUsd: number, split = 0.5): number {
  if (!Number.isFinite(goalUsd) || goalUsd <= 0) return 0;
  if (split <= 0 || split > 1) split = 0.5;
  const perSub = SUB_PRICES.tier1 * split;
  return Math.ceil(goalUsd / perSub);
}
