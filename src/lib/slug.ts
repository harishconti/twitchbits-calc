export type SlugType =
  "bitsAmount" | "bitsCurrency" | "tiktokAmount" | "youtubeViews";

export function slugFor(type: SlugType, key: string | number): string {
  const k = String(key);
  switch (type) {
    case "bitsAmount":
      return `how-much-is-${k}-bits-on-twitch`;
    case "bitsCurrency":
      return `twitch-bits-to-${k}`;
    case "tiktokAmount":
      return `tiktok-coins-${k}-to-usd`;
    case "youtubeViews":
      return `youtube-money-${k}-views`;
  }
}
