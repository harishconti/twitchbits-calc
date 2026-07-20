export interface ContentSection {
  /** Renders as <h2>. May contain {tokens}. */
  heading: string;
  /** Prose paragraph. May contain {tokens} and inline markup like <strong>. */
  body: string;
  /** Optional <ul>; each item may contain {tokens}. */
  bullets?: string[];
}

export interface ToolContent {
  sections: ContentSection[];
}

// One content block per tool, shared across all its amount/currency variants.
// Rates are referenced conceptually and via tokens — never hardcoded — so a
// rate change in bitsConfig.ts / coinConfig.ts / youtubeConfig.ts propagates.
export const toolContent: Record<
  "bits" | "bitsCurrency" | "tiktok" | "youtube",
  ToolContent
> = {
  bits: {
    sections: [
      {
        heading: `How {amount} Bits turn into streamer dollars`,
        body: `Twitch pays streamers a fixed <strong>$0.01 per Bit</strong> cheered, so {amount} Bits equals <strong>${"$"}{usd}</strong> for the streamer. This rate is the same for Affiliates and Partners — what changes with status is eligibility, not the per-Bit payout. The number above is the streamer's gross payout before any platform withholding or taxes.`,
      },
      {
        heading: `What viewers actually pay for {amount} Bits`,
        body: `Viewers buy Bits in packs, and the per-Bit price drops slightly on larger packs. At the smallest pack rate, {amount} Bits costs a viewer about <strong>${"$"}{viewerCost}</strong>. That gap between viewer cost and streamer payout is Twitch's margin on Bits — the streamer's $0.01-per-Bit cut is unchanged regardless of which pack the viewer bought.`,
      },
      {
        heading: `The Bits payout model, explained`,
        body: `Bits are a virtual good, not a donation. When a viewer cheers {amount} Bits in chat, Twitch credits the streamer's account at $0.01 per Bit and the streamer is paid out through their normal payout cycle once they hit the minimum threshold. Bits revenue does not affect subscription split terms and is reported separately from ad and sub revenue on the streamer's dashboard.`,
        bullets: [
          `Streamer payout: fixed at $0.01 per Bit (100% of Bits value to the creator).`,
          `Viewer cost: roughly $0.0123–$0.0140 per Bit depending on pack size and region.`,
          `Payout timing: aggregated with other revenue and paid on the streamer's standard schedule.`,
        ],
      },
    ],
  },
  bitsCurrency: {
    sections: [
      {
        heading: `Twitch Bits to {currency}: the streamer payout`,
        body: `Twitch pays streamers a fixed <strong>$0.01 per Bit</strong> in USD, so {amount} Bits equals <strong>${"$"}{usd}</strong> for the streamer. At the current USD-to-{currency} rate of <strong>{rate}</strong>, that's the same per-Bit economics as the USD calculator — only the display currency changes. The streamer is paid in USD by Twitch; the {currency} figure here is a conversion for viewers and creators who think in {currency}.`,
      },
      {
        heading: `What viewers pay in {currency}`,
        body: `Viewer pack pricing is set by Twitch per region and currency, so the per-Bit cost a viewer faces isn't a pure USD conversion — it reflects local pricing. Use this page to sanity-check the streamer-side payout in {currency}; for the exact viewer price, check the Bits pack your audience would buy in your region.`,
      },
      {
        heading: `Why the streamer rate doesn't change by currency`,
        body: `The $0.01-per-Bit streamer payout is a USD constant. Currency conversion only affects how that USD amount is displayed and what it's worth when the streamer withdraws. Affiliate and Partner status both earn the same per-Bit rate; currency and region affect the viewer's purchase price and the real-world value of the payout, not the per-Bit rate itself.`,
      },
    ],
  },
  tiktok: {
    sections: [
      {
        heading: `What {amount} TikTok Coins are worth`,
        body: `Viewers buy TikTok Coins at roughly $0.0105 each, so {amount} Coins costs a viewer about <strong>${"$"}{viewerCost}</strong>. When those Coins are spent on gifts, TikTok converts them to Diamonds for the creator at a 2:1 ratio — {amount} Coins becomes <strong>{diamonds}</strong> Diamonds — and each Diamond pays the creator about $0.005.`,
      },
      {
        heading: `What the creator actually earns from {amount} Coins`,
        body: `After TikTok's ~50% cut, the creator receives the Diamond value: <strong>{amount}</strong> Coins → {diamonds} Diamonds → <strong>${"$"}{creatorUsd}</strong> for the creator. The gap between the ${"$"}{viewerCost} the viewer paid and the ${"$"}{creatorUsd} the creator received is TikTok's platform share — that's the core difference between TikTok gifts and, for example, Twitch Bits, where the streamer receives 100% of the Bits value.`,
      },
      {
        heading: `Coins vs Diamonds, simply`,
        body: `Coins are the viewer-facing purchase unit; Diamonds are the creator-facing payout unit. A viewer spends Coins on gifts; the creator earns Diamonds and redeems them for cash once they meet TikTok's withdrawal threshold. The two-step conversion is why a gift's Coin price and the creator's eventual payout look so different.`,
        bullets: [
          `1 Coin ≈ $0.0105 to the viewer (purchase value).`,
          `2 Coins = 1 Diamond for the creator (TikTok keeps ~50%).`,
          `1 Diamond ≈ $0.005 paid to the creator on withdrawal.`,
        ],
      },
    ],
  },
  youtube: {
    sections: [
      {
        heading: `How much {views} YouTube views can earn`,
        body: `YouTube pays per 1,000 monetized views through RPM (revenue per mille), after YouTube's 45% cut. For {views} views at a typical long-form RPM range, earnings land roughly between <strong>${"$"}{lowUsd}</strong> and <strong>${"$"}{highUsd}</strong>. The wide range reflects how much RPM varies by niche, audience country, and ad fill rate — the calculator above lets you narrow it with your own RPM, niche, and audience.`,
      },
      {
        heading: `What actually drives YouTube RPM`,
        body: `RPM isn't a single number — it bundles ad revenue, channel memberships, and Super Chat, then divides by views. Finance and tech niches routinely see RPMs of $6–$18; gaming and kids' content often sit at $1–$4. Audience geography matters too: US/UK/CA/AU audiences command higher RPMs than many other regions at the same view count.`,
        bullets: [
          `Niche: finance/tech high; gaming/vlogs lower.`,
          `Audience country: US/UK/CA/AU pay more per 1k views than many other regions.`,
          `Format: long-form RPM is far higher than Shorts RPM — treat Shorts separately.`,
        ],
      },
      {
        heading: `How YouTube's 45% cut is already included`,
        body: `RPM is defined as the creator's take after YouTube's 45% share, so the ${"$"}{lowUsd}–${"$"}{highUsd} range above is what the creator keeps — not gross ad spend. To estimate pre-tax take-home, you'd still subtract self-employment and income tax from this figure; the calculator shows pre-tax earnings.`,
      },
    ],
  },
};
