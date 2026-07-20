import type { RegionCode } from "./bitsConfig";

export function bitsFaqs(region: RegionCode = "us") {
  const cur = region === "us" ? "USD" : region.toUpperCase();
  return [
    {
      q: `How much is 100 Bits on Twitch in ${cur}?`,
      a: `100 Bits = 1 ${cur} for the streamer (at the standard $0.01 per Bit payout). Viewers pay around $1.40 to buy 100 Bits.`,
    },
    {
      q: "How much do streamers make per Bit?",
      a: "Streamers receive $0.01 per Bit cheered (100% of the Bits value), regardless of Affiliate vs Partner status.",
    },
    {
      q: "How much do Bits cost for viewers?",
      a: "Viewer cost per Bit is roughly $0.0123–$0.0140 depending on pack size and region; larger packs cost slightly less per Bit.",
    },
    {
      q: "What is the Twitch Bits to USD conversion rate?",
      a: "The streamer payout rate is fixed at 1 Bit = $0.01 USD. Viewer purchase pricing varies by pack and region.",
    },
    {
      q: "Do Twitch Partners earn more from Bits than Affiliates?",
      a: "No. Both Affiliates and Partners receive the same $0.01 per Bit. The difference is eligibility, not the per-Bit rate.",
    },
    {
      q: "How do I share a specific Bits calculation?",
      a: "Use the Share link button — it encodes your amount in the URL so anyone opening it sees the same calculation.",
    },
    {
      q: "Are Bits refundable?",
      a: "Bits are generally non-refundable once cheered. Twitch may refund for proven fraud or technical errors on a case-by-case basis.",
    },
  ];
}

export const revenueFaqs = [
  {
    q: "How is Twitch revenue calculated?",
    a: "Twitch revenue = subscription payouts (your split) + Bits ($0.01 each) + ad revenue (CPM × minutes × viewers), summed monthly.",
  },
  {
    q: "What is the default sub split?",
    a: "The standard Twitch sub split is 50/50. Partner Plus tiers can qualify for 70/30 up to $100K, then 50/50 above that.",
  },
  {
    q: "How much do ads pay on Twitch?",
    a: "Ad revenue ≈ CPM × (minutes watched ÷ 1000) × average viewers. Typical CPMs range $2–$10 depending on region and season.",
  },
  {
    q: "Do gift subs count toward revenue?",
    a: "Yes. Gift subs are paid out at the same tier and split as regular subs; the recipient gets the sub, the gifter pays.",
  },
  {
    q: "Is this calculator accurate?",
    a: "It gives an estimate based on current Twitch rates and your inputs. Real payouts vary by region, tax, and program terms.",
  },
];

export const subRevenueFaqs = [
  {
    q: "How much do Twitch streamers make per sub?",
    a: "Tier 1 ($4.99), Tier 2 ($9.99), and Tier 3 ($24.99) subs pay the streamer their split of that price. A 50/50 split gives $2.50, $5.00, and $12.50 respectively.",
  },
  {
    q: "What is the Twitch Partner Plus sub split?",
    a: "Partner Plus can earn a 70/30 split on recurring subscriptions up to $100K in net revenue, then it resets to 50/50.",
  },
  {
    q: "Do Prime subs pay the streamer?",
    a: "Yes. Prime subs pay the streamer the same Tier-1 split amount; the viewer pays via Amazon Prime instead of cash.",
  },
  {
    q: "How many subs do I need to make $1,000 a month?",
    a: "At a 50/50 split you need about 401 Tier-1 subs per month to reach $1,000. At 70/30 you need about 287.",
  },
  {
    q: "Does this include taxes and fees?",
    a: "No. The numbers are pre-tax, pre-fee gross estimates. Twitch pays you; you handle withholding and local taxes.",
  },
];

export const sponsorshipFaqs = [
  {
    q: "How much should I charge for a brand deal?",
    a: "Estimate based on followers, engagement, niche, audience country, and deliverable. A common rule of thumb is $5–$60 CPM per 1,000 followers reached.",
  },
  {
    q: "Why does engagement matter more than follower count?",
    a: "Brands pay for reach and action. A smaller creator with 5% engagement can earn more per follower than a larger creator with 0.5% engagement.",
  },
  {
    q: "Which niche pays the most for sponsorships?",
    a: "Finance, business, and tech typically pay the highest CPMs. Lifestyle and vlog niches tend to pay lower but can land volume deals.",
  },
  {
    q: "Is this a guaranteed rate?",
    a: "No. This is a negotiation starting point. Actual rates depend on exclusivity, usage rights, campaign length, and the brand's budget.",
  },
  {
    q: "What deliverable pays the most?",
    a: "Long-term brand deals and dedicated videos or stream segments usually command a premium over simple shoutouts or social posts.",
  },
];

export const tiktokFaqs = [
  {
    q: "How much is a TikTok coin worth in USD for creators?",
    a: "Creators earn diamonds from gifts; each diamond is typically worth about $0.005, and coins convert to diamonds at roughly a 2:1 ratio.",
  },
  {
    q: "What are TikTok diamonds?",
    a: "Diamonds are the creator-facing unit. When a viewer sends a gift bought with coins, the creator receives diamonds, redeemable for cash.",
  },
  {
    q: "How much does TikTok take?",
    a: "TikTok keeps roughly 50% of the coin value; creators receive the remainder as diamonds.",
  },
  {
    q: "Is the TikTok coin rate the same in every country?",
    a: "No. Coin prices and payout rates vary by region and currency; this calculator uses approximate USD rates.",
  },
  {
    q: "How do I withdraw TikTok diamonds?",
    a: "Diamonds are converted to cash once you meet the minimum withdrawal threshold and link a supported payment method.",
  },
];

export const youtubeFaqs = [
  {
    q: "What is YouTube RPM?",
    a: "RPM (revenue per mille) is what you earn per 1,000 views after YouTube takes its 45% cut. It bundles ads, channel memberships, and Super Chat.",
  },
  {
    q: "How much do YouTubers make per 1,000 views?",
    a: "Typical RPM ranges $1–$10 depending on niche and audience geography; finance and tech tend higher, vlogs and kids content lower.",
  },
  {
    q: "Does YouTube pay for views without ads?",
    a: "No ad revenue without monetization (Partner Program). Once eligible, ads + memberships + Super Chat all contribute to RPM.",
  },
  {
    q: "How accurate is this YouTube calculator?",
    a: "It gives a low–high estimate from your RPM and views. Actual earnings vary by niche, season, and ad fill rate.",
  },
  {
    q: "Do Shorts pay the same as long-form?",
    a: "No. Shorts RPM is much lower than long-form; treat Shorts revenue separately when forecasting.",
  },
];

export const kickRevenueFaqs = [
  {
    q: "How much do Kick streamers make per sub?",
    a: "Kick pays a 95/5 split by default, so a $4.99 Tier 1 sub pays the streamer about $4.74 (vs $2.50 at Twitch's 50/50). Tier 2 ($9.99) pays ~$9.49 and Tier 3 ($24.99) pays ~$23.74.",
  },
  {
    q: "What are KICKs worth on Kick?",
    a: "100 KICKs have a face value of about $1.09, and the streamer keeps 95% of that — roughly $1.04 per 100 KICKs received.",
  },
  {
    q: "Does Kick take a cut of ad revenue?",
    a: "No. Kick pays streamers 100% of ad revenue, unlike Twitch's split. This calculator applies no split to the ads panel.",
  },
  {
    q: "Does Kick have Prime subs?",
    a: "No. Kick has no Prime sub equivalent. It has standard paid subs, gift subs, and KICKs (its Bits-analog) as the main support channels.",
  },
  {
    q: "Is this Kick revenue calculator accurate?",
    a: "It estimates gross pre-tax earnings from current Kick rates and your inputs. Real payouts vary by region, Stripe fees, and program terms.",
  },
];

export const adRevenueFaqs = [
  {
    q: "How is Twitch ad revenue calculated?",
    a: "Ad revenue ≈ CPM × (ad impressions ÷ 1000). Impressions = ads per hour × hours streamed × average concurrent viewers × streams per month. This calculator uses that impressions-based model.",
  },
  {
    q: "What is a good Twitch ad CPM?",
    a: "Typical Twitch ad CPMs range $2–$10 depending on region, season, and audience. The US default here is $4.00; adjust it to match your real ad stats.",
  },
  {
    q: "How many ads should I run per hour?",
    a: "Most Twitch partners run 1–4 ad breaks per hour. More ads raise revenue but can hurt viewer retention; test and watch your drop-off.",
  },
  {
    q: "Does this include the streamer's split on ads?",
    a: "Twitch pays streamers a share of ad revenue per their contract. This calculator reports gross ad revenue before any split is applied.",
  },
  {
    q: "How does this differ from the Twitch Revenue Calculator?",
    a: "The Twitch Revenue Calculator estimates your full income mix (subs + Bits + ads). This tool focuses only on ad earnings with finer ad-slot inputs (ads per hour, streams per month).",
  },
];

export const patreonRevenueFaqs = [
  {
    q: "How much does Patreon take from creators?",
    a: "New creators (published after August 4, 2025) pay a flat 10% platform fee. Legacy creators may still be on Lite (5%), Pro (8%), or Premium (12%) if their page stayed continuously published.",
  },
  {
    q: "What are Patreon's payment processing fees?",
    a: "On the Standard plan, processing is 2.9% + $0.30 per pledge (USD credit card/PayPal). The fixed $0.30 hits low-tier pledges harder — a $5 pledge loses about 19% effective, a $25 pledge about 5%.",
  },
  {
    q: "How is Patreon revenue calculated?",
    a: "Monthly take-home = Σ (patrons × tier price) − platform fee (plan % of gross) − processing fee (2.9% of gross + $0.30 per pledge). Annual is monthly × 12.",
  },
  {
    q: "Do Patreon payouts include taxes?",
    a: "No. These estimates are pre-tax. VAT/GST/sales tax may apply on the platform fee in some regions, and you handle your own income tax on payouts.",
  },
  {
    q: "How many patrons do I need to hit a monthly goal?",
    a: "The goal calc solves for patrons at one tier's price after fees. At the Standard plan with $5 tiers, each patron nets about $4.06, so $1,000/month needs roughly 247 patrons.",
  },
];

export const spotifyRoyaltiesFaqs = [
  {
    q: "How much does Spotify pay per stream?",
    a: "The global blended average is about $0.003–$0.005 per stream, but it varies widely by region: US/UK ~$0.0044, Nordic ~$0.0066, Latin America ~$0.0019, India ~$0.0008.",
  },
  {
    q: "Why does region matter so much for Spotify royalties?",
    a: "Spotify pays out of a royalty pool funded mostly by Premium subscriptions. Premium price and ad rates differ by country, so a stream from the US earns several times a stream from India.",
  },
  {
    q: "What is the creator share percentage?",
    a: "It's the share of the gross royalty you keep after your label or distributor takes their cut. An indie via a distributor might keep ~90%; a major-label artist might keep 10–50%. Default here is 70%.",
  },
  {
    q: "How is Spotify royalty revenue calculated?",
    a: "Monthly net = streams × per-stream rate for your region × (creator share ÷ 100). Annual is monthly × 12. Per 1,000 streams net = rate × 1000 × share.",
  },
  {
    q: "Does this include Spotify's 1,000-stream threshold?",
    a: "No. Since April 2024, tracks need 1,000 streams in a 12-month period to earn royalties. This calculator estimates gross earnings and does not model that eligibility threshold.",
  },
];

export const netIncomeFaqs = [
  {
    q: "How is net income calculated for a creator?",
    a: "Net income = gross revenue minus business expenses minus income tax minus self-employment/social tax. This calculator estimates each piece using 2026 brackets for your jurisdiction.",
  },
  {
    q: "What is self-employment tax?",
    a: "In the US, self-employment tax is 15.3% (12.4% Social Security + 2.9% Medicare) applied to 92.35% of your net earnings, separate from income tax. The UK has Class 4 NIC, Canada has CPP (both halves = 11.9%), and Australia has the 2% Medicare levy.",
  },
  {
    q: "Why does take-home vary so much by country?",
    a: "Each country has different brackets, allowances, and social contributions. The same $60,000 gross can leave you with materially different net pay across the US, UK, Canada, and Australia — switch the jurisdiction selector to compare.",
  },
  {
    q: "What is the QBI deduction?",
    a: "US-only: the Qualified Business Income deduction lets many self-employed people deduct 20% of their net business income (after half of SE tax) before income tax is calculated. This calculator applies it without the high-income phaseout.",
  },
  {
    q: "Is this calculator tax advice?",
    a: "No — estimates only. The model is deliberately simplified (no state tax, no itemized deductions, no phaseouts, and Canada's BPA and Australia's LITO are not modeled as credits). For real figures, use your jurisdiction's official tax tool or a CPA.",
  },
];
