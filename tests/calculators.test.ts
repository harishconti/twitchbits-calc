import { describe, it, expect } from 'vitest';
import { bitsToUsd, usdToBits, bulkTable } from '../src/lib/calculators/bits';

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