import { describe, it, expect } from 'vitest';
import { bitsToUsd, usdToBits, bulkTable } from '../src/lib/calculators/bits';
import { estimateRevenue } from '../src/lib/calculators/revenue';
import { coinsToUsd, diamondsToUsd, usdToCoins } from '../src/lib/calculators/tiktok';

describe('bits calculator', () => {
  it('converts bits to USD at $0.01/Bits', () => {
    expect(bitsToUsd(1000)).toBe(10);
    expect(bitsToUsd(100)).toBe(1);
  });
  it('converts USD to bits (rounded)', () => {
    expect(usdToBits(10)).toBe(1000);
    expect(usdToBits(1)).toBe(100);
  });
  it('guards invalid/negative input', () => {
    expect(bitsToUsd(NaN)).toBe(0);
    expect(bitsToUsd(-5)).toBe(0);
    expect(bitsToUsd(Infinity)).toBe(0);
    expect(usdToBits(-1)).toBe(0);
  });
  it('applies region FX rate for non-USD', () => {
    // 1000 bits = $10 USD; GBP rate 0.79 → £7.90
    expect(bitsToUsd(1000, 'gb')).toBeCloseTo(7.9, 2);
  });
  it('returns bulk rows with usd equivalents', () => {
    const rows = bulkTable();
    expect(rows).toHaveLength(10);
    expect(rows[4]).toEqual({ bits: 1000, usd: 10 });
  });
});

describe('revenue calculator', () => {
  it('computes monthly revenue from subs + bits + ads', () => {
    const r = estimateRevenue({
      subs: { tier1: 50, tier2: 0, tier3: 0, prime: 5, gift: 0 },
      split: 0.5, bits: 5000, ads: { cpm: 2, minutes: 120, viewers: 50 },
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

  it('guards negative inputs', () => {
    const r = estimateRevenue({ subs: { tier1: -5, tier2: 0, tier3: 0, prime: 0, gift: 0 }, split: 0.5, bits: -10, ads: { cpm: -1, minutes: 0, viewers: 0 } });
    expect(r.monthly.total).toBe(0);
  });

  it('snapshots a typical partner estimate', () => {
    expect(estimateRevenue({ subs: { tier1: 200, tier2: 10, tier3: 2, prime: 20, gift: 5 }, split: 0.7, bits: 50000, ads: { cpm: 4, minutes: 300, viewers: 150 } })).toMatchSnapshot();
  });
});

describe('tiktok calculator', () => {
  it('converts coins to USD at the creator payout rate', () => {
    // 1 coin ≈ $0.0105 viewer cost; creator earns ~half via diamonds.
    expect(coinsToUsd(1000)).toBeGreaterThan(0);
    expect(usdToCoins(coinsToUsd(1000))).toBe(1000);
  });
  it('diamonds to USD', () => {
    expect(diamondsToUsd(1000)).toBeCloseTo(5, 0); // ~$0.005/diamond
  });
  it('guards bad input', () => {
    expect(coinsToUsd(-1)).toBe(0);
    expect(diamondsToUsd(NaN)).toBe(0);
  });
});