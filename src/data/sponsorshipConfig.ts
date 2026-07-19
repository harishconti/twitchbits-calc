// CPMs are in USD per 1,000 followers reached, used as a base for sponsorship estimate.
// A 1%–5% engagement follower base is typical; rates scale super-linearly with niche.
export const SPONSORSHIP_NICHES = [
  { label: "General / Vlog", cpmLow: 5, cpmHigh: 15 },
  { label: "Gaming / Tech", cpmLow: 10, cpmHigh: 25 },
  { label: "Finance / Business", cpmLow: 20, cpmHigh: 60 },
  { label: "Beauty / Fashion", cpmLow: 15, cpmHigh: 40 },
  { label: "Fitness / Health", cpmLow: 10, cpmHigh: 30 },
  { label: "Travel / Lifestyle", cpmLow: 8, cpmHigh: 22 },
] as const;

// Audience region multiplier applied to base CPM
export const SPONSORSHIP_REGIONS = {
  us: { label: "United States", factor: 1.0 },
  gb: { label: "United Kingdom", factor: 0.85 },
  ca: { label: "Canada", factor: 0.8 },
  au: { label: "Australia", factor: 0.8 },
  eu: { label: "Eurozone", factor: 0.7 },
  other: { label: "Other / Global", factor: 0.5 },
} as const;

export type SponsorshipNiche = (typeof SPONSORSHIP_NICHES)[number]["label"];
export type SponsorshipRegion = keyof typeof SPONSORSHIP_REGIONS;

// Deliverables and their value multiplier relative to a single shoutout
export const SPONSORSHIP_DELIVERABLES = {
  shoutout: { label: "Shoutout / mention", factor: 1.0 },
  dedicated: { label: "Dedicated video / stream segment", factor: 2.5 },
  integration: { label: "Natural integration", factor: 1.8 },
  longterm: { label: "3-month brand deal", factor: 3.5 },
  social: { label: "Social post + story set", factor: 0.8 },
} as const;

export type SponsorshipDeliverable = keyof typeof SPONSORSHIP_DELIVERABLES;
