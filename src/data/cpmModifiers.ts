export const SEASON_MULTIPLIERS = {
  none: { label: "No season adjustment", factor: 1 },
  q1: { label: "Q1 (Jan–Mar, post-holiday slump)", factor: 0.8 },
  q2: { label: "Q2 (Apr–Jun)", factor: 1 },
  q3: { label: "Q3 (Jul–Sep, summer slowdown)", factor: 0.95 },
  q4: { label: "Q4 (Oct–Dec, holiday peak)", factor: 1.25 },
} as const;

export const TWITCH_NICHE_MULTIPLIERS = {
  none: { label: "No niche adjustment", factor: 1 },
  gaming: { label: "Gaming", factor: 1 },
  justchatting: { label: "Just Chatting / IRL", factor: 1.05 },
  music: { label: "Music & Performing Arts", factor: 0.9 },
  tech: { label: "Tech & Science", factor: 1.15 },
  art: { label: "Art & Creative", factor: 0.95 },
  sports: { label: "Sports", factor: 1.1 },
} as const;

export const SKIPPABLE_MULTIPLIERS = {
  standard: { label: "Standard mix", factor: 1 },
  skippable: { label: "Mostly skippable", factor: 0.85 },
  nonskippable: { label: "Mostly non-skippable", factor: 1.25 },
} as const;

export type SeasonKey = keyof typeof SEASON_MULTIPLIERS;
export type NicheKey = keyof typeof TWITCH_NICHE_MULTIPLIERS;
export type SkippableKey = keyof typeof SKIPPABLE_MULTIPLIERS;
