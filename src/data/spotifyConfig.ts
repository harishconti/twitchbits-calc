export const SPOTIFY_REGION_RATES = {
  us: 0.0044,
  uk: 0.0044,
  eu: 0.004, // Germany ~0.0042, France ~0.0037 -> avg
  canada: 0.004,
  nordic: 0.0066, // Sweden/Norway/Finland/Denmark avg
  latin_america: 0.0019, // Brazil 0.0021, Mexico 0.0017 -> avg
  india: 0.0008,
  global: 0.003, // blended global figure
} as const;

export const SPOTIFY_REGION_PRESETS = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "eu", label: "Europe (avg)" },
  { value: "canada", label: "Canada" },
  { value: "nordic", label: "Nordic" },
  { value: "latin_america", label: "Latin America" },
  { value: "india", label: "India" },
  { value: "global", label: "Global average" },
] as const;

export const SPOTIFY_CREATOR_SHARE_DEFAULT = 70; // % of gross royalty kept after label/distributor

export const SPOTIFY_STREAMS_DEFAULT = 100000; // monthly streams
