export function earningsFromViews(views: number, rpm: number): number {
  if (!Number.isFinite(views) || !Number.isFinite(rpm) || views < 0 || rpm < 0)
    return 0;
  return (views / 1000) * rpm;
}

export function adjustedRpm(
  baseLow: number,
  baseHigh: number,
  formatFactor: number,
  countryFactor: number,
) {
  return {
    low: earningsFromViews(1000, baseLow * formatFactor * countryFactor),
    high: earningsFromViews(1000, baseHigh * formatFactor * countryFactor),
  };
}

export function rangeFromRpm(views: number, low: number, high: number) {
  return {
    low: earningsFromViews(views, low),
    high: earningsFromViews(views, high),
    mid: earningsFromViews(views, (low + high) / 2),
  };
}
