import { BITS_RATE_USD, BULK_TABLE, REGIONS, type RegionCode, DEFAULT_REGION } from '../../data/bitsConfig';

function rateFor(region: RegionCode = DEFAULT_REGION): number {
  return REGIONS[region]?.rate ?? 1;
}

export function bitsToUsd(bits: number, region: RegionCode = DEFAULT_REGION): number {
  if (!Number.isFinite(bits) || bits < 0) return 0;
  return bits * BITS_RATE_USD * rateFor(region);
}

export function usdToBits(usd: number, region: RegionCode = DEFAULT_REGION): number {
  if (!Number.isFinite(usd) || usd < 0) return 0;
  return Math.round(usd / (BITS_RATE_USD * rateFor(region)));
}

export function bulkTable(rows: number[] = BULK_TABLE, region: RegionCode = DEFAULT_REGION) {
  return rows.map((bits) => ({ bits, usd: bitsToUsd(bits, region) }));
}