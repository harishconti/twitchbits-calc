import type { RegionCode } from './bitsConfig';

export function bitsFaqs(region: RegionCode = 'us') {
  const cur = region === 'us' ? 'USD' : region.toUpperCase();
  return [
    { q: `How much is 100 Bits on Twitch in ${cur}?`, a: `100 Bits = 1 ${cur} for the streamer (at the standard $0.01 per Bit payout). Viewers pay around $1.40 to buy 100 Bits.` },
    { q: 'How much do streamers make per Bit?', a: 'Streamers receive $0.01 per Bit cheered (100% of the Bits value), regardless of Affiliate vs Partner status.' },
    { q: 'How much do Bits cost for viewers?', a: 'Viewer cost per Bit is roughly $0.0123–$0.0140 depending on pack size and region; larger packs cost slightly less per Bit.' },
    { q: 'What is the Twitch Bits to USD conversion rate?', a: 'The streamer payout rate is fixed at 1 Bit = $0.01 USD. Viewer purchase pricing varies by pack and region.' },
    { q: 'Do Twitch Partners earn more from Bits than Affiliates?', a: 'No. Both Affiliates and Partners receive the same $0.01 per Bit. The difference is eligibility, not the per-Bit rate.' },
    { q: 'How do I share a specific Bits calculation?', a: 'Use the Share link button — it encodes your amount in the URL so anyone opening it sees the same calculation.' },
    { q: 'Are Bits refundable?', a: 'Bits are generally non-refundable once cheered. Twitch may refund for proven fraud or technical errors on a case-by-case basis.' },
  ];
}

export const revenueFaqs = [
  { q: 'How is Twitch revenue calculated?', a: 'Twitch revenue = subscription payouts (your split) + Bits ($0.01 each) + ad revenue (CPM × minutes × viewers), summed monthly.' },
  { q: 'What is the default sub split?', a: 'The standard Twitch sub split is 50/50. Partner Plus tiers can qualify for 70/30 up to $100K, then 50/50 above that.' },
  { q: 'How much do ads pay on Twitch?', a: 'Ad revenue ≈ CPM × (minutes watched ÷ 1000) × average viewers. Typical CPMs range $2–$10 depending on region and season.' },
  { q: 'Do gift subs count toward revenue?', a: 'Yes. Gift subs are paid out at the same tier and split as regular subs; the recipient gets the sub, the gifter pays.' },
  { q: 'Is this calculator accurate?', a: 'It gives an estimate based on current Twitch rates and your inputs. Real payouts vary by region, tax, and program terms.' },
];

export const tiktokFaqs = [
  { q: 'How much is a TikTok coin worth in USD for creators?', a: 'Creators earn diamonds from gifts; each diamond is typically worth about $0.005, and coins convert to diamonds at roughly a 2:1 ratio.' },
  { q: 'What are TikTok diamonds?', a: 'Diamonds are the creator-facing unit. When a viewer sends a gift bought with coins, the creator receives diamonds, redeemable for cash.' },
  { q: 'How much does TikTok take?', a: 'TikTok keeps roughly 50% of the coin value; creators receive the remainder as diamonds.' },
  { q: 'Is the TikTok coin rate the same in every country?', a: 'No. Coin prices and payout rates vary by region and currency; this calculator uses approximate USD rates.' },
  { q: 'How do I withdraw TikTok diamonds?', a: 'Diamonds are converted to cash once you meet the minimum withdrawal threshold and link a supported payment method.' },
];

export const youtubeFaqs = [
  { q: 'What is YouTube RPM?', a: 'RPM (revenue per mille) is what you earn per 1,000 views after YouTube takes its 45% cut. It bundles ads, channel memberships, and Super Chat.' },
  { q: 'How much do YouTubers make per 1,000 views?', a: 'Typical RPM ranges $1–$10 depending on niche and audience geography; finance and tech tend higher, vlogs and kids content lower.' },
  { q: 'Does YouTube pay for views without ads?', a: 'No ad revenue without monetization (Partner Program). Once eligible, ads + memberships + Super Chat all contribute to RPM.' },
  { q: 'How accurate is this YouTube calculator?', a: 'It gives a low–high estimate from your RPM and views. Actual earnings vary by niche, season, and ad fill rate.' },
  { q: 'Do Shorts pay the same as long-form?', a: 'No. Shorts RPM is much lower than long-form; treat Shorts revenue separately when forecasting.' },
];