export const BITS_RATE_USD = 0.01; // streamer payout per Bit (100%)

export const VIEWER_PACKS = [
  { bits: 100, priceUsd: 1.4, perBitUsd: 0.014 },
  { bits: 500, priceUsd: 7.0, perBitUsd: 0.014 },
  { bits: 1500, priceUsd: 19.95, perBitUsd: 0.0133 },
  { bits: 5000, priceUsd: 64.99, perBitUsd: 0.013 },
  { bits: 25000, priceUsd: 308.0, perBitUsd: 0.0123 },
];

export const REGIONS = {
  us: { label: "United States", currency: "USD", rate: 1.0 },
  gb: { label: "United Kingdom", currency: "GBP", rate: 0.79 },
  eu: { label: "Eurozone", currency: "EUR", rate: 0.92 },
  ca: { label: "Canada", currency: "CAD", rate: 1.36 },
  au: { label: "Australia", currency: "AUD", rate: 1.51 },
  jp: { label: "Japan", currency: "JPY", rate: 151.0 },
  mx: { label: "Mexico", currency: "MXN", rate: 18.0 },
  br: { label: "Brazil", currency: "BRL", rate: 5.5 },
  in: { label: "India", currency: "INR", rate: 83.0 },
} as const;

export type RegionCode = keyof typeof REGIONS;
export const DEFAULT_REGION: RegionCode = "us";

export const BULK_TABLE = [
  1, 10, 100, 500, 1_000, 5_000, 10_000, 25_000, 50_000, 100_000,
];
