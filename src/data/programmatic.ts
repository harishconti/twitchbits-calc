import type { RegionCode } from './bitsConfig';

// Generation inputs for the four programmatic-SEO dynamic routes.
// Expand these arrays to add more variants — one edit propagates at build.

// `how-much-is-[amount]-bits-on-twitch` — includes every old manual amount.
export const BITS_AMOUNTS = [
  100, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000,
] as const;

// `tiktok-coins-[amount]-to-usd` — includes the old manual amounts.
export const TIKTOK_AMOUNTS = [100, 500, 1000, 5000, 10000] as const;

// `youtube-money-[views]-views` — includes the old manual view counts.
export const YOUTUBE_VIEWS = [1000, 10000, 100000, 1000000] as const;

// `twitch-bits-to-[currency]` — excludes 'us' so it does not collide with the
// canonical standalone /twitch-bits-to-usd page (which uses BitsCalculator).
export const BITS_CURRENCY_REGIONS: readonly RegionCode[] = [
  'gb', 'eu', 'ca', 'au', 'jp', 'mx', 'br', 'in',
];