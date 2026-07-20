import { describe, it, expect } from "vitest";
import { bitsToUsd, usdToBits, bulkTable } from "../src/lib/calculators/bits";
import { estimateRevenue, subsForGoal } from "../src/lib/calculators/revenue";
import {
  coinsToUsd,
  diamondsToUsd,
  usdToCoins,
  coinsToDiamonds,
  usdToDiamonds,
} from "../src/lib/calculators/tiktok";
import {
  earningsFromViews,
  rangeFromRpm,
  adjustedRpm,
} from "../src/lib/calculators/youtube";
import {
  estimateSubRevenue,
  subsForGoal,
  subBulkTable,
} from "../src/lib/calculators/subs";
import {
  estimateSponsorship,
  sponsorshipByFollowers,
} from "../src/lib/calculators/sponsorship";
import {
  estimateKickRevenue,
  kickSubsForGoal,
} from "../src/lib/calculators/kick";
import { estimateAdRevenue } from "../src/lib/calculators/ads";
import {
  estimatePatreonRevenue,
  patreonPatronsForGoal,
} from "../src/lib/calculators/patreon";
import {
  estimateSpotifyRoyalties,
  spotifyStreamsForGoal,
} from "../src/lib/calculators/spotify";
import { estimateNetIncome } from "../src/lib/calculators/netIncome";
import {
  applyCpmModifiers,
  NEUTRAL,
  seasonFactor,
  nicheFactor,
  skippableFactor,
} from "../src/lib/calculators/cpmModifiers";

describe("bits calculator", () => {
  it("converts bits to USD at $0.01/Bits", () => {
    expect(bitsToUsd(1000)).toBe(10);
    expect(bitsToUsd(100)).toBe(1);
  });
  it("converts USD to bits (rounded)", () => {
    expect(usdToBits(10)).toBe(1000);
    expect(usdToBits(1)).toBe(100);
  });
  it("guards invalid/negative input", () => {
    expect(bitsToUsd(NaN)).toBe(0);
    expect(bitsToUsd(-5)).toBe(0);
    expect(bitsToUsd(Infinity)).toBe(0);
    expect(usdToBits(-1)).toBe(0);
  });
  it("applies region FX rate for non-USD", () => {
    // 1000 bits = $10 USD; GBP rate 0.79 → £7.90
    expect(bitsToUsd(1000, "gb")).toBeCloseTo(7.9, 2);
  });
  it("returns bulk rows with usd equivalents", () => {
    const rows = bulkTable();
    expect(rows).toHaveLength(10);
    expect(rows[4]).toEqual({ bits: 1000, usd: 10 });
  });
});

describe("revenue calculator", () => {
  it("computes monthly revenue from subs + bits + ads", () => {
    const r = estimateRevenue({
      subs: { tier1: 50, tier2: 0, tier3: 0, prime: 5, gift: 0 },
      split: 0.5,
      bits: 5000,
      ads: { cpm: 2, minutes: 120, viewers: 50 },
    });
    // subs: 50 * 4.99 * 0.5 + 5 * 4.99 * 0.5 = 124.75 + 12.475 = 137.225
    // bits: 5000 * 0.01 = 50
    // ads: 2 * (120/1000) * 50 = 12
    expect(r.monthly.subs).toBeCloseTo(137.225, 2);
    expect(r.monthly.bits).toBe(50);
    expect(r.monthly.ads).toBe(12);
    expect(r.monthly.total).toBeCloseTo(199.225, 2);
    expect(r.annual.total).toBeCloseTo(199.225 * 12, 2);
  });

  it("guards negative inputs", () => {
    const r = estimateRevenue({
      subs: { tier1: -5, tier2: 0, tier3: 0, prime: 0, gift: 0 },
      split: 0.5,
      bits: -10,
      ads: { cpm: -1, minutes: 0, viewers: 0 },
    });
    expect(r.monthly.total).toBe(0);
  });

  it("snapshots a typical partner estimate", () => {
    expect(
      estimateRevenue({
        subs: { tier1: 200, tier2: 10, tier3: 2, prime: 20, gift: 5 },
        split: 0.7,
        bits: 50000,
        ads: { cpm: 4, minutes: 300, viewers: 150 },
      }),
    ).toMatchSnapshot();
  });

  it("breaks down sub revenue by tier", () => {
    const r = estimateRevenue({
      subs: { tier1: 10, tier2: 5, tier3: 1, prime: 2, gift: 1 },
      split: 0.5,
      bits: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    expect(r.subsBreakdown.tier1).toBeCloseTo(10 * 4.99 * 0.5, 2);
    expect(r.subsBreakdown.tier2).toBeCloseTo(5 * 9.99 * 0.5, 2);
    expect(r.subsBreakdown.tier3).toBeCloseTo(1 * 24.99 * 0.5, 2);
    expect(r.subsBreakdown.total).toBeCloseTo(r.monthly.subs, 2);
  });

  it("calculates subs needed for a monthly goal", () => {
    // At 50/50 split, each tier-1 sub pays the streamer $2.495.
    // $1,000 / $2.495 ≈ 401 → ceil 401.
    expect(subsForGoal(1000, 0.5)).toBe(401);
    expect(subsForGoal(0, 0.5)).toBe(0);
  });
});

describe("tiktok calculator", () => {
  it("converts coins to USD at the creator payout rate", () => {
    // 1 coin ≈ $0.0105 viewer cost; creator earns ~half via diamonds.
    expect(coinsToUsd(1000)).toBeGreaterThan(0);
    expect(usdToCoins(coinsToUsd(1000))).toBe(1000);
  });
  it("diamonds to USD", () => {
    expect(diamondsToUsd(1000)).toBeCloseTo(5, 0); // ~$0.005/diamond
  });
  it("converts coins to diamonds and USD to diamonds", () => {
    expect(coinsToDiamonds(100)).toBe(50);
    expect(usdToDiamonds(5)).toBe(1000); // $5 / $0.005 per diamond
  });
  it("guards bad input", () => {
    expect(coinsToUsd(-1)).toBe(0);
    expect(diamondsToUsd(NaN)).toBe(0);
  });
});

describe("youtube calculator", () => {
  it("earnings = rpm * views / 1000", () => {
    expect(earningsFromViews(10_000, 4)).toBe(40);
  });
  it("returns a low–high range from rpm bounds", () => {
    const r = rangeFromRpm(10_000, 2, 8);
    expect(r.low).toBe(20);
    expect(r.high).toBe(80);
  });
  it("adjusts rpm by format and country factors", () => {
    const r = adjustedRpm(2, 8, 0.12, 0.82); // Shorts in UK
    expect(r.low).toBeCloseTo(0.1968, 3); // 2 * 0.12 * 0.82 per 1k
    expect(r.high).toBeCloseTo(0.7872, 3); // 8 * 0.12 * 0.82 per 1k
  });
  it("guards bad input", () => {
    expect(earningsFromViews(-1, 4)).toBe(0);
    expect(earningsFromViews(1000, NaN)).toBe(0);
  });
});

describe("sub revenue calculator", () => {
  it("computes monthly sub revenue by tier", () => {
    const r = estimateSubRevenue({
      tier1: 100,
      tier2: 10,
      tier3: 2,
      prime: 5,
      gift: 0,
      split: 0.5,
    });
    expect(r.monthly.tier1).toBeCloseTo(100 * 4.99 * 0.5, 2);
    expect(r.monthly.tier2).toBeCloseTo(10 * 9.99 * 0.5, 2);
    expect(r.monthly.tier3).toBeCloseTo(2 * 24.99 * 0.5, 2);
    expect(r.monthly.total).toBeCloseTo(
      (100 * 4.99 + 10 * 9.99 + 2 * 24.99 + 5 * 4.99) * 0.5,
      2,
    );
  });

  it("guards negative inputs", () => {
    const r = estimateSubRevenue({
      tier1: -10,
      tier2: 0,
      tier3: 0,
      prime: 0,
      gift: 0,
      split: 0.5,
    });
    expect(r.monthly.total).toBe(0);
  });

  it("snapshots a typical partner sub mix", () => {
    expect(
      estimateSubRevenue({
        tier1: 250,
        tier2: 25,
        tier3: 5,
        prime: 15,
        gift: 10,
        split: 0.7,
      }),
    ).toMatchSnapshot();
  });

  it("calculates tier-1 subs needed for a monthly goal", () => {
    expect(subsForGoal(1000, 0.5)).toBe(401);
    expect(subsForGoal(0, 0.5)).toBe(0);
  });

  it("returns a bulk sub reference table", () => {
    const rows = subBulkTable(0.5, [10, 100, 1000]);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual({ count: 100, monthly: 249.5, annual: 2994 });
  });
});

describe("sponsorship calculator", () => {
  it("estimates a brand deal range from followers and engagement", () => {
    const est = estimateSponsorship({
      followers: 50_000,
      engagement: 2.5,
      niche: "Gaming / Tech",
      region: "us",
      deliverable: "integration",
    });
    expect(est.low).toBeGreaterThan(0);
    expect(est.high).toBeGreaterThan(est.low);
    expect(est.reached).toBeGreaterThan(0);
  });

  it("increases estimate with higher engagement", () => {
    const lowEng = estimateSponsorship({
      followers: 100_000,
      engagement: 1,
      niche: "Gaming / Tech",
      region: "us",
      deliverable: "shoutout",
    });
    const highEng = estimateSponsorship({
      followers: 100_000,
      engagement: 8,
      niche: "Gaming / Tech",
      region: "us",
      deliverable: "shoutout",
    });
    expect(highEng.mid).toBeGreaterThan(lowEng.mid);
  });

  it("guards invalid inputs", () => {
    const est = estimateSponsorship({
      followers: -5000,
      engagement: NaN,
      niche: "Gaming / Tech",
      region: "us",
      deliverable: "shoutout",
    });
    expect(est.low).toBe(0);
    expect(est.high).toBe(0);
  });

  it("returns a follower rate card", () => {
    const rows = sponsorshipByFollowers(
      100_000,
      "Gaming / Tech",
      "us",
      "shoutout",
      [1000, 10000, 100000],
    );
    expect(rows).toHaveLength(3);
    expect(rows[2].followers).toBe(100000);
    expect(rows[2].low).toBeGreaterThan(0);
  });
});

describe("kick revenue calculator", () => {
  it("computes monthly revenue from subs + kicks + ads at 95/5", () => {
    const r = estimateKickRevenue({
      subs: { tier1: 50, tier2: 0, tier3: 0, gift: 0 },
      split: 0.95,
      kicks: 10000, // 100 KICKs = $1.09 face → 10000/100 * 1.09 * 0.95 = 103.55
      ads: { cpm: 4, minutes: 120, viewers: 50 }, // 4 * (120/1000) * 50 = 24 (no split)
    });
    // subs: 50 * 4.99 * 0.95 = 237.025
    expect(r.monthly.subs).toBeCloseTo(237.025, 2);
    expect(r.monthly.kicks).toBeCloseTo(103.55, 2);
    expect(r.monthly.ads).toBeCloseTo(24, 2);
    expect(r.monthly.total).toBeCloseTo(237.025 + 103.55 + 24, 2);
  });

  it("defaults split to 95/5 when split is invalid", () => {
    const a = estimateKickRevenue({
      subs: { tier1: 10, tier2: 0, tier3: 0, gift: 0 },
      split: NaN,
      kicks: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    const b = estimateKickRevenue({
      subs: { tier1: 10, tier2: 0, tier3: 0, gift: 0 },
      split: 0.95,
      kicks: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    expect(a.monthly.subs).toBeCloseTo(b.monthly.subs, 4); // 10 * 4.99 * 0.95 = 47.405
    expect(a.monthly.subs).toBeCloseTo(47.405, 2);
  });

  it("clamps split > 1 to the default", () => {
    const r = estimateKickRevenue({
      subs: { tier1: 10, tier2: 0, tier3: 0, gift: 0 },
      split: 2,
      kicks: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    expect(r.monthly.subs).toBeCloseTo(47.405, 2); // default 0.95 applied
  });

  it("clamps split <= 0 to the default", () => {
    const r = estimateKickRevenue({
      subs: { tier1: 10, tier2: 0, tier3: 0, gift: 0 },
      split: 0,
      kicks: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    expect(r.monthly.subs).toBeCloseTo(47.405, 2);
  });

  it("guards NaN/negative/Infinity inputs to 0", () => {
    const r = estimateKickRevenue({
      subs: { tier1: -5, tier2: NaN, tier3: Infinity, gift: -1 },
      split: 0.95,
      kicks: -100,
      ads: { cpm: -1, minutes: NaN, viewers: Infinity },
    });
    expect(r.monthly.total).toBe(0);
    expect(r.monthly.subs).toBe(0);
    expect(r.monthly.kicks).toBe(0);
    expect(r.monthly.ads).toBe(0);
  });

  it("treats gift subs as tier-1 price", () => {
    const r = estimateKickRevenue({
      subs: { tier1: 0, tier2: 0, tier3: 0, gift: 10 },
      split: 0.95,
      kicks: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    expect(r.monthly.subs).toBeCloseTo(10 * 4.99 * 0.95, 2); // 47.405
    expect(r.subsBreakdown.gift).toBeCloseTo(47.405, 2);
  });

  it("does not apply split to ads (Kick pays 100% on ads)", () => {
    const lowSplit = estimateKickRevenue({
      subs: { tier1: 0, tier2: 0, tier3: 0, gift: 0 },
      split: 0.5,
      kicks: 0,
      ads: { cpm: 4, minutes: 120, viewers: 50 },
    });
    const highSplit = estimateKickRevenue({
      subs: { tier1: 0, tier2: 0, tier3: 0, gift: 0 },
      split: 1.0,
      kicks: 0,
      ads: { cpm: 4, minutes: 120, viewers: 50 },
    });
    expect(lowSplit.monthly.ads).toBe(24);
    expect(highSplit.monthly.ads).toBe(24);
  });

  it("annual equals monthly times 12", () => {
    const r = estimateKickRevenue({
      subs: { tier1: 50, tier2: 0, tier3: 0, gift: 0 },
      split: 0.95,
      kicks: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    expect(r.annual.subs).toBeCloseTo(r.monthly.subs * 12, 4);
    expect(r.annual.total).toBeCloseTo(r.monthly.total * 12, 4);
  });

  it("breakdown tiers sum to monthly subs", () => {
    const r = estimateKickRevenue({
      subs: { tier1: 10, tier2: 5, tier3: 1, gift: 2 },
      split: 0.95,
      kicks: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    const sum =
      r.subsBreakdown.tier1 +
      r.subsBreakdown.tier2 +
      r.subsBreakdown.tier3 +
      r.subsBreakdown.gift;
    expect(sum).toBeCloseTo(r.monthly.subs, 4);
    expect(r.subsBreakdown.total).toBeCloseTo(r.monthly.subs, 4);
  });

  it("computes hourlyEquivalent and minWageMultiple over 120 hrs/month", () => {
    const r = estimateKickRevenue({
      subs: { tier1: 50, tier2: 0, tier3: 0, gift: 0 },
      split: 0.95,
      kicks: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    expect(r.hourlyEquivalent).toBeCloseTo(r.monthly.total / 120, 6);
    expect(r.minWageMultiple).toBeCloseTo(r.hourlyEquivalent / 7.25, 6);
  });

  it("kickSubsForGoal ceils tier-1 subs needed at the given split", () => {
    // $1000 / (4.99 * 0.95) = 1000 / 4.7405 ≈ 210.95 → ceil 211
    expect(kickSubsForGoal(1000, 0.95)).toBe(211);
    expect(kickSubsForGoal(0, 0.95)).toBe(0);
    expect(kickSubsForGoal(-50, 0.95)).toBe(0);
  });

  it("kickSubsForGoal clamps invalid split to default 0.95", () => {
    expect(kickSubsForGoal(1000, 2)).toBe(211);
    expect(kickSubsForGoal(1000, 0)).toBe(211);
    expect(kickSubsForGoal(1000, NaN)).toBe(211);
  });
});

describe("ad revenue calculator", () => {
  it("computes monthly ad revenue from impressions", () => {
    // impressionsPerStream = 3 ads/hr * 4 hrs * 50 viewers = 600
    // monthlyImpressions = 600 * 20 streams = 12000
    // monthly = (12000 / 1000) * 4 CPM = 48
    const r = estimateAdRevenue({
      cpm: 4,
      viewers: 50,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 20,
    });
    expect(r.impressionsPerStream).toBe(600);
    expect(r.monthlyImpressions).toBe(12000);
    expect(r.monthly).toBeCloseTo(48, 2);
    expect(r.annual).toBeCloseTo(48 * 12, 2);
  });

  it("guards NaN/negative/Infinity inputs to 0", () => {
    const r = estimateAdRevenue({
      cpm: -1,
      viewers: NaN,
      adsPerHour: Infinity,
      hoursPerStream: -2,
      streamsPerMonth: NaN,
    });
    expect(r.impressionsPerStream).toBe(0);
    expect(r.monthlyImpressions).toBe(0);
    expect(r.monthly).toBe(0);
    expect(r.annual).toBe(0);
  });

  it("monthly is proportional to CPM", () => {
    const low = estimateAdRevenue({
      cpm: 2,
      viewers: 50,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 20,
    });
    const high = estimateAdRevenue({
      cpm: 8,
      viewers: 50,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 20,
    });
    expect(high.monthly).toBeCloseTo(low.monthly * 4, 4);
  });

  it("annual equals monthly times 12", () => {
    const r = estimateAdRevenue({
      cpm: 4,
      viewers: 50,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 20,
    });
    expect(r.annual).toBeCloseTo(r.monthly * 12, 4);
  });

  it("rpmPerViewer is monthly revenue per average viewer", () => {
    const r = estimateAdRevenue({
      cpm: 4,
      viewers: 50,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 20,
    });
    // monthly 48 / 50 viewers = 0.96
    expect(r.rpmPerViewer).toBeCloseTo(0.96, 4);
  });

  it("rpmPerViewer is 0 when viewers is 0 (no division by zero)", () => {
    const r = estimateAdRevenue({
      cpm: 4,
      viewers: 0,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 20,
    });
    expect(r.monthly).toBe(0); // 0 viewers → 0 impressions → 0 revenue
    expect(r.rpmPerViewer).toBe(0);
  });

  it("monthly scales with streams per month", () => {
    const r10 = estimateAdRevenue({
      cpm: 4,
      viewers: 50,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 10,
    });
    const r40 = estimateAdRevenue({
      cpm: 4,
      viewers: 50,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 40,
    });
    expect(r40.monthly).toBeCloseTo(r10.monthly * 4, 4);
  });

  it("default inputs produce a sane positive monthly estimate", () => {
    const r = estimateAdRevenue({
      cpm: 4,
      viewers: 50,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 20,
    });
    expect(r.monthly).toBeGreaterThan(0);
    expect(r.impressionsPerStream).toBeGreaterThan(0);
  });
});

describe("patreon revenue calculator", () => {
  it("computes net = gross - platform fee - processing for a single tier at standard plan", () => {
    const r = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "standard",
    });
    // gross 500, platform 50, processing 500*0.029 + 100*0.30 = 14.50 + 30 = 44.50
    expect(r.gross).toBeCloseTo(500, 2);
    expect(r.platformFee).toBeCloseTo(50, 2);
    expect(r.processingFee).toBeCloseTo(44.5, 2);
    expect(r.net).toBeCloseTo(405.5, 2);
  });

  it("applies the legacy Pro 8% plan rate when selected", () => {
    const r = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "pro",
    });
    // platform 500 * 0.08 = 40
    expect(r.platformFee).toBeCloseTo(40, 2);
  });

  it("falls back to standard 10% for an invalid plan", () => {
    const r = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "nonexistent" as any,
    });
    expect(r.platformFee).toBeCloseTo(50, 2);
  });

  it("sums gross, fees, and net across all three tiers", () => {
    const r = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 50, price: 10 },
        tier3: { patrons: 20, price: 25 },
      },
      plan: "standard",
    });
    // gross = 500 + 500 + 500 = 1500
    expect(r.gross).toBeCloseTo(1500, 2);
    // platform = 1500 * 0.10 = 150
    expect(r.platformFee).toBeCloseTo(150, 2);
    // processing = (14.50 + 30) + (14.50 + 15) + (14.50 + 6) = 94.50
    expect(r.processingFee).toBeCloseTo(94.5, 2);
    expect(r.net).toBeCloseTo(1500 - 150 - 94.5, 2);
  });

  it("annual is net x 12", () => {
    const r = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "standard",
    });
    expect(r.annual).toBeCloseTo(r.net * 12, 4);
  });

  it("effectiveRate is (gross - net) / gross", () => {
    const r = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "standard",
    });
    expect(r.effectiveRate).toBeCloseTo((500 - 405.5) / 500, 4);
  });

  it("perTier nets sum to total net", () => {
    const r = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 50, price: 10 },
        tier3: { patrons: 20, price: 25 },
      },
      plan: "standard",
    });
    expect(r.perTier.tier1 + r.perTier.tier2 + r.perTier.tier3).toBeCloseTo(
      r.net,
      4,
    );
  });

  it("guards NaN/negative/Infinity patrons and price to 0", () => {
    const r = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: NaN, price: 5 },
        tier2: { patrons: -10, price: 10 },
        tier3: { patrons: 20, price: Infinity },
      },
      plan: "standard",
    });
    expect(r.gross).toBe(0);
    expect(r.net).toBe(0);
  });

  it("uses default processing when processing is omitted", () => {
    const a = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "standard",
    });
    const b = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "standard",
      processing: { percent: 0.029, fixedPerTransaction: 0.3 },
    });
    expect(a.net).toBeCloseTo(b.net, 4);
  });

  it("low-tier pledges have a higher effective rate than high-tier", () => {
    const low = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "standard",
    });
    const high = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 20, price: 25 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "standard",
    });
    // low eff ~18.9%, high eff ~14.1%
    expect(low.effectiveRate).toBeGreaterThan(high.effectiveRate);
  });

  it("patreonPatronsForGoal returns 0 for goal <= 0", () => {
    expect(patreonPatronsForGoal(0, 5, "standard")).toBe(0);
    expect(patreonPatronsForGoal(-100, 5, "standard")).toBe(0);
  });

  it("patreonPatronsForGoal returns 0 when net per patron <= 0", () => {
    expect(patreonPatronsForGoal(1000, 0, "standard")).toBe(0);
  });

  it("patreonPatronsForGoal ceils the patrons needed", () => {
    // netPerPatron at $5 standard = 5 - 0.50 - (0.145 + 0.30) = 4.055; 1000/4.055 = 246.61 -> 247
    expect(patreonPatronsForGoal(1000, 5, "standard")).toBe(247);
  });
});

describe("spotify royalties calculator", () => {
  it("computes gross = streams x rate, net = gross x share/100 for US", () => {
    const r = estimateSpotifyRoyalties({
      streams: 100000,
      region: "us",
      creatorShare: 70,
    });
    expect(r.gross).toBeCloseTo(100000 * 0.0044, 4); // 440
    expect(r.net).toBeCloseTo(440 * 0.7, 4); // 308
  });

  it("annual is net x 12", () => {
    const r = estimateSpotifyRoyalties({
      streams: 100000,
      region: "us",
      creatorShare: 70,
    });
    expect(r.annual).toBeCloseTo(r.net * 12, 4);
  });

  it("per1000 is rate x 1000 x share/100", () => {
    const r = estimateSpotifyRoyalties({
      streams: 100000,
      region: "us",
      creatorShare: 70,
    });
    expect(r.per1000).toBeCloseTo(0.0044 * 1000 * 0.7, 4); // 3.08
  });

  it("resolves each region to its sourced rate", () => {
    const cases = [
      { region: "us", rate: 0.0044 },
      { region: "uk", rate: 0.0044 },
      { region: "eu", rate: 0.004 },
      { region: "canada", rate: 0.004 },
      { region: "nordic", rate: 0.0066 },
      { region: "latin_america", rate: 0.0019 },
      { region: "india", rate: 0.0008 },
      { region: "global", rate: 0.003 },
    ] as const;
    for (const c of cases) {
      const r = estimateSpotifyRoyalties({
        streams: 1000,
        region: c.region,
        creatorShare: 100,
      });
      expect(r.gross).toBeCloseTo(1000 * c.rate, 6);
      expect(r.rate).toBeCloseTo(c.rate, 6);
    }
  });

  it("falls back to global for an invalid region", () => {
    const r = estimateSpotifyRoyalties({
      streams: 1000,
      region: "mars" as any,
      creatorShare: 100,
    });
    expect(r.rate).toBeCloseTo(0.003, 6);
    expect(r.gross).toBeCloseTo(3, 4);
  });

  it("clamps creatorShare > 100 to 100", () => {
    const r = estimateSpotifyRoyalties({
      streams: 1000,
      region: "us",
      creatorShare: 150,
    });
    expect(r.net).toBeCloseTo(r.gross, 4);
  });

  it("guards NaN/negative/Infinity streams to 0", () => {
    const r = estimateSpotifyRoyalties({
      streams: NaN,
      region: "us",
      creatorShare: 70,
    });
    expect(r.gross).toBe(0);
    expect(r.net).toBe(0);
  });

  it("share 0 yields 0 net", () => {
    const r = estimateSpotifyRoyalties({
      streams: 100000,
      region: "us",
      creatorShare: 0,
    });
    expect(r.net).toBe(0);
    expect(r.per1000).toBe(0);
  });

  it("spotifyStreamsForGoal returns 0 for goal <= 0", () => {
    expect(spotifyStreamsForGoal(0, "us", 70)).toBe(0);
    expect(spotifyStreamsForGoal(-500, "us", 70)).toBe(0);
  });

  it("spotifyStreamsForGoal returns 0 when share is 0", () => {
    expect(spotifyStreamsForGoal(1000, "us", 0)).toBe(0);
  });

  it("spotifyStreamsForGoal ceils the streams needed", () => {
    // netPerStream = 0.0044 * 0.70 = 0.00308; 1000/0.00308 = 324675.32 -> 324676
    expect(spotifyStreamsForGoal(1000, "us", 70)).toBe(324676);
  });
});

describe("net income / tax calculator", () => {
  it("US single $60k/$5k: SE tax + QBI + bracket income tax hand-trace", () => {
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "single",
    });
    // netSE 55000; SE base 50792.50; SS 6298.27; Medicare 1472.98; socialTax 7771.25
    expect(r.netSE).toBeCloseTo(55000, 2);
    expect(r.socialTax).toBeCloseTo(7771.25, 2);
    // QBI = 0.20 * (55000 - 7771.25/2) = 0.20 * 51114.37 = 10222.87
    expect(r.qbiDeduction).toBeCloseTo(10222.87, 2);
    // taxable = 55000 - 16100 - 10222.87 = 28677.13
    expect(r.taxableIncome).toBeCloseTo(28677.13, 2);
    // income tax = 0.10*12400 + 0.12*(28677.13-12400) = 1240 + 1953.26 = 3193.26
    expect(r.incomeTax).toBeCloseTo(3193.26, 2);
    expect(r.totalTax).toBeCloseTo(10964.51, 2);
    expect(r.net).toBeCloseTo(44035.49, 2);
    expect(r.effectiveRate).toBeCloseTo(0.1827, 4);
    expect(r.marginalRate).toBeCloseTo(0.12, 2);
    expect(r.currency).toBe("USD");
  });

  it("UK £60k/£5k: Class 4 NIC two bands + England bands hand-trace", () => {
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "uk",
    });
    // Class 4: 0.06*(50270-12570) + 0.02*(55000-50270) = 2262 + 94.60 = 2356.60
    expect(r.socialTax).toBeCloseTo(2356.6, 2);
    // personalAllowance 12570; taxable 42430; IT = 0.20*37700 + 0.40*4730 = 9432
    expect(r.taxableIncome).toBeCloseTo(42430, 2);
    expect(r.incomeTax).toBeCloseTo(9432, 2);
    expect(r.totalTax).toBeCloseTo(11788.6, 2);
    expect(r.net).toBeCloseTo(43211.4, 2);
    expect(r.effectiveRate).toBeCloseTo(0.1965, 4);
    expect(r.marginalRate).toBeCloseTo(0.4, 2);
    expect(r.currency).toBe("GBP");
  });

  it("CA C$60k/C$5k: self-employed CPP 11.9% + 14% first bracket", () => {
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "ca",
    });
    // CPP = 0.119 * min(55000, 74600) = 6545
    expect(r.socialTax).toBeCloseTo(6545, 2);
    // BPA 16452; taxable 38548; IT = 0.14*38548 = 5396.72
    expect(r.taxableIncome).toBeCloseTo(38548, 2);
    expect(r.incomeTax).toBeCloseTo(5396.72, 2);
    expect(r.totalTax).toBeCloseTo(11941.72, 2);
    expect(r.net).toBeCloseTo(43058.28, 2);
    expect(r.effectiveRate).toBeCloseTo(0.199, 4);
    expect(r.marginalRate).toBeCloseTo(0.14, 2);
    expect(r.currency).toBe("CAD");
  });

  it("AU A$60k/A$5k: Medicare 2% + 0%/16%/30% brackets hand-trace", () => {
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "au",
    });
    // Medicare = 0.02 * 55000 = 1100; no allowance; taxable 55000
    expect(r.socialTax).toBeCloseTo(1100, 2);
    expect(r.taxableIncome).toBeCloseTo(55000, 2);
    // IT = 0.16*(45000-18200) + 0.30*(55000-45000) = 4288 + 3000 = 7288
    expect(r.incomeTax).toBeCloseTo(7288, 2);
    expect(r.totalTax).toBeCloseTo(8388, 2);
    expect(r.net).toBeCloseTo(46612, 2);
    expect(r.effectiveRate).toBeCloseTo(0.1398, 4);
    expect(r.marginalRate).toBeCloseTo(0.3, 2);
    expect(r.currency).toBe("AUD");
  });

  it("US MFJ: higher standard deduction lowers tax vs single", () => {
    const single = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "single",
    });
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "mfj",
    });
    // SE tax is filing-status-independent
    expect(r.socialTax).toBeCloseTo(7771.25, 2);
    // MFJ: taxable = 55000 - 32200 - 10222.87 = 12577.13; IT = 0.10*12577.13 = 1257.71
    expect(r.taxableIncome).toBeCloseTo(12577.13, 2);
    expect(r.incomeTax).toBeCloseTo(1257.71, 2);
    expect(r.marginalRate).toBeCloseTo(0.1, 2);
    // married benefit: MFJ net (~45971) > single net (~44035)
    expect(r.net).toBeCloseTo(45971.04, 1);
    expect(r.net).toBeGreaterThan(single.net);
  });

  it("overrideRate replaces the bracket engine with a flat tax", () => {
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "single",
      overrideRate: 15,
    });
    // overrideTax = 0.15 * 28677.13 = 4301.57; incomeTax = overrideTax
    expect(r.overrideTax).toBeCloseTo(4301.57, 2);
    expect(r.incomeTax).toBeCloseTo(4301.57, 2);
    expect(r.totalTax).toBeCloseTo(12072.82, 2);
    expect(r.net).toBeCloseTo(42927.18, 2);
    expect(r.marginalRate).toBeCloseTo(0.15, 2);
  });

  it("guards NaN/negative/Infinity gross and expenses to 0", () => {
    const r = estimateNetIncome({
      gross: NaN,
      expenses: -1000,
      jurisdiction: "us",
    });
    expect(r.gross).toBe(0);
    expect(r.expenses).toBe(0);
    expect(r.netSE).toBe(0);
    expect(r.socialTax).toBe(0);
    expect(r.incomeTax).toBe(0);
    expect(r.net).toBe(0);
  });

  it("falls back to US for an invalid jurisdiction", () => {
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "mars" as any,
    });
    expect(r.currency).toBe("USD");
    expect(r.net).toBeCloseTo(44035.49, 2);
  });

  it("falls back to single for an invalid US filing status", () => {
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "nonexistent" as any,
    });
    expect(r.net).toBeCloseTo(44035.49, 2);
  });

  it("ignores NaN/negative overrideRate and uses brackets", () => {
    const byBrackets = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "single",
    });
    const nanOverride = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "single",
      overrideRate: NaN,
    });
    const negOverride = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "single",
      overrideRate: -5,
    });
    expect(nanOverride.incomeTax).toBeCloseTo(byBrackets.incomeTax, 2);
    expect(nanOverride.overrideTax).toBe(0);
    expect(negOverride.incomeTax).toBeCloseTo(byBrackets.incomeTax, 2);
  });

  it("clamps overrideRate > 100 to 100", () => {
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "single",
      overrideRate: 150,
    });
    // 100% of taxable 28677.13 = 28677.13
    expect(r.overrideTax).toBeCloseTo(28677.13, 2);
    expect(r.incomeTax).toBeCloseTo(28677.13, 2);
    expect(r.marginalRate).toBeCloseTo(1.0, 2);
  });

  it("net is never negative when expenses exceed gross", () => {
    const r = estimateNetIncome({
      gross: 5000,
      expenses: 60000,
      jurisdiction: "us",
    });
    expect(r.netSE).toBe(0);
    expect(r.net).toBe(0);
  });

  it("resolves currency for each jurisdiction", () => {
    expect(
      estimateNetIncome({ gross: 1000, expenses: 0, jurisdiction: "us" })
        .currency,
    ).toBe("USD");
    expect(
      estimateNetIncome({ gross: 1000, expenses: 0, jurisdiction: "uk" })
        .currency,
    ).toBe("GBP");
    expect(
      estimateNetIncome({ gross: 1000, expenses: 0, jurisdiction: "ca" })
        .currency,
    ).toBe("CAD");
    expect(
      estimateNetIncome({ gross: 1000, expenses: 0, jurisdiction: "au" })
        .currency,
    ).toBe("AUD");
  });

  it("breakdown has Gross first, Net last, and a QBI row only for the US", () => {
    const us = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "single",
    });
    expect(us.breakdown[0].label).toBe("Gross");
    expect(us.breakdown[us.breakdown.length - 1].label).toBe("Net");
    expect(us.breakdown.some((row) => row.label === "QBI deduction")).toBe(
      true,
    );
    expect(us.breakdown.some((row) => row.label === "Net SE income")).toBe(
      true,
    );

    const uk = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "uk",
    });
    expect(uk.breakdown.some((row) => row.label === "QBI deduction")).toBe(
      false,
    );
  });
});

describe("cpmModifiers", () => {
  it("neutral selection returns base unchanged", () => {
    expect(applyCpmModifiers(4, NEUTRAL)).toBe(4);
    expect(applyCpmModifiers(0, NEUTRAL)).toBe(0);
  });

  it("applies season factor", () => {
    expect(applyCpmModifiers(4, { ...NEUTRAL, seasonFactor: 1.25 })).toBe(5);
  });

  it("applies niche factor", () => {
    expect(applyCpmModifiers(4, { ...NEUTRAL, nicheFactor: 1.15 })).toBe(4.6);
  });

  it("applies fill rate as a percentage", () => {
    expect(applyCpmModifiers(4, { ...NEUTRAL, fillRatePct: 50 })).toBe(2);
    expect(applyCpmModifiers(4, { ...NEUTRAL, fillRatePct: 100 })).toBe(4);
  });

  it("applies skippability factor", () => {
    expect(applyCpmModifiers(4, { ...NEUTRAL, skippableFactor: 1.25 })).toBe(5);
  });

  it("combines all factors multiplicatively", () => {
    // Q4 (1.25) x non-skippable (1.25) x 80% fill (0.8) = 1.25
    const sel = {
      seasonFactor: 1.25,
      nicheFactor: 1,
      fillRatePct: 80,
      skippableFactor: 1.25,
    };
    expect(applyCpmModifiers(4, sel)).toBeCloseTo(5, 10);
  });

  it("clamps fill rate to 0-100", () => {
    expect(applyCpmModifiers(4, { ...NEUTRAL, fillRatePct: 150 })).toBe(4);
    expect(applyCpmModifiers(4, { ...NEUTRAL, fillRatePct: -10 })).toBe(0);
  });

  it("clamps factors to 0-5", () => {
    expect(applyCpmModifiers(4, { ...NEUTRAL, seasonFactor: 99 })).toBe(20);
  });

  it("guards NaN/negative/Infinity base to 0", () => {
    expect(applyCpmModifiers(NaN, NEUTRAL)).toBe(0);
    expect(applyCpmModifiers(-5, NEUTRAL)).toBe(0);
    expect(applyCpmModifiers(Infinity, NEUTRAL)).toBe(0);
  });

  it("guards NaN factor to neutral", () => {
    expect(applyCpmModifiers(4, { ...NEUTRAL, seasonFactor: NaN })).toBe(4);
  });

  it("resolvers return the correct factor for named keys", () => {
    expect(seasonFactor("q4")).toBe(1.25);
    expect(seasonFactor("q1")).toBe(0.8);
    expect(nicheFactor("tech")).toBe(1.15);
    expect(skippableFactor("nonskippable")).toBe(1.25);
  });

  it("resolvers return neutral for unknown keys", () => {
    expect(seasonFactor("nope" as never)).toBe(1);
    expect(nicheFactor("nope" as never)).toBe(1);
    expect(skippableFactor("nope" as never)).toBe(1);
  });
});
