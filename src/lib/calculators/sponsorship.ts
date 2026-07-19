import {
  SPONSORSHIP_NICHES,
  SPONSORSHIP_REGIONS,
  SPONSORSHIP_DELIVERABLES,
  type SponsorshipNiche,
  type SponsorshipRegion,
  type SponsorshipDeliverable,
} from "../../data/sponsorshipConfig";

export interface SponsorshipInput {
  followers: number;
  engagement: number; // 0–100 percent
  niche: SponsorshipNiche;
  region: SponsorshipRegion;
  deliverable: SponsorshipDeliverable;
}

const g = (n: number) => (Number.isFinite(n) && n >= 0 ? n : 0);
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

// Super-linear engagement premium: 1% baseline, 5% = 1.5x, 10%+ = 2x
function engagementMultiplier(engagement: number): number {
  const e = clamp(g(engagement), 0, 100);
  return 0.6 + clamp(e / 5, 0, 8) * 0.175;
}

export function estimateSponsorship(i: SponsorshipInput) {
  const followers = g(i.followers);
  const niche =
    SPONSORSHIP_NICHES.find((n) => n.label === i.niche) ??
    SPONSORSHIP_NICHES[0];
  const region = SPONSORSHIP_REGIONS[i.region] ?? SPONSORSHIP_REGIONS.us;
  const deliverable =
    SPONSORSHIP_DELIVERABLES[i.deliverable] ??
    SPONSORSHIP_DELIVERABLES.shoutout;

  const reached =
    followers * (Math.min(clamp(g(i.engagement), 0, 100), 10) / 100);
  const eMult = engagementMultiplier(i.engagement);

  const lowPer1k = (niche.cpmLow * region.factor * deliverable.factor) / 1000;
  const highPer1k = (niche.cpmHigh * region.factor * deliverable.factor) / 1000;

  const low = reached * lowPer1k * eMult;
  const high = reached * highPer1k * eMult;

  return {
    low,
    high,
    mid: (low + high) / 2,
    reached,
    niche,
    region,
    deliverable,
    engagementMultiplier: eMult,
  };
}

export function sponsorshipByFollowers(
  followers: number,
  nicheLabel: SponsorshipNiche,
  region: SponsorshipRegion,
  deliverable: SponsorshipDeliverable,
  rows: number[] = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000],
) {
  return rows.map((count) => {
    const est = estimateSponsorship({
      followers: count,
      engagement: 2.5,
      niche: nicheLabel,
      region,
      deliverable,
    });
    return { followers: count, low: est.low, high: est.high, mid: est.mid };
  });
}
