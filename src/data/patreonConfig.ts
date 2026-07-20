export const PATREON_PLAN_RATES = {
  standard: 0.1, // new creators (post-Aug 4 2025)
  lite: 0.05, // legacy
  pro: 0.08, // legacy
  premium: 0.12, // legacy (Pro + Merch, ~11-12%)
} as const;

export const PATREON_PLAN_PRESETS = [
  { value: "standard", label: "Standard 10% (new creators)" },
  { value: "lite", label: "Lite 5% (legacy)" },
  { value: "pro", label: "Pro 8% (legacy)" },
  { value: "premium", label: "Premium 12% (legacy)" },
] as const;

export const PATREON_PROCESSING_DEFAULT = {
  percent: 0.029, // 2.9% (USD credit card / PayPal / Venmo)
  fixedPerTransaction: 0.3, // $0.30 per pledge
};

export const PATREON_TIER_DEFAULTS = {
  tier1: { patrons: 100, price: 5 },
  tier2: { patrons: 50, price: 10 },
  tier3: { patrons: 20, price: 25 },
};
