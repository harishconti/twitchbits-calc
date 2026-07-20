export const KICK_SUB_PRICES = {
  tier1: 4.99,
  tier2: 9.99,
  tier3: 24.99,
} as const;
export const KICK_SPLIT_DEFAULT = 0.95; // streamer keeps 95%
export const KICK_SPLIT_PRESETS = [
  { value: 0.95, label: "95/5 (Kick standard)" },
  { value: 0.5, label: "50/50" },
  { value: 1.0, label: "100% (custom deal)" },
] as const;
export const KICKS_FACE_USD_PER_100 = 1.09; // 100 KICKs face value; split applied in calc
