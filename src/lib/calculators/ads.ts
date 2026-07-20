export interface AdRevenueInput {
  cpm: number;
  viewers: number;
  adsPerHour: number;
  hoursPerStream: number;
  streamsPerMonth: number;
}

export interface AdRevenueResult {
  monthly: number;
  annual: number;
  impressionsPerStream: number;
  monthlyImpressions: number;
  rpmPerViewer: number;
}

const g = (n: number): number => (Number.isFinite(n) && n >= 0 ? n : 0);

export function estimateAdRevenue(i: AdRevenueInput): AdRevenueResult {
  const impressionsPerStream =
    g(i.adsPerHour) * g(i.hoursPerStream) * g(i.viewers);
  const monthlyImpressions = impressionsPerStream * g(i.streamsPerMonth);
  const monthly = (monthlyImpressions / 1000) * g(i.cpm);
  const annual = monthly * 12;
  const rpmPerViewer = g(i.viewers) > 0 ? monthly / g(i.viewers) : 0;
  return {
    monthly,
    annual,
    impressionsPerStream,
    monthlyImpressions,
    rpmPerViewer,
  };
}
