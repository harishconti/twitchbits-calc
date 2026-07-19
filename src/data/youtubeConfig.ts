export const RPM_BY_NICHE = [
  { label: "Gaming", low: 1, high: 4 },
  { label: "Vlogs / lifestyle", low: 2, high: 6 },
  { label: "Tech / finance", low: 6, high: 18 },
  { label: "Education", low: 4, high: 12 },
] as const;

export const RPM_BY_FORMAT = {
  long: { label: "Long-form video", factor: 1, low: 2, high: 8 },
  shorts: { label: "YouTube Shorts", factor: 0.12, low: 0.25, high: 1.2 },
} as const;

export const RPM_BY_COUNTRY = {
  us: { label: "United States", factor: 1 },
  gb: { label: "United Kingdom", factor: 0.82 },
  ca: { label: "Canada", factor: 0.78 },
  au: { label: "Australia", factor: 0.8 },
  eu: { label: "Eurozone", factor: 0.72 },
  other: { label: "Other / Global", factor: 0.5 },
} as const;

export const DEFAULT_RPM = { low: 2, high: 8 };
