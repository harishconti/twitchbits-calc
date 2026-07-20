import { SPOTIFY_REGION_RATES } from "../../data/spotifyConfig";

export interface SpotifyRoyaltiesInput {
  streams: number; // monthly
  region: keyof typeof SPOTIFY_REGION_RATES;
  creatorShare: number; // 0-100 (%)
}

export interface SpotifyRoyaltiesResult {
  gross: number;
  net: number;
  annual: number;
  per1000: number; // net $ per 1,000 streams
  rate: number; // resolved per-stream rate (echo for display)
}

const g = (n: number): number => (Number.isFinite(n) && n >= 0 ? n : 0);

export function estimateSpotifyRoyalties(
  i: SpotifyRoyaltiesInput,
): SpotifyRoyaltiesResult {
  const rate = SPOTIFY_REGION_RATES[i.region] ?? SPOTIFY_REGION_RATES.global;
  let share = g(i.creatorShare);
  if (share > 100) share = 100;
  const gross = g(i.streams) * rate;
  const net = gross * (share / 100);
  const annual = net * 12;
  const per1000 = rate * 1000 * (share / 100);
  return { gross, net, annual, per1000, rate };
}

export function spotifyStreamsForGoal(
  goalUsd: number,
  region: keyof typeof SPOTIFY_REGION_RATES,
  creatorShare: number,
): number {
  if (!Number.isFinite(goalUsd) || goalUsd <= 0) return 0;
  const rate = SPOTIFY_REGION_RATES[region] ?? SPOTIFY_REGION_RATES.global;
  let share = g(creatorShare);
  if (share > 100) share = 100;
  const netPerStream = rate * (share / 100);
  if (netPerStream <= 0) return 0;
  return Math.ceil(goalUsd / netPerStream);
}
