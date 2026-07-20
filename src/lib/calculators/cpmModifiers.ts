import {
  SEASON_MULTIPLIERS,
  TWITCH_NICHE_MULTIPLIERS,
  SKIPPABLE_MULTIPLIERS,
  type SeasonKey,
  type NicheKey,
  type SkippableKey,
} from "../../data/cpmModifiers";

export interface CpmModifierSelection {
  seasonFactor: number;
  nicheFactor: number;
  fillRatePct: number;
  skippableFactor: number;
}

export const NEUTRAL: CpmModifierSelection = {
  seasonFactor: 1,
  nicheFactor: 1,
  fillRatePct: 100,
  skippableFactor: 1,
};

// Factors are multipliers: a missing/NaN factor means "no adjustment" → neutral (1),
// not 0. The base CPM/RPM is a quantity: NaN/negative/Infinity → 0 (rule 3).
// Negative-but-finite factors still clamp to the lo bound (e.g. fill -10 → 0).
const clampFactor = (n: number | undefined, fallback: number): number => {
  if (n == null || !Number.isFinite(n)) return fallback;
  return Math.min(5, Math.max(0, n));
};
const clampFill = (n: number | undefined): number => {
  if (n == null || !Number.isFinite(n)) return 100;
  return Math.min(100, Math.max(0, n));
};

export function applyCpmModifiers(
  base: number,
  s: CpmModifierSelection,
): number {
  const b = Number.isFinite(base) && base >= 0 ? base : 0;
  const season = clampFactor(s?.seasonFactor, 1);
  const niche = clampFactor(s?.nicheFactor, 1);
  const fill = clampFill(s?.fillRatePct) / 100;
  const skip = clampFactor(s?.skippableFactor, 1);
  return b * season * niche * fill * skip;
}

export function seasonFactor(key: SeasonKey): number {
  return SEASON_MULTIPLIERS[key]?.factor ?? 1;
}
export function nicheFactor(key: NicheKey): number {
  return TWITCH_NICHE_MULTIPLIERS[key]?.factor ?? 1;
}
export function skippableFactor(key: SkippableKey): number {
  return SKIPPABLE_MULTIPLIERS[key]?.factor ?? 1;
}
