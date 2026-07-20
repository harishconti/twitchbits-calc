import {
  KICK_SUB_PRICES,
  KICK_SPLIT_DEFAULT,
  KICKS_FACE_USD_PER_100,
} from "../../data/kickConfig";
import { MIN_WAGE_USD_HOURLY } from "../../data/adConfig";

export interface KickRevenueInput {
  subs: { tier1: number; tier2: number; tier3: number; gift: number };
  split: number; // 0.95 default
  kicks: number; // KICKs received
  ads: { cpm: number; minutes: number; viewers: number };
}

export interface KickRevenueResult {
  monthly: { subs: number; kicks: number; ads: number; total: number };
  annual: { subs: number; kicks: number; ads: number; total: number };
  hourlyEquivalent: number;
  minWageMultiple: number;
  subsBreakdown: {
    tier1: number;
    tier2: number;
    tier3: number;
    gift: number;
    total: number;
  };
}

const g = (n: number): number => (Number.isFinite(n) && n >= 0 ? n : 0);

export function estimateKickRevenue(i: KickRevenueInput): KickRevenueResult {
  const split = i.split > 0 && i.split <= 1 ? i.split : KICK_SPLIT_DEFAULT;
  const rawSubs = {
    tier1: g(i.subs.tier1) * KICK_SUB_PRICES.tier1,
    tier2: g(i.subs.tier2) * KICK_SUB_PRICES.tier2,
    tier3: g(i.subs.tier3) * KICK_SUB_PRICES.tier3,
    gift: g(i.subs.gift) * KICK_SUB_PRICES.tier1,
  };
  const subsUsd =
    (rawSubs.tier1 + rawSubs.tier2 + rawSubs.tier3 + rawSubs.gift) * split;
  const kicksUsd = g(i.kicks) * (KICKS_FACE_USD_PER_100 / 100) * split; // 95/5 applies to Kicks
  const adsUsd = g(i.ads.cpm) * (g(i.ads.minutes) / 1000) * g(i.ads.viewers); // 100% to streamer, no split
  const monthlyTotal = subsUsd + kicksUsd + adsUsd;
  const hoursPerMonth = 120;
  const hourlyEquivalent = monthlyTotal / hoursPerMonth;
  return {
    monthly: {
      subs: subsUsd,
      kicks: kicksUsd,
      ads: adsUsd,
      total: monthlyTotal,
    },
    annual: {
      subs: subsUsd * 12,
      kicks: kicksUsd * 12,
      ads: adsUsd * 12,
      total: monthlyTotal * 12,
    },
    hourlyEquivalent,
    minWageMultiple: hourlyEquivalent / MIN_WAGE_USD_HOURLY,
    subsBreakdown: {
      tier1: rawSubs.tier1 * split,
      tier2: rawSubs.tier2 * split,
      tier3: rawSubs.tier3 * split,
      gift: rawSubs.gift * split,
      total: subsUsd,
    },
  };
}

export function kickSubsForGoal(
  goalUsd: number,
  split: number = KICK_SPLIT_DEFAULT,
): number {
  if (!Number.isFinite(goalUsd) || goalUsd <= 0) return 0;
  if (!Number.isFinite(split) || split <= 0 || split > 1)
    split = KICK_SPLIT_DEFAULT;
  const perSub = KICK_SUB_PRICES.tier1 * split;
  return Math.ceil(goalUsd / perSub);
}
