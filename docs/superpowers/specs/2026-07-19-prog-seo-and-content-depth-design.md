# Programmatic SEO Consolidation + Content Depth — Design

**Date:** 2026-07-19
**Branch:** `build/twitch-bits-hub`
**Sub-project:** A (first of five — see "Decomposition" below)
**Status:** Design approved; implementation plan to follow via writing-plans skill.

## Context

The Twitch Bits Calculator Hub is a zero-backend Creator Calculator Hub (Astro 6 static + Tailwind 4 + vanilla JS, deployed to Cloudflare Pages). Programmatic-SEO variant pages are currently **hand-authored one file per query** — e.g. `how-much-is-100-bits-on-twitch.astro`, `twitch-bits-to-inr.astro`. This does not scale: each new amount or currency is a new file, and the calculator pages carry little content below the tool, which hurts search intent and bounce rate.

This spec covers **Sub-project A** of a five-part improvement program: consolidate manual programmatic-SEO pages into Astro `getStaticPaths` dynamic routes and add reusable, semantic "below-tool" content for SEO depth.

### Decomposition (context for later sub-projects)

| #     | Sub-project                      | Delivers                                                                                        |
| ----- | -------------------------------- | ----------------------------------------------------------------------------------------------- |
| **A** | Programmatic SEO + content depth | _(this spec)_                                                                                   |
| B     | New calculators                  | Kick revenue (95/5), Patreon earnings (tiers + fees), YouTube Shorts-vs-long-form RPM           |
| C     | Net-income & tax + CPM modifiers | Platform-split + self-employment-tax toggles; surface niche/geo selects in YouTube UI           |
| D     | Pages Functions backend          | `functions/api/channel`, `functions/api/rates`, `functions/api/subscribe` (KV/D1 + lead magnet) |
| E     | Monetization & lead capture      | Affiliate expansion, `AffiliateCTA` variants, `Newsletter.astro` lead-magnet wiring to D        |

### Backend-rule decision (recorded for B–E)

CLAUDE.md Rule 1 is "Zero backend. No DB, no auth, no API keys, no SSR/edge." The user has approved a **bounded relaxation** for Sub-projects D/E: Cloudflare Pages Functions may be used for (1) channel-URL import, (2) live rate lookup, (3) newsletter/lead capture to KV/D1. API keys live as Cloudflare secret env vars (server-side only, never shipped to the browser). Sub-project A is unaffected and remains pure static.

## Goal

Replace ~20 manually-authored programmatic-SEO pages with four `getStaticPaths` dynamic routes fed by editable arrays, and add a data-driven, semantic content section below each calculator — without changing any calculator math, any rate, any URL, or any visual system.

## Non-goals (deferred)

- New calculators, net-income/tax toggles, niche/geo CPM UI, Pages Functions, affiliate expansion, lead magnet → B–E.
- Dynamic per-page OG image generation via `satori` → deferred; per-page `og:title`/`og:description` plus a single static OG image already cover social cards. Can be revisited in E.
- Editorial/social activities (screen-recording calculator demos for TikTok/Shorts) → not code.

## Architecture & routing

Four dynamic routes replace the manual pages. Route filenames are chosen to **preserve existing URLs exactly**, so no `_redirects` file and no SEO reset.

| Route file                                            | Param source                                 | Variants generated                                 | Replaces (deleted)                                                     |
| ----------------------------------------------------- | -------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/pages/how-much-is-[amount]-bits-on-twitch.astro` | `BITS_AMOUNTS`                               | `how-much-is-{100,250,500,...}-bits-on-twitch`     | `how-much-is-{100,250,500,1000,5000,10000,50000}-bits-on-twitch.astro` |
| `src/pages/twitch-bits-to-[currency].astro`           | `BITS_CURRENCY_REGIONS` (lowercase ISO code) | `twitch-bits-to-{gbp,eur,cad,aud,jpy,mxn,brl,inr}` | `twitch-bits-to-{gbp,eur,cad,aud,jpy,mxn,brl,inr}.astro`               |
| `src/pages/tiktok-coins-[amount]-to-usd.astro`        | `TIKTOK_AMOUNTS`                             | `tiktok-coins-{100,500,...}-to-usd`                | `tiktok-coins-{100,1000}-to-usd.astro`                                 |
| `src/pages/youtube-money-[views]-views.astro`         | `YOUTUBE_VIEWS`                              | `youtube-money-{1000,...}-views`                   | `youtube-money-{1000,10000}-views.astro`                               |

**Slug-preservation invariant:** generated slugs must equal the old manual slugs byte-for-byte. Enforced by a single tested `slugFor(type, key)` helper in `src/lib/slug.ts` used by every route.

**USD collision guard:** the canonical `twitch-bits-to-usd.astro` (which uses the bespoke `BitsCalculator`, not `LinearConverter`) owns the `/twitch-bits-to-usd` URL. The currency dynamic route therefore **excludes the `us` region** from `getStaticPaths` so two routes never emit the same path (Astro would error on a duplicate path at build).

**Canonical pages kept standalone** (not folded into dynamic routes — bespoke hero copy + full calculator component):
`twitch-bits-to-usd.astro`, `twitch-revenue-calculator.astro`, `twitch-sub-revenue-calculator.astro`, `tiktok-coins-to-usd.astro`, `youtube-money-calculator.astro`, `sponsorship-calculator.astro`.

## Data model

All new data lives in `src/data/` per CLAUDE.md Rule 2 (rates as one-line data edits that propagate to all variants at build).

### `src/data/programmatic.ts` — generation inputs

```ts
export const BITS_AMOUNTS = [
  100, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000,
];
export const TIKTOK_AMOUNTS = [100, 500, 1000, 5000, 10000];
export const YOUTUBE_VIEWS = [1000, 10000, 100000, 1000000];

// Currency route skips 'us' (canonical standalone page owns /twitch-bits-to-usd).
export const BITS_CURRENCY_REGIONS = [
  "gb",
  "eu",
  "ca",
  "au",
  "jp",
  "mx",
  "br",
  "in",
] as const;
```

### `src/lib/slug.ts` — slug helper (single source of truth for URLs)

```ts
export function slugFor(
  type: "bitsAmount" | "bitsCurrency" | "tiktokAmount" | "youtubeViews",
  key: string | number,
): string;
```

### `src/data/toolContent.ts` — structured semantic content

One `ToolContent` per tool, shared across all its amount/currency variants. Body prose may contain `{token}` placeholders resolved at render against the variant's computed numbers. Rates are referenced conceptually and via `{rate}`/`{usd}` tokens — never hardcoded — so a rate change in `bitsConfig.ts`/`coinConfig.ts`/`youtubeConfig.ts` propagates to content automatically.

```ts
export interface ContentSection {
  heading: string; // renders as <h2>
  body: string; // prose; may contain {tokens} and inline <strong> etc.
  bullets?: string[]; // optional <ul>
}
export interface ToolContent {
  sections: ContentSection[];
}
export const toolContent: Record<
  "bits" | "bitsCurrency" | "tiktok" | "youtube",
  ToolContent
> = {/* ... */};
```

**Token contract** (keys the `values` prop must supply — documented in the interface): `{amount}`, `{usd}`, `{currency}`, `{currencyCode}`, `{viewerCost}`, `{rate}`, `{platformFee}`, `{payout}`. Variant numbers come from the existing pure calc functions (`bitsToUsd`, `usdToBits`, `bulkTable`, `tiktokToUsd`, YouTube RPM) — no new math.

**Existing rate files untouched:** `bitsConfig.ts`, `coinConfig.ts`, `youtubeConfig.ts`, `currencies.ts`.

## Content component & the `below` slot

### `ToolLayout.astro` — add a named `below` slot (additive, non-breaking)

```astro
<section class="hero-tool"> ... <article class="panel"><slot /></article> </section>
<slot name="below" />      <!-- NEW semantic content section, outside the panel -->
<FaqSection faqs={faqs} />
<RelatedReads />
<RelatedTools exclude={slug} />
<AffiliateCTA />
<Newsletter />
```

Reading order: H1 → calculator → deep content → FAQ → related → affiliate → newsletter. Existing pages that don't use the `below` slot render unchanged.

### `src/components/ToolContent.astro` — semantic renderer

```astro
---
import type { ToolContent, ContentSection } from '../data/toolContent';
interface Props { doc: ToolContent; values: Record<string, string | number>; }
const { doc, values } = Astro.props;
const resolve = (s: string) => s.replaceAll(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ''));
---
<section class="tool-content stack" aria-label="About this calculator">
  {doc.sections.map((sec: ContentSection) => (
    <div class="content-block">
      <h2>{resolve(sec.heading)}</h2>
      <p set:html={resolve(sec.body)}></p>
      {sec.bullets && <ul>{sec.bullets.map(b => <li set:html={resolve(b)}></li>)}</ul>}
    </div>
  ))}
</section>
```

**XSS note:** `set:html` is safe here because the only strings that reach it are (a) prose templates authored in `toolContent.ts` (trusted, checked into the repo) and (b) numbers from typed pure calc functions stringified via `String()`. No user-controlled string ever reaches `set:html`.

**Styling:** minimal additions to `ToolLayout`'s existing `<style>` for `.tool-content` (spacing rhythm + readability `max-width`, reusing existing tokens). No new colors, no new visual system — preserves Rule 4 (single accent color, Twitch purple `#9146ff` only on focus rings / primary CTAs / active tab / result accent).

## Route shape (representative)

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
  return BITS_AMOUNTS.map(amount => {
    const usd = bitsToUsd(amount, 'us');
    const viewerCost = +(amount * VIEWER_PACKS[0].perBitUsd).toFixed(2);
    return { params: { amount: String(amount) }, props: { amount, usd, viewerCost } };
  });
}
const { amount, usd, viewerCost } = Astro.props;
const slug = slugFor('bitsAmount', amount);
---
<ToolLayout
  title={`How Much Is ${amount} Bits on Twitch?`}
  description={`${amount} Bits on Twitch equals $${usd.toFixed(2)} USD for the streamer. See the breakdown, viewer cost, and bulk reference table.`}
  slug={slug}
  crumbs={[{ name: 'Home', url: '/' }, { name: 'Twitch Tools', url: `/${slug}` }]}
  faqs={bitsFaqs('us')}
>
  <LinearConverter config={{ tool:'bits', unitName:'Bits', paramKey:'bits',
    toUsd: bitsToUsd, fromUsd: usdToBits, defaultAmount: amount,
    bulkRows: BULK_TABLE, toBulkRows: (r) => bulkTable(r),
    viewerContext: { perUnitCostUsd: VIEWER_PACKS[0].perBitUsd, label:'Viewer pays' },
  }} />
  <ToolContent doc={toolContent.bits}
    values={{ amount, usd: usd.toFixed(2), currency:'USD', viewerCost, rate:1 }}
    slot="below" />
</ToolLayout>
```

The three sibling routes follow the identical shape, swapping config / faq factory / content doc. The currency route resolves its `RegionCode` via reverse lookup on `REGIONS` (`Object.entries(REGIONS).find(([,r]) => r.currency.toLowerCase() === currency)`), excluding `us`.

## Testing

**No new calculator-math tests** — routes only feed existing, tested pure functions. New test surface:

`src/data/programmatic.test.ts`:

- Every value in `BITS_AMOUNTS` / `TIKTOK_AMOUNTS` / `YOUTUBE_VIEWS` is a positive finite integer.
- `BITS_CURRENCY_REGIONS` excludes `'us'` (the collision invariant).

`src/lib/slug.test.ts`:

- `slugFor` produces the exact old manual slugs, e.g. `slugFor('bitsAmount', 100) === 'how-much-is-100-bits-on-twitch'`, `slugFor('bitsCurrency', 'gbp') === 'twitch-bits-to-gbp'`, etc. — covering every deleted manual page (regression guard for redirects/link rot).

## Build verification (definition of done)

1. `npm run build` — all dynamic routes emit HTML; **no duplicate-path warnings** (Astro errors on two routes emitting the same URL — this is the collision guard firing).
2. `npm test` — existing calc tests green; new `programmatic.test.ts` + `slug.test.ts` green.
3. `npm run lint` — clean.
4. **Parity-diff before each deletion:** for every old manual slug, render the new dynamic page and diff against the old manual page's visible content; confirm calculator, FAQ, and affiliate rendering are equivalent. Manual review of any diff before the manual file is deleted.
5. Slug preservation: confirm each old URL still resolves to a 200 in `dist/`.
6. Sitemap: `dist/sitemap-0.xml` contains the new dynamic URLs and not the deleted manual ones.

## SEO & performance

- **Rule 7 (structural SEO):** one page = one keyword, exact/near-exact H1 (the `title` prop); one H2 per content section (new `ToolContent`); canonical bare-URL via `getStaticPaths` clean paths (no query params); `WebApplication` + `FAQPage` + `Breadcrumb` JSON-LD unchanged from `ToolLayout`.
- **Rule 6 (performance):** dynamic routes add zero client JS — the `LinearConverter` island is identical to the manual pages. Below-tool content is static HTML. LCP/TBT/Lighthouse unaffected.
- **Rule 4 (single accent):** `ToolContent` uses only existing tokens; no new colors.
- **Rule 3 (pure calcs):** untouched; no new math introduced.

## Risks & mitigations

| Risk                                                                          | Mitigation                                                                                           |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Deleting a manual page loses unique copy/links the template doesn't reproduce | Parity-diff each old slug against the new dynamic render before deletion; manual review of any diff  |
| Two routes emit the same URL (Astro build error)                              | `us` excluded from currency route; enforced by `programmatic.test.ts`                                |
| Old indexed URL changes / link rot                                            | Slugs preserved exactly via `how-much-is-[amount]...` route name + `slugFor`; no `_redirects` needed |
| `set:html` XSS surface                                                        | Only trusted `toolContent.ts` prose + `String()`-coerced calc numbers reach it; no user input        |
| `toolContent` tokens drift from what routes pass                              | `values` keys documented in interface; `slugFor` + values covered by tests                           |
| Expansion array gets a bad value (0, NaN, 50000.5)                            | `programmatic.test.ts` asserts positive finite integers                                              |

## Rollback

All changes land on `build/twitch-bits-hub`. If something regresses, revert the commit — the manual pages return via git, no data loss. No red build is pushed.
