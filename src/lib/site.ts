export const SITE = {
  name: "Twitch Bits Calculator",
  url: "https://twitchbits-calc.com",
  tagline: "Free creator-economy calculators",
  twitter: "@twitchbitscalc",
} as const;

export const TOOLS = [
  {
    slug: "twitch-bits-to-usd",
    name: "Twitch Bits → USD",
    short: "Bits→USD",
    desc: "Convert Bits to dollars and back.",
  },
  {
    slug: "twitch-revenue-calculator",
    name: "Twitch Revenue Calculator",
    short: "Revenue",
    desc: "Estimate monthly + annual Twitch earnings.",
  },
  {
    slug: "twitch-sub-revenue-calculator",
    name: "Twitch Sub Revenue Calculator",
    short: "Subs",
    desc: "Estimate subscription revenue by tier and split.",
  },
  {
    slug: "tiktok-coins-to-usd",
    name: "TikTok Coins → USD",
    short: "TikTok",
    desc: "Convert TikTok coins and diamonds to USD.",
  },
  {
    slug: "youtube-money-calculator",
    name: "YouTube Money Calculator",
    short: "YouTube",
    desc: "Estimate YouTube earnings from RPM × views.",
  },
  {
    slug: "sponsorship-calculator",
    name: "Sponsorship Calculator",
    short: "Sponsor",
    desc: "Estimate brand deal rates by followers + niche.",
  },
  {
    slug: "kick-revenue-calculator",
    name: "Kick Revenue Calculator",
    short: "Kick",
    desc: "Estimate Kick earnings from subs, KICKs, and ads at 95/5.",
  },
  {
    slug: "twitch-ad-revenue-calculator",
    name: "Twitch Ad Revenue Calculator",
    short: "Ad Rev",
    desc: "Estimate Twitch ad revenue from CPM, viewers, and ad slots.",
  },
  {
    slug: "patreon-revenue-calculator",
    name: "Patreon Revenue Calculator",
    short: "Patreon",
    desc: "Estimate Patreon take-home by tier after plan fee + processing.",
  },
  {
    slug: "spotify-royalties-calculator",
    name: "Spotify Royalties Calculator",
    short: "Spotify",
    desc: "Estimate Spotify royalties by region rate × creator share.",
  },
  {
    slug: "net-income-tax-calculator",
    name: "Net Income Tax Calculator",
    short: "Net Income",
    desc: "Estimate creator take-home pay after income tax and self-employment tax (US/UK/CA/AU).",
  },
] as const;
