export const SUB_PRICES = { tier1: 4.99, tier2: 9.99, tier3: 24.99 };
export const SPLIT_PRESETS = [
  { label: "50/50 (standard)", value: 0.5 },
  { label: "60/40", value: 0.6 },
  { label: "70/30 (Partner Plus)", value: 0.7 },
] as const;

// Sub-count presets for quick bulk reference / programmatic SEO tables
export const SUB_BULK_COUNTS = [
  1, 10, 50, 100, 250, 500, 1000, 2500, 5000,
] as const;
