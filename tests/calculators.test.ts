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
