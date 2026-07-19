export const SITE = {
  name: 'Twitch Bits Calculator',
  url: 'https://twitchbits-calc.com',
  tagline: 'Free creator-economy calculators',
  twitter: '@twitchbitscalc',
} as const;

export const TOOLS = [
  { slug: 'twitch-bits-to-usd', name: 'Twitch Bits → USD', short: 'Bits→USD', desc: 'Convert Bits to dollars and back.' },
  { slug: 'twitch-revenue-calculator', name: 'Twitch Revenue Calculator', short: 'Revenue', desc: 'Estimate monthly + annual Twitch earnings.' },
  { slug: 'tiktok-coins-to-usd', name: 'TikTok Coins → USD', short: 'TikTok', desc: 'Convert TikTok coins and diamonds to USD.' },
  { slug: 'youtube-money-calculator', name: 'YouTube Money Calculator', short: 'YouTube', desc: 'Estimate YouTube earnings from RPM × views.' },
] as const;