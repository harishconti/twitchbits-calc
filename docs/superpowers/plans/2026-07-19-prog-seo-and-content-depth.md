# Programmatic SEO Consolidation + Content Depth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ~19 manually-authored programmatic-SEO pages with four `getStaticPaths` dynamic routes fed by editable arrays, and add a data-driven semantic content section below each calculator — preserving every existing URL and all calculator math, rates, and visuals.

**Architecture:** Four Astro dynamic routes (`getStaticPaths`) generate static HTML at build time from arrays in `src/data/programmatic.ts`. A `slugFor()` helper in `src/lib/slug.ts` is the single source of truth for URLs, guaranteeing generated slugs match the old manual slugs byte-for-byte (zero redirects). A new `ToolContent.astro` renders structured SEO content from `src/data/toolContent.ts` into a new named `below` slot in `ToolLayout`. All rates stay in their existing `src/data/*.ts` files; routes only call existing pure, tested calc functions.

**Tech Stack:** Astro 6 (static output), Tailwind 4 via `@tailwindcss/vite`, Vitest 3, vanilla-JS islands. Deploy: Cloudflare Pages (pure static — no Functions in this sub-project).

## Global Constraints

(From CLAUDE.md and the approved spec — every task implicitly includes these.)

- **Zero backend.** No DB, no auth, no API keys, no SSR/edge. All math client-side. (Sub-project A adds no backend; D/E handle Pages Functions separately.)
- **Rates never hardcoded in components.** Every calculator reads constants from `src/data/*.ts`. Content prose references rates via `{rate}`/`{usd}` tokens, never literal rate numbers.
- **`src/lib/calculators/` stays pure.** No DOM, no Astro imports. Input guards: NaN/negative/Infinity → 0. This plan adds NO new calculator math.
- **Single accent color.** Twitch purple `#9146ff` only on focus rings, primary CTAs, active tab, result accent. New `ToolContent` uses only existing CSS tokens; no new colors.
- **No render-blocking 3rd-party scripts.** Analytics stays Cloudflare Web Analytics.
- **Performance:** Lighthouse ≥ 95, LCP < 1.2s, TBT < 50ms. Dynamic routes add zero client JS.
- **SEO structural:** one page = one keyword, exact/near-exact H1, one H2 per section, canonical bare-URL, WebApplication + FAQPage + Breadcrumb JSON-LD (all already in `ToolLayout`).
- **Branch:** `build/twitch-bits-hub`. Don't push a red build. End commit messages with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- **Astro site URL:** `https://twitchbits-calc.com` (from `astro.config.mjs`); `@astrojs/sitemap` auto-includes dynamic routes.
- **Test command:** `npm test` (vitest run). **Lint:** `npm run lint`. **Build:** `npm run build`.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/lib/slug.ts` | `slugFor(type, key)` — single source of truth for programmatic URLs | Create |
| `src/lib/slug.test.ts` | slug regression tests vs old manual slugs | Create |
| `src/data/programmatic.ts` | Generation arrays + currency region list (excludes `us`) | Create |
| `src/data/programmatic.test.ts` | Array invariants (positive ints; `us` excluded) | Create |
| `src/data/toolContent.ts` | `ToolContent` interface + per-tool structured content blocks | Create |
| `src/components/ToolContent.astro` | Renders `ToolContent` to semantic HTML with token interpolation | Create |
| `src/layouts/ToolLayout.astro` | Add named `below` slot between calculator panel and FAQ | Modify (additive) |
| `src/pages/how-much-is-[amount]-bits-on-twitch.astro` | Bits-amount dynamic route | Create |
| `src/pages/twitch-bits-to-[currency].astro` | Bits-currency dynamic route (excludes USD) | Create |
| `src/pages/tiktok-coins-[amount]-to-usd.astro` | TikTok-amount dynamic route | Create |
| `src/pages/youtube-money-[views]-views.astro` | YouTube-views dynamic route | Create |
| 7 × `how-much-is-*-bits-on-twitch.astro` | Manual bits-amount pages | Delete |
| 8 × `twitch-bits-to-{gbp,eur,cad,aud,jpy,mxn,brl,inr}.astro` | Manual currency pages | Delete |
| 2 × `tiktok-coins-{100,1000}-to-usd.astro` | Manual tiktok pages | Delete |
| 2 × `youtube-money-{1000,10000}-views.astro` | Manual youtube pages | Delete |

**Unchanged (canonical standalone pages — NOT folded into dynamic routes):** `twitch-bits-to-usd.astro`, `twitch-revenue-calculator.astro`, `twitch-sub-revenue-calculator.astro`, `tiktok-coins-to-usd.astro`, `youtube-money-calculator.astro`, `sponsorship-calculator.astro`.

---

## Task 1: `slugFor` helper + tests

**Files:**
- Create: `src/lib/slug.ts`
- Test: `src/lib/slug.test.ts`

**Interfaces:**
- Produces: `slugFor(type, key)` — used by all four dynamic routes (Tasks 5–8) and the slug regression test.

- [ ] **Step 1: Write the failing test**

`src/lib/slug.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { slugFor } from './slug';

describe('slugFor', () => {
  it('matches old manual bits-amount slugs', () => {
    expect(slugFor('bitsAmount', 100)).toBe('how-much-is-100-bits-on-twitch');
    expect(slugFor('bitsAmount', 50000)).toBe('how-much-is-50000-bits-on-twitch');
    expect(slugFor('bitsAmount', 100000)).toBe('how-much-is-100000-bits-on-twitch');
  });
  it('matches old manual bits-currency slugs (lowercase ISO code)', () => {
    expect(slugFor('bitsCurrency', 'gbp')).toBe('twitch-bits-to-gbp');
    expect(slugFor('bitsCurrency', 'inr')).toBe('twitch-bits-to-inr');
    expect(slugFor('bitsCurrency', 'jpy')).toBe('twitch-bits-to-jpy');
  });
  it('matches old manual tiktok-amount slugs', () => {
    expect(slugFor('tiktokAmount', 100)).toBe('tiktok-coins-100-to-usd');
    expect(slugFor('tiktokAmount', 1000)).toBe('tiktok-coins-1000-to-usd');
  });
  it('matches old manual youtube-views slugs', () => {
    expect(slugFor('youtubeViews', 1000)).toBe('youtube-money-1000-views');
    expect(slugFor('youtubeViews', 10000)).toBe('youtube-money-10000-views');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/slug.test.ts`
Expected: FAIL — `slugFor` is not exported (module not found).

- [ ] **Step 3: Write minimal implementation**

`src/lib/slug.ts`:
```ts
export type SlugType = 'bitsAmount' | 'bitsCurrency' | 'tiktokAmount' | 'youtubeViews';

export function slugFor(type: SlugType, key: string | number): string {
  const k = String(key);
  switch (type) {
    case 'bitsAmount': return `how-much-is-${k}-bits-on-twitch`;
    case 'bitsCurrency': return `twitch-bits-to-${k}`;
    case 'tiktokAmount': return `tiktok-coins-${k}-to-usd`;
    case 'youtubeViews': return `youtube-money-${k}-views`;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/slug.test.ts`
Expected: PASS (all 4 cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/slug.ts src/lib/slug.test.ts
git commit -m "$(cat <<'EOF'
feat: add slugFor helper for programmatic-SEO URLs

Single source of truth for the four programmatic slug patterns; regression
test pins generated slugs to the old manual slugs byte-for-byte (zero redirects).

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `programmatic.ts` generation arrays + invariants

**Files:**
- Create: `src/data/programmatic.ts`
- Test: `src/data/programmatic.test.ts`

**Interfaces:**
- Produces: `BITS_AMOUNTS`, `TIKTOK_AMOUNTS`, `YOUTUBE_VIEWS` (readonly `number[]`), and `BITS_CURRENCY_REGIONS` (readonly `RegionCode[]` excluding `'us'`). Consumed by Tasks 5–8.

- [ ] **Step 1: Write the failing test**

`src/data/programmatic.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  BITS_AMOUNTS, TIKTOK_AMOUNTS, YOUTUBE_VIEWS, BITS_CURRENCY_REGIONS,
} from './programmatic';

const isPosInt = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n > 0 && Number.isFinite(n);

describe('programmatic generation arrays', () => {
  it('every bits amount is a positive finite integer', () => {
    expect(BITS_AMOUNTS.every(isPosInt)).toBe(true);
  });
  it('every tiktok amount is a positive finite integer', () => {
    expect(TIKTOK_AMOUNTS.every(isPosInt)).toBe(true);
  });
  it('every youtube views value is a positive finite integer', () => {
    expect(YOUTUBE_VIEWS.every(isPosInt)).toBe(true);
  });
  it('currency regions exclude us (canonical standalone page owns /twitch-bits-to-usd)', () => {
    expect(BITS_CURRENCY_REGIONS).not.toContain('us');
    expect(BITS_CURRENCY_REGIONS.length).toBeGreaterThan(0);
  });
  it('includes the old manual bits amounts so slugs are preserved', () => {
    expect(BITS_AMOUNTS).toContain(100);
    expect(BITS_AMOUNTS).toContain(250);
    expect(BITS_AMOUNTS).toContain(500);
    expect(BITS_AMOUNTS).toContain(1000);
    expect(BITS_AMOUNTS).toContain(5000);
    expect(BITS_AMOUNTS).toContain(10000);
    expect(BITS_AMOUNTS).toContain(50000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/programmatic.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`src/data/programmatic.ts`:
```ts
import type { RegionCode } from './bitsConfig';

// Generation inputs for the four programmatic-SEO dynamic routes.
// Expand these arrays to add more variants — one edit propagates at build.

// `how-much-is-[amount]-bits-on-twitch` — includes every old manual amount.
export const BITS_AMOUNTS = [
  100, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000,
] as const;

// `tiktok-coins-[amount]-to-usd` — includes the old manual amounts.
export const TIKTOK_AMOUNTS = [100, 500, 1000, 5000, 10000] as const;

// `youtube-money-[views]-views` — includes the old manual view counts.
export const YOUTUBE_VIEWS = [1000, 10000, 100000, 1000000] as const;

// `twitch-bits-to-[currency]` — excludes 'us' so it does not collide with the
// canonical standalone /twitch-bits-to-usd page (which uses BitsCalculator).
export const BITS_CURRENCY_REGIONS: readonly RegionCode[] = [
  'gb', 'eu', 'ca', 'au', 'jp', 'mx', 'br', 'in',
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/programmatic.test.ts`
Expected: PASS (all 5 cases).

- [ ] **Step 5: Commit**

```bash
git add src/data/programmatic.ts src/data/programmatic.test.ts
git commit -m "$(cat <<'EOF'
feat: add programmatic-SEO generation arrays

BITS_AMOUNTS / TIKTOK_AMOUNTS / YOUTUBE_VIEWS feed getStaticPaths; currency
regions exclude 'us' to avoid colliding with the canonical standalone page.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `toolContent.ts` structured content blocks

**Files:**
- Create: `src/data/toolContent.ts`

**Interfaces:**
- Produces: `ContentSection`, `ToolContent` interfaces and `toolContent` record keyed by `'bits' | 'bitsCurrency' | 'tiktok' | 'youtube'`. Consumed by `ToolContent.astro` (Task 4) and the dynamic routes (Tasks 5–8).
- **Token contract** — the `values` prop passed to `ToolContent.astro` must supply these keys (only the ones each doc's templates reference):
  - `bits`: `{amount}`, `{usd}`, `{viewerCost}`
  - `bitsCurrency`: `{amount}`, `{usd}`, `{currency}`, `{rate}`
  - `tiktok`: `{amount}`, `{viewerCost}`, `{diamonds}`, `{creatorUsd}`
  - `youtube`: `{views}`, `{lowUsd}`, `{highUsd}`

This task has no unit test (it is typed authoring data, not logic). Correctness is enforced by the build (Task 9) and by the token contract above.

- [ ] **Step 1: Write the data file**

`src/data/toolContent.ts`:
```ts
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
  'bits' | 'bitsCurrency' | 'tiktok' | 'youtube',
  ToolContent
> = {
  bits: {
    sections: [
      {
        heading: `How {amount} Bits turn into streamer dollars`,
        body: `Twitch pays streamers a fixed <strong>$0.01 per Bit</strong> cheered, so {amount} Bits equals <strong>${'$'}{usd}</strong> for the streamer. This rate is the same for Affiliates and Partners — what changes with status is eligibility, not the per-Bit payout. The number above is the streamer's gross payout before any platform withholding or taxes.`,
      },
      {
        heading: `What viewers actually pay for {amount} Bits`,
        body: `Viewers buy Bits in packs, and the per-Bit price drops slightly on larger packs. At the smallest pack rate, {amount} Bits costs a viewer about <strong>${'$'}{viewerCost}</strong>. That gap between viewer cost and streamer payout is Twitch's margin on Bits — the streamer's $0.01-per-Bit cut is unchanged regardless of which pack the viewer bought.`,
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
        body: `Twitch pays streamers a fixed <strong>$0.01 per Bit</strong> in USD, so {amount} Bits equals <strong>${'$'}{usd}</strong> for the streamer. At the current USD-to-{currency} rate of <strong>{rate}</strong>, that's the same per-Bit economics as the USD calculator — only the display currency changes. The streamer is paid in USD by Twitch; the {currency} figure here is a conversion for viewers and creators who think in {currency}.`,
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
        body: `Viewers buy TikTok Coins at roughly $0.0105 each, so {amount} Coins costs a viewer about <strong>${'$'}{viewerCost}</strong>. When those Coins are spent on gifts, TikTok converts them to Diamonds for the creator at a 2:1 ratio — {amount} Coins becomes <strong>{diamonds}</strong> Diamonds — and each Diamond pays the creator about $0.005.`,
      },
      {
        heading: `What the creator actually earns from {amount} Coins`,
        body: `After TikTok's ~50% cut, the creator receives the Diamond value: <strong>{amount}</strong> Coins → {diamonds} Diamonds → <strong>${'$'}{creatorUsd}</strong> for the creator. The gap between the ${'$'}{viewerCost} the viewer paid and the ${'$'}{creatorUsd} the creator received is TikTok's platform share — that's the core difference between TikTok gifts and, for example, Twitch Bits, where the streamer receives 100% of the Bits value.`,
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
        body: `YouTube pays per 1,000 monetized views through RPM (revenue per mille), after YouTube's 45% cut. For {views} views at a typical long-form RPM range, earnings land roughly between <strong>${'$'}{lowUsd}</strong> and <strong>${'$'}{highUsd}</strong>. The wide range reflects how much RPM varies by niche, audience country, and ad fill rate — the calculator above lets you narrow it with your own RPM, niche, and audience.`,
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
        body: `RPM is defined as the creator's take after YouTube's 45% share, so the ${'$'}{lowUsd}–${'$'}{highUsd} range above is what the creator keeps — not gross ad spend. To estimate pre-tax take-home, you'd still subtract self-employment and income tax from this figure; the calculator shows pre-tax earnings.`,
      },
    ],
  },
};
```

> Note on the `${'$'}{usd}` pattern: in a normal template literal `{usd}` would be interpreted as the `usd` variable. We write `${'$'}{usd}` so the output literal string is literally `${usd}` → which our `ToolContent.astro` tokenizer then resolves as the `{usd}` token. Every literal dollar sign before a token is written this way; dollar signs not followed by a token (e.g. in "Twitch's 45% cut") are written as plain `${'$'}` only where needed to avoid `${` sequences. Plain prose dollar amounts like "$0.01" are safe as-is because they are not followed by `{`.

- [ ] **Step 2: Verify the file typechecks**

Run: `npx tsc --noEmit -p .` (if a `tsconfig.json` exists) OR `npx vitest run src/data/programmatic.test.ts` (compiles the data module transitively).
Expected: no type errors. If `tsc` is not configured standalone, rely on the build in Task 9.

- [ ] **Step 3: Commit**

```bash
git add src/data/toolContent.ts
git commit -m "$(cat <<'EOF'
feat: add structured below-tool content blocks for programmatic pages

One ToolContent per tool (bits, bitsCurrency, tiktok, youtube) with {token}
interpolation; rates referenced via tokens so a data-config change propagates.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `ToolContent.astro` renderer + `below` slot in `ToolLayout`

**Files:**
- Create: `src/components/ToolContent.astro`
- Modify: `src/layouts/ToolLayout.astro` (add named `below` slot)

**Interfaces:**
- Consumes: `ToolContent` / `ContentSection` from `src/data/toolContent.ts` (Task 3).
- Produces: `<ToolContent doc={...} values={...} slot="below" />` — used by all four dynamic routes (Tasks 5–8).

- [ ] **Step 1: Create the renderer component**

`src/components/ToolContent.astro`:
```astro
---
import type { ToolContent, ContentSection } from '../data/toolContent';

interface Props {
  doc: ToolContent;
  values: Record<string, string | number>;
}
const { doc, values } = Astro.props;

// Resolve {token} placeholders against the variant's computed numbers.
// Safe: only trusted toolContent.ts prose + String()-coerced calc numbers
// reach set:html — no user-controlled string ever does.
const resolve = (s: string): string =>
  s.replaceAll(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));
---
<section class="tool-content stack" aria-label="About this calculator">
  {doc.sections.map((sec: ContentSection) => (
    <div class="content-block">
      <h2 set:html={resolve(sec.heading)} />
      <p set:html={resolve(sec.body)} />
      {sec.bullets && (
        <ul>
          {sec.bullets.map((b) => <li set:html={resolve(b)} />)}
        </ul>
      )}
    </div>
  ))}
</section>
<style>
  .tool-content {
    max-width: 760px;
    margin-block: var(--spacing-8);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
  }
  .content-block h2 {
    font-size: var(--text-xl);
    font-weight: 700;
    margin-bottom: var(--spacing-3);
    color: var(--color-fg);
  }
  .content-block p {
    color: var(--color-fg-2);
    line-height: var(--leading-body);
  }
  .content-block p + ul { margin-top: var(--spacing-3); }
  .content-block ul {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    padding-left: var(--spacing-5);
    list-style: disc;
    color: var(--color-fg-2);
  }
</style>
```

- [ ] **Step 2: Add the named `below` slot to `ToolLayout`**

Modify `src/layouts/ToolLayout.astro`. In the template body, insert `<slot name="below" />` between the closing `</section>` of `hero-tool` (line 30) and `<FaqSection faqs={faqs} />` (line 31).

Find:
```astro
    </section>
    <FaqSection faqs={faqs} />
```
Replace with:
```astro
    </section>
    <slot name="below" />
    <FaqSection faqs={faqs} />
```

(Leave the rest of `ToolLayout.astro` — frontmatter, styles, JSON-LD — untouched. The slot is additive: existing pages that don't pass a `below` slot render unchanged.)

- [ ] **Step 3: Verify the build still succeeds (no page uses the slot yet)**

Run: `npm run build`
Expected: build succeeds with no errors; no visible change to existing pages (the empty `below` slot renders nothing).

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/ToolContent.astro src/layouts/ToolLayout.astro
git commit -m "$(cat <<'EOF'
feat: add ToolContent renderer + named 'below' slot in ToolLayout

Semantic HTML renderer with {token} interpolation; slot sits between the
calculator panel and FAQ. Additive — existing pages render unchanged.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Bits-amount dynamic route + delete 7 manual pages

**Files:**
- Create: `src/pages/how-much-is-[amount]-bits-on-twitch.astro`
- Delete: `src/pages/how-much-is-100-bits-on-twitch.astro`
- Delete: `src/pages/how-much-is-250-bits-on-twitch.astro`
- Delete: `src/pages/how-much-is-500-bits-on-twitch.astro`
- Delete: `src/pages/how-much-is-1000-bits-on-twitch.astro`
- Delete: `src/pages/how-much-is-5000-bits-on-twitch.astro`
- Delete: `src/pages/how-much-is-10000-bits-on-twitch.astro`
- Delete: `src/pages/how-much-is-50000-bits-on-twitch.astro`

**Interfaces:**
- Consumes: `BITS_AMOUNTS` (Task 2), `slugFor` (Task 1), `toolContent` (Task 3), `ToolContent` (Task 4), existing `bitsToUsd`/`usdToBits`/`bulkTable` from `src/lib/calculators/bits`, existing `BULK_TABLE`/`VIEWER_PACKS` from `src/data/bitsConfig`, existing `bitsFaqs` from `src/data/faqs`.
- Produces: dynamic route emitting `/how-much-is-{amount}-bits-on-twitch` for every value in `BITS_AMOUNTS`.

- [ ] **Step 1: Create the dynamic route**

`src/pages/how-much-is-[amount]-bits-on-twitch.astro`:
```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import LinearConverter from '../components/calculators/LinearConverter.astro';
import ToolContent from '../components/ToolContent.astro';
import { bitsToUsd, usdToBits, bulkTable } from '../lib/calculators/bits';
import { BULK_TABLE, VIEWER_PACKS } from '../data/bitsConfig';
import { BITS_AMOUNTS } from '../data/programmatic';
import { toolContent } from '../data/toolContent';
import { slugFor } from '../lib/slug';
import { bitsFaqs } from '../data/faqs';

export function getStaticPaths() {
  return BITS_AMOUNTS.map((amount) => {
    const usd = bitsToUsd(amount, 'us');
    const viewerCost = +(amount * VIEWER_PACKS[0].perBitUsd).toFixed(2);
    return {
      params: { amount: String(amount) },
      props: { amount, usd, viewerCost },
    };
  });
}

const { amount, usd, viewerCost } = Astro.props;
const slug = slugFor('bitsAmount', amount);
---
<ToolLayout
  title={`How Much Is ${amount} Bits on Twitch?`}
  description={`${amount} Bits on Twitch equals $${usd.toFixed(2)} USD for the streamer. See the full breakdown, viewer cost, and bulk reference table.`}
  slug={slug}
  crumbs={[{ name: 'Home', url: '/' }, { name: 'Twitch Tools', url: `/${slug}` }]}
  faqs={bitsFaqs('us')}
>
  <LinearConverter
    config={{
      tool: 'bits',
      unitName: 'Bits',
      paramKey: 'bits',
      toUsd: bitsToUsd,
      fromUsd: usdToBits,
      defaultAmount: amount,
      bulkRows: BULK_TABLE,
      toBulkRows: (rows) => bulkTable(rows),
      viewerContext: { perUnitCostUsd: VIEWER_PACKS[0].perBitUsd, label: 'Viewer pays' },
    }}
  />
  <ToolContent
    doc={toolContent.bits}
    values={{ amount, usd: usd.toFixed(2), viewerCost: viewerCost.toFixed(2) }}
    slot="below"
  />
</ToolLayout>
```

- [ ] **Step 2: Build — expect a duplicate-path error (new route + old manual pages both emit the same 7 URLs)**

Run: `npm run build`
Expected: Astro errors with a duplicate-path / conflicting route message for `/how-much-is-100-bits-on-twitch` (and the other 6). This confirms the new route emits the exact expected slugs (the collision the spec's guard depends on). If the build instead succeeds with no error, STOP — the slugs don't match the manual pages; re-check `slugFor` and the route filename before deleting anything.

- [ ] **Step 3: Delete the 7 manual bits-amount pages**

```bash
git rm src/pages/how-much-is-100-bits-on-twitch.astro \
       src/pages/how-much-is-250-bits-on-twitch.astro \
       src/pages/how-much-is-500-bits-on-twitch.astro \
       src/pages/how-much-is-1000-bits-on-twitch.astro \
       src/pages/how-much-is-5000-bits-on-twitch.astro \
       src/pages/how-much-is-10000-bits-on-twitch.astro \
       src/pages/how-much-is-50000-bits-on-twitch.astro
```

- [ ] **Step 4: Build again — expect success, no duplicate-path errors**

Run: `npm run build`
Expected: build succeeds; 10 bits-amount pages generated (one per `BITS_AMOUNTS` value), including the 7 old slugs plus the 3 new ones (2000, 25000, 100000). No duplicate-path warnings.

- [ ] **Step 5: Spot-check parity — confirm the new page reproduces the old manual page's calculator**

Run: `ls dist/how-much-is-100-bits-on-twitch/ && ls dist/how-much-is-50000-bits-on-twitch/`
Expected: each directory contains an `index.html`.

Manual visual check: open `dist/how-much-is-100-bits-on-twitch/index.html` and confirm it contains the LinearConverter calculator (search for `data-tool="bits"`), the bulk reference table, and the new `tool-content` section with H2s. The calculator config matches the old manual page by construction (same `toUsd`/`fromUsd`/`defaultAmount`/`viewerContext`), so the calculator renders identically; the `tool-content` section is a net-new addition (not a regression).

- [ ] **Step 6: Run tests + lint**

Run: `npm test && npm run lint`
Expected: all tests pass; lint clean.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: dynamic how-much-is-[amount]-bits-on-twitch route replaces 7 manual pages

getStaticPaths over BITS_AMOUNTS; URL-preserving slugs via slugFor; ToolContent
adds semantic SEO depth below the calculator. Old manual pages deleted.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Bits-currency dynamic route + delete 8 manual pages

**Files:**
- Create: `src/pages/twitch-bits-to-[currency].astro`
- Delete: `src/pages/twitch-bits-to-gbp.astro`, `-eur.astro`, `-cad.astro`, `-aud.astro`, `-jpy.astro`, `-mxn.astro`, `-brl.astro`, `-inr.astro`

**Interfaces:**
- Consumes: `BITS_CURRENCY_REGIONS` (Task 2), `REGIONS` + `BULK_TABLE` + `VIEWER_PACKS` from `src/data/bitsConfig`, `bitsToUsd`/`usdToBits`/`bulkTable` from `src/lib/calculators/bits`, `bitsFaqs` from `src/data/faqs`, `slugFor` (Task 1), `toolContent.bitsCurrency` (Task 3), `ToolContent` (Task 4).
- Produces: dynamic route emitting `/twitch-bits-to-{gbp,eur,cad,aud,jpy,mxn,brl,inr}`. **Does not emit `/twitch-bits-to-usd`** — that stays the canonical standalone page.

- [ ] **Step 1: Create the dynamic route**

`src/pages/twitch-bits-to-[currency].astro`:
```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import LinearConverter from '../components/calculators/LinearConverter.astro';
import ToolContent from '../components/ToolContent.astro';
import { bitsToUsd, usdToBits, bulkTable } from '../lib/calculators/bits';
import { BULK_TABLE, VIEWER_PACKS, REGIONS, type RegionCode } from '../data/bitsConfig';
import { BITS_CURRENCY_REGIONS } from '../data/programmatic';
import { toolContent } from '../data/toolContent';
import { slugFor } from '../lib/slug';
import { bitsFaqs } from '../data/faqs';

// Reverse-lookup region by lowercase currency code (e.g. "gbp" -> "gb").
function regionForCurrency(currency: string): RegionCode {
  const entry = Object.entries(REGIONS).find(
    ([, r]) => r.currency.toLowerCase() === currency,
  );
  return (entry?.[0] as RegionCode) ?? 'us';
}

export function getStaticPaths() {
  return BITS_CURRENCY_REGIONS.map((region) => {
    const r = REGIONS[region];
    const currency = r.currency.toLowerCase();
    const amount = 100; // representative amount shown in the content block
    const usd = bitsToUsd(amount, region);
    const slug = slugFor('bitsCurrency', currency);
    return {
      params: { currency },
      props: { region, currency: r.currency, rate: r.rate, amount, usd, slug },
    };
  });
}

const { region, currency, rate, amount, usd, slug } = Astro.props;
---
<ToolLayout
  title={`Twitch Bits to ${currency} Calculator`}
  description={`Convert Twitch Bits to ${currency}. See streamer payout and viewer cost at the ${rate}:1 USD rate.`}
  slug={slug}
  crumbs={[{ name: 'Home', url: '/' }, { name: 'Twitch Tools', url: `/${slug}` }]}
  faqs={bitsFaqs(region)}
>
  <LinearConverter
    config={{
      tool: 'bits',
      unitName: 'Bits',
      paramKey: 'bits',
      region,
      currency,
      toUsd: (n) => bitsToUsd(n, region),
      fromUsd: (u) => usdToBits(u, region),
      bulkRows: BULK_TABLE,
      toBulkRows: (rows) => bulkTable(rows, region),
      viewerContext: { perUnitCostUsd: VIEWER_PACKS[0].perBitUsd, label: 'Viewer pays' },
    }}
  />
  <ToolContent
    doc={toolContent.bitsCurrency}
    values={{ amount, usd: usd.toFixed(2), currency, rate }}
    slot="below"
  />
</ToolLayout>
```

- [ ] **Step 2: Build — expect duplicate-path error for the 8 currency URLs**

Run: `npm run build`
Expected: Astro duplicate-path error for `/twitch-bits-to-gbp` (and the other 7). Confirms the new route emits the exact expected currency slugs and does NOT emit `/twitch-bits-to-usd` (since `BITS_CURRENCY_REGIONS` excludes `'us'`, verified in Task 2). If the error mentions `/twitch-bits-to-usd`, STOP — `BITS_CURRENCY_REGIONS` includes `'us'`; fix `programmatic.ts`.

- [ ] **Step 3: Delete the 8 manual currency pages**

```bash
git rm src/pages/twitch-bits-to-gbp.astro src/pages/twitch-bits-to-eur.astro \
       src/pages/twitch-bits-to-cad.astro src/pages/twitch-bits-to-aud.astro \
       src/pages/twitch-bits-to-jpy.astro src/pages/twitch-bits-to-mxn.astro \
       src/pages/twitch-bits-to-brl.astro src/pages/twitch-bits-to-inr.astro
```

- [ ] **Step 4: Build again — expect success, no errors, no `/twitch-bits-to-usd` collision**

Run: `npm run build`
Expected: build succeeds; 8 currency pages generated; `dist/twitch-bits-to-usd/index.html` still comes from the standalone canonical page (not this route). No duplicate-path warnings.

- [ ] **Step 5: Spot-check parity**

Run: `ls dist/twitch-bits-to-gbp/index.html dist/twitch-bits-to-inr/index.html dist/twitch-bits-to-usd/index.html`
Expected: all three exist. The USD one is still served by the standalone `twitch-bits-to-usd.astro` (uses `BitsCalculator`, not `LinearConverter`) — confirm it still renders `BitsCalculator` by searching `dist/twitch-bits-to-usd/index.html` for `data-tool="bits"`.

- [ ] **Step 6: Run tests + lint**

Run: `npm test && npm run lint`
Expected: pass + clean.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: dynamic twitch-bits-to-[currency] route replaces 8 manual pages

getStaticPaths over BITS_CURRENCY_REGIONS (excludes 'us'); preserves
/twitch-bits-to-usd as the canonical standalone page. ToolContent adds
currency-specific semantic depth. Old manual pages deleted.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: TikTok-amount dynamic route + delete 2 manual pages

**Files:**
- Create: `src/pages/tiktok-coins-[amount]-to-usd.astro`
- Delete: `src/pages/tiktok-coins-100-to-usd.astro`, `src/pages/tiktok-coins-1000-to-usd.astro`

**Interfaces:**
- Consumes: `TIKTOK_AMOUNTS` (Task 2), `COIN_TO_USD`/`COIN_TO_DIAMOND`/`DIAMOND_TO_USD` from `src/data/coinConfig`, `coinsToUsd` from `src/lib/calculators/tiktok`, `tiktokFaqs` from `src/data/faqs`, `slugFor` (Task 1), `toolContent.tiktok` (Task 3), `ToolContent` (Task 4), existing `TiktokCalculator` component (rendered with no props — matches the manual pages exactly).
- Produces: dynamic route emitting `/tiktok-coins-{amount}-to-usd` for every value in `TIKTOK_AMOUNTS`.

- [ ] **Step 1: Create the dynamic route**

`src/pages/tiktok-coins-[amount]-to-usd.astro`:
```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import TiktokCalculator from '../components/calculators/TiktokCalculator.astro';
import ToolContent from '../components/ToolContent.astro';
import { coinsToUsd } from '../lib/calculators/tiktok';
import { COIN_TO_USD, COIN_TO_DIAMOND, DIAMOND_TO_USD } from '../data/coinConfig';
import { TIKTOK_AMOUNTS } from '../data/programmatic';
import { toolContent } from '../data/toolContent';
import { slugFor } from '../lib/slug';
import { tiktokFaqs } from '../data/faqs';

export function getStaticPaths() {
  return TIKTOK_AMOUNTS.map((amount) => {
    const viewerCost = +(amount * COIN_TO_USD).toFixed(2);
    const diamonds = +(amount * COIN_TO_DIAMOND).toFixed(2);
    const creatorUsd = +(diamonds * DIAMOND_TO_USD).toFixed(2);
    return {
      params: { amount: String(amount) },
      props: { amount, viewerCost, diamonds, creatorUsd },
    };
  });
}

const { amount, viewerCost, diamonds, creatorUsd } = Astro.props;
const slug = slugFor('tiktokAmount', amount);
---
<ToolLayout
  title={`${amount} TikTok Coins to USD`}
  description={`${amount} TikTok Coins cost a viewer about $${viewerCost} USD. See what the creator earns in diamonds after TikTok's cut.`}
  slug={slug}
  crumbs={[{ name: 'Home', url: '/' }, { name: 'TikTok Tools', url: `/${slug}` }]}
  faqs={tiktokFaqs}
>
  <TiktokCalculator />
  <ToolContent
    doc={toolContent.tiktok}
    values={{
      amount,
      viewerCost: viewerCost.toFixed(2),
      diamonds: diamonds.toLocaleString(),
      creatorUsd: creatorUsd.toFixed(2),
    }}
    slot="below"
  />
</ToolLayout>
```

- [ ] **Step 2: Build — expect duplicate-path error for the 2 tiktok URLs**

Run: `npm run build`
Expected: Astro duplicate-path error for `/tiktok-coins-100-to-usd` and `/tiktok-coins-1000-to-usd`. Confirms slug match.

- [ ] **Step 3: Delete the 2 manual tiktok pages**

```bash
git rm src/pages/tiktok-coins-100-to-usd.astro src/pages/tiktok-coins-1000-to-usd.astro
```

- [ ] **Step 4: Build again — expect success**

Run: `npm run build`
Expected: build succeeds; 5 tiktok-amount pages generated (100, 500, 1000, 5000, 10000). No duplicate-path warnings.

- [ ] **Step 5: Spot-check parity**

Run: `ls dist/tiktok-coins-100-to-usd/index.html dist/tiktok-coins-1000-to-usd/index.html`
Expected: both exist. The calculator renders the bespoke `TiktokCalculator` (same component the manual pages used, no props) — parity by construction; the `tool-content` section is net-new.

- [ ] **Step 6: Run tests + lint**

Run: `npm test && npm run lint`
Expected: pass + clean.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: dynamic tiktok-coins-[amount]-to-usd route replaces 2 manual pages

getStaticPaths over TIKTOK_AMOUNTS; TiktokCalculator rendered unchanged
(parity); ToolContent adds coins-vs-diamonds semantic depth. Old pages deleted.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: YouTube-views dynamic route + delete 2 manual pages

**Files:**
- Create: `src/pages/youtube-money-[views]-views.astro`
- Delete: `src/pages/youtube-money-1000-views.astro`, `src/pages/youtube-money-10000-views.astro`

**Interfaces:**
- Consumes: `YOUTUBE_VIEWS` (Task 2), `rangeFromRpm` + `earningsFromViews` from `src/lib/calculators/youtube`, `DEFAULT_RPM` from `src/data/youtubeConfig`, `youtubeFaqs` from `src/data/faqs`, `slugFor` (Task 1), `toolContent.youtube` (Task 3), `ToolContent` (Task 4), existing `YoutubeCalculator` component (rendered with no props — matches the manual pages exactly).
- Produces: dynamic route emitting `/youtube-money-{views}-views` for every value in `YOUTUBE_VIEWS`.

- [ ] **Step 1: Create the dynamic route**

`src/pages/youtube-money-[views]-views.astro`:
```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import YoutubeCalculator from '../components/calculators/YoutubeCalculator.astro';
import ToolContent from '../components/ToolContent.astro';
import { rangeFromRpm } from '../lib/calculators/youtube';
import { DEFAULT_RPM } from '../data/youtubeConfig';
import { YOUTUBE_VIEWS } from '../data/programmatic';
import { toolContent } from '../data/toolContent';
import { slugFor } from '../lib/slug';
import { youtubeFaqs } from '../data/faqs';

export function getStaticPaths() {
  // Representative long-form, US estimate at the default RPM range. The
  // interactive calculator above lets users refine; this content block gives
  // a sane static figure for SEO and for no-JS readers.
  return YOUTUBE_VIEWS.map((views) => {
    const range = rangeFromRpm(views, DEFAULT_RPM.low, DEFAULT_RPM.high);
    return {
      params: { views: String(views) },
      props: {
        views,
        lowUsd: range.low,
        highUsd: range.high,
      },
    };
  });
}

const { views, lowUsd, highUsd } = Astro.props;
const slug = slugFor('youtubeViews', views);
const viewsLabel = views.toLocaleString();
---
<ToolLayout
  title={`YouTube Money Calculator — ${viewsLabel} Views`}
  description={`Estimate how much ${viewsLabel} YouTube views earn based on niche, format, and audience country.`}
  slug={slug}
  crumbs={[{ name: 'Home', url: '/' }, { name: 'YouTube Tools', url: `/${slug}` }]}
  faqs={youtubeFaqs}
>
  <YoutubeCalculator />
  <ToolContent
    doc={toolContent.youtube}
    values={{
      views: viewsLabel,
      lowUsd: lowUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
      highUsd: highUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
    }}
    slot="below"
  />
</ToolLayout>
```

- [ ] **Step 2: Build — expect duplicate-path error for the 2 youtube URLs**

Run: `npm run build`
Expected: Astro duplicate-path error for `/youtube-money-1000-views` and `/youtube-money-10000-views`. Confirms slug match.

- [ ] **Step 3: Delete the 2 manual youtube pages**

```bash
git rm src/pages/youtube-money-1000-views.astro src/pages/youtube-money-10000-views.astro
```

- [ ] **Step 4: Build again — expect success**

Run: `npm run build`
Expected: build succeeds; 4 youtube-views pages generated (1000, 10000, 100000, 1000000). No duplicate-path warnings.

- [ ] **Step 5: Spot-check parity**

Run: `ls dist/youtube-money-1000-views/index.html dist/youtube-money-10000-views/index.html`
Expected: both exist. The calculator renders the bespoke `YoutubeCalculator` (same component the manual pages used, no props) — parity by construction; the `tool-content` section is net-new.

- [ ] **Step 6: Run tests + lint**

Run: `npm test && npm run lint`
Expected: pass + clean.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: dynamic youtube-money-[views]-views route replaces 2 manual pages

getStaticPaths over YOUTUBE_VIEWS; YoutubeCalculator rendered unchanged
(parity); ToolContent adds RPM-driven semantic depth with static low/high
estimates. Old manual pages deleted.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Final verification — build, tests, lint, sitemap

**Files:**
- No new files; verification of the whole sub-project.

- [ ] **Step 1: Full clean build**

Run: `npm run build`
Expected: succeeds; no duplicate-path errors; no warnings about missing routes. Pages generated:
- 10 × `how-much-is-{amount}-bits-on-twitch`
- 8 × `twitch-bits-to-{currency}` (excluding `usd`)
- 5 × `tiktok-coins-{amount}-to-usd`
- 4 × `youtube-money-{views}-views`

- [ ] **Step 2: Confirm no manual prog-SEO pages remain**

Run: `ls src/pages | grep -E '^(how-much-is-[0-9]|twitch-bits-to-(gbp|eur|cad|aud|jpy|mxn|brl|inr)|tiktok-coins-[0-9]|youtube-money-[0-9])' || echo "none — all consolidated"`
Expected: prints `none — all consolidated`.

- [ ] **Step 3: Confirm the 4 dynamic route files exist**

Run: `ls src/pages/how-much-is-\[amount\]-bits-on-twitch.astro src/pages/twitch-bits-to-\[currency\].astro src/pages/tiktok-coins-\[amount\]-to-usd.astro src/pages/youtube-money-\[views\]-views.astro`
Expected: all four files listed.

- [ ] **Step 4: Confirm old URLs still resolve (slug preservation)**

Run:
```bash
for u in how-much-is-100-bits-on-twitch how-much-is-50000-bits-on-twitch twitch-bits-to-gbp twitch-bits-to-inr tiktok-coins-100-to-usd tiktok-coins-1000-to-usd youtube-money-1000-views youtube-money-10000-views; do
  test -f "dist/$u/index.html" && echo "OK  $u" || echo "MISSING $u"
done
```
Expected: `OK` for every line — every old manual slug resolves to a built page.

- [ ] **Step 5: Confirm sitemap reflects the new route set**

Run: `grep -oE '<loc>[^<]*</loc>' dist/sitemap-0.xml | grep -E 'how-much-is-(100|50000)-bits-on-twitch|twitch-bits-to-(gbp|inr)|tiktok-coins-(100|1000)-to-usd|youtube-money-(1000|10000)-views'`
Expected: 8 matching `<loc>` entries (the old slugs are present in the sitemap). Also confirm the deleted manual routes are NOT duplicated and that `/twitch-bits-to-usd` appears exactly once (from the standalone page).

- [ ] **Step 6: Full test + lint sweep**

Run: `npm test && npm run lint`
Expected: all tests pass (existing calc tests + new `slug.test.ts` + `programmatic.test.ts`); lint clean.

- [ ] **Step 7: Final commit if anything remains uncommitted; otherwise report done**

Run: `git status --porcelain`
Expected: empty (everything committed in Tasks 1–8). If non-empty, commit the remainder with a `chore: final consolidation cleanup` message ending with the `Co-Authored-By` trailer.

---

## Self-Review (run by the plan author, not a subagent)

**1. Spec coverage:**
- Four `getStaticPaths` dynamic routes → Tasks 5–8. ✓
- `src/data/programmatic.ts` generation arrays → Task 2. ✓
- `src/data/toolContent.ts` structured content → Task 3. ✓
- `src/lib/slug.ts` slug helper → Task 1. ✓
- `src/components/ToolContent.astro` renderer → Task 4. ✓
- `ToolLayout` named `below` slot → Task 4. ✓
- `programmatic.test.ts` + `slug.test.ts` → Tasks 1 & 2. ✓
- Build/lint/test verification + parity check → each route task's Step 4–6 + Task 9. ✓
- USD collision guard → Task 2 invariant + Task 6 Step 2 guard. ✓
- Slug preservation → Task 1 regression test + Task 9 Step 4. ✓
- No new calculator math, rates untouched, single accent color, zero backend → Global Constraints + each route uses existing pure functions. ✓

**2. Placeholder scan:** No "TBD"/"TODO"/"implement later". Every code step shows full code. The `${'$'}{token}` pattern in Task 3 is explained in the note (intentional, not a placeholder). ✓

**3. Type consistency:**
- `slugFor(type, key)` signature: defined Task 1, used identically in Tasks 5–8. ✓
- `BITS_AMOUNTS` / `TIKTOK_AMOUNTS` / `YOUTUBE_VIEWS` / `BITS_CURRENCY_REGIONS`: defined Task 2, consumed identically in Tasks 5–8. ✓
- `toolContent` record keys `'bits' | 'bitsCurrency' | 'tiktok' | 'youtube'`: defined Task 3, consumed as `toolContent.bits` / `.bitsCurrency` / `.tiktok` / `.youtube` in Tasks 5–8. ✓
- `ToolContent` props `{ doc, values, slot }`: defined Task 4, consumed identically in Tasks 5–8. ✓
- Token keys per doc match the `values` objects passed in each route (bits: amount/usd/viewerCost; bitsCurrency: amount/usd/currency/rate; tiktok: amount/viewerCost/diamonds/creatorUsd; youtube: views/lowUsd/highUsd). ✓

No issues found; plan is complete and internally consistent.