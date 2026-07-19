# Twitch Creator Calculator Hub — Design Spec

**Date:** 2026-07-19
**Status:** Approved (pending implementation plan)
**Source research:** `research-engine/output/2026-07-19/twitch-bits-calculator-build-plan-DEEP.md`
**Scope (decided in brainstorming):** A 4-tool hub — Twitch Bits→USD, Twitch Revenue, TikTok Coins→USD, YouTube Money — plus a blog with first cornerstone posts, on the research plan's settled stack (Astro 6 static + Tailwind 4 + vanilla JS + Cloudflare Pages, zero-backend). Monetization v1 = Streamlabs Ultra affiliate; AdSense deferred.

---

## 1. Architecture, project structure & data model

### High-level architecture

A static site with **no backend**. All calculator math runs client-side as pure functions; all configuration lives in versioned data files; pages are pre-rendered HTML plus small vanilla-JS islands. Three concerns separated by rate of change:

1. **Math** (`src/lib/calculators/`) — pure functions, no DOM, no Astro. Changes only when a platform's economics change.
2. **Data** (`src/data/`) — single editable source of truth for rates, splits, currencies, pack pricing, affiliate links. The plan's "keep conversion logic data-driven and easily editable" risk mitigation lives here.
3. **Presentation** (`src/components/`, `src/pages/`) — Astro components + vanilla-JS islands. Changes most often; never touches math/data directly.

**Why this separation:** the plan's #1 product risk is "Twitch changes Bits economics." Isolating rates in `src/data/bitsConfig.ts` and math in pure functions makes a rate change a one-line data edit that propagates to every programmatic-SEO variant at build time, with zero risk of breaking UI.

### Project structure

```
twitchbits-calc/
├── astro.config.mjs            # site URL, integrations, sitemap, prefetch
├── tailwind.config.mjs          # theme tokens (Twitch purple, slate, accents)
├── tsconfig.json
├── package.json
├── CLAUDE.md                   # project guide for Claude (produced in implementation)
├── .claude/
│   ├── settings.local.json
│   └── skills/
│       ├── deploy-cloudflare/   # build + deploy + verify loop
│       └── add-calculator-tool/ # recipe for new tools / programmatic variants
├── public/
│   ├── robots.txt
│   ├── favicon.svg
│   └── og-default.png
├── src/
│   ├── data/                    # single source of truth — editable rates
│   │   ├── bitsConfig.ts        # bits/USD rate, viewer pack costs, regions
│   │   ├── subConfig.ts          # sub tiers, Prime, gift, split presets
│   │   ├── adConfig.ts           # CPM defaults by region
│   │   ├── coinConfig.ts         # TikTok coin + diamond rates by region
│   │   ├── youtubeConfig.ts      # RPM/CPM ranges by niche + region
│   │   ├── currencies.ts         # USD/GBP/EUR/CAD/AUD static rates
│   │   ├── affiliateLinks.ts     # Streamlabs + Amazon (one place to edit)
│   │   └── faqs.ts               # FAQ content per tool (drives FAQPage schema)
│   ├── lib/
│   │   ├── calculators/         # PURE functions, no DOM
│   │   │   ├── bits.ts          # bitsToUsd, usdToBits, bulkTable
│   │   │   ├── revenue.ts       # estimateRevenue (subs+bits+ads, mo/yr)
│   │   │   ├── tiktok.ts        # coinsToUsd, diamondsToUsd
│   │   │   └── youtube.ts       # earningsFromViews (rpm x views)
│   │   ├── format.ts            # number/currency formatting (commas, locales)
│   │   ├── share.ts             # read/write query params for shareable URLs
│   │   └── schema.ts            # build WebApplication/FAQ/Breadcrumb JSON-LD
│   ├── components/
│   │   ├── primitives/          # reusable, composable UI atoms
│   │   │   ├── NumberInput.astro
│   │   │   ├── ResultDisplay.astro
│   │   │   ├── CopyButton.astro
│   │   │   ├── ShareButton.astro
│   │   │   ├── ReferenceTable.astro
│   │   │   ├── Tabs.astro           # unit toggle Bits/USD
│   │   │   ├── ThemeToggle.astro
│   │   │   └── Tooltip.astro
│   │   ├── calculators/         # one component per tool
│   │   │   ├── LinearConverter.astro       # shared Bits+TikTok engine
│   │   │   ├── BitsCalculator.astro        # configures LinearConverter
│   │   │   ├── TiktokCalculator.astro      # configures LinearConverter
│   │   │   ├── RevenueCalculator.astro     # bespoke multi-input
│   │   │   └── YoutubeCalculator.astro    # bespoke
│   │   ├── AffiliateCTA.astro
│   │   ├── RelatedTools.astro
│   │   ├── FaqSection.astro
│   │   ├── Breadcrumbs.astro
│   │   ├── Newsletter.astro       # Tally.so embed
│   │   ├── ThemeScript.astro      # no-flash theme init (inline, pre-paint)
│   │   └── layout/
│   │       ├── Header.astro
│   │       ├── Footer.astro
│   │       └── Base.astro
│   ├── layouts/
│   │   ├── BaseLayout.astro      # marketing + legal pages
│   │   ├── ToolLayout.astro      # calculator pages (breadcrumb + WebApp schema)
│   │   └── BlogLayout.astro
│   ├── pages/
│   │   ├── index.astro                      # hub landing + directory
│   │   ├── twitch-bits-to-usd.astro          # hero tool
│   │   ├── twitch-revenue-calculator.astro
│   │   ├── tiktok-coins-to-usd.astro
│   │   ├── youtube-money-calculator.astro
│   │   ├── twitch-bits-to-gbp.astro          # programmatic: region variant
│   │   ├── twitch-bits-to-eur.astro
│   │   ├── twitch-bits-to-cad.astro
│   │   ├── twitch-bits-to-aud.astro
│   │   ├── how-much-is-1000-bits-on-twitch.astro   # programmatic: pack-size
│   │   ├── how-much-is-10000-bits-on-twitch.astro
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro               # content collection render
│   │   ├── affiliate-disclosure.astro
│   │   ├── privacy.astro
│   │   ├── terms.astro
│   │   └── 404.astro
│   ├── content/
│   │   ├── config.ts            # blog collection schema
│   │   └── blog/
│   │       ├── twitch-bits-to-usd-2026-guide.md
│   │       ├── bits-vs-subs-vs-ads.md
│   │       └── tiktok-coins-vs-twitch-bits.md
│   ├── styles/
│   │   └── global.css           # Tailwind 4 entry + design tokens
│   └── scripts/
│       ├── theme.ts             # dark/light persistence (localStorage)
│       └── calculator-behavior.ts  # shared island (count-up, copy, share)
└── tests/
    └── calculators.test.ts      # Vitest unit tests on pure functions
```

### Data model (single source of truth)

Each config file exports typed constants. Example — `bitsConfig.ts`:

```ts
export const BITS_RATE_USD = 0.01;          // streamer payout per Bit (100%)
export const VIEWER_PACKS = [              // viewer cost context
  { bits: 100,  priceUsd: 1.40, perBitUsd: 0.0140 },
  { bits: 500,  priceUsd: 7.00, perBitUsd: 0.0140 },
  { bits: 1500, priceUsd: 19.95, perBitUsd: 0.0133 },
  // ...
];
export const REGIONS = {
  us: { label: 'United States', currency: 'USD', rate: 1.0 },
  gb: { label: 'United Kingdom', currency: 'GBP', rate: 0.79 },
  // static rates, weekly manual update, no API dependency
};
export const BULK_TABLE = [1, 10, 100, 500, 1_000, 5_000, 10_000, 25_000, 50_000, 100_000];
```

Pure functions consume these and never hardcode a rate:

```ts
// src/lib/calculators/bits.ts
import { BITS_RATE_USD, BULK_TABLE } from '../../data/bitsConfig';
export const bitsToUsd = (bits: number) => (Number.isFinite(bits) && bits >= 0 ? bits * BITS_RATE_USD : 0);
export const usdToBits = (usd: number) => (Number.isFinite(usd) && usd >= 0 ? Math.round(usd / BITS_RATE_USD) : 0);
export const bulkTable = (rows = BULK_TABLE) => rows.map(b => ({ bits: b, usd: bitsToUsd(b) }));
```

`affiliateLinks.ts` centralizes every monetization URL + disclosure label so disclosure and CTA copy stay consistent and a program change is a one-line edit.

---

## 2. Components & per-tool calculator design

### Two calculator "shapes"

| Tool | Shape | Component | Shared engine? |
|------|-------|-----------|----------------|
| Bits → USD | Linear unit converter (1 input, 1 rate, dual-direction) | `BitsCalculator.astro` | `LinearConverter.astro` |
| TikTok Coins → USD | Linear unit converter | `TiktokCalculator.astro` | `LinearConverter.astro` |
| Twitch Revenue | Multi-input aggregate (subs×split + bits + ads×CPM×min×viewers, mo/yr) | `RevenueCalculator.astro` | Bespoke |
| YouTube Money | Multi-input (RPM × views + memberships/CPM) | `YoutubeCalculator.astro` | Bespoke |

### `LinearConverter.astro` — shared engine (Bits + TikTok)

Parameterized by a config object carrying pure function references. Also powers programmatic-SEO variant pages (region/pack-size) via different props + FAQ content.

```astro
---
interface ConverterConfig {
  tool: 'bits' | 'tiktok';
  unitName: string;          // 'Bits' | 'TikTok Coins'
  unitShort: string;         // 'bits' | 'coins'
  toUsd: (n: number) => number;   // pure fn from lib/calculators
  fromUsd: (u: number) => number;
  bulkRows: number[];
  defaultAmount?: number;    // lets variant pages preset e.g. 1000 bits
  region?: keyof typeof REGIONS;
  viewerContext?: { perUnitCostUsd: number; label: string };
}
const { config } = Astro.props;
---
<div class="calculator" data-tool={config.tool}>
  <Tabs tabs={[config.unitName, 'USD']} />
  <NumberInput label={config.unitName} autofocus />
  <ResultDisplay />
  <div class="breakdown"><!-- streamer gets / viewer pays --></div>
  <CopyButton />
  <ShareButton />
  <ReferenceTable rows={config.bulkRows} toUsd={config.toUsd} />
</div>
<script>
  import { initLinearConverter } from '../scripts/calculator-behavior';
  initLinearConverter(document.querySelector('[data-tool]'), config);
</script>
```

**Why config carries function references, not just numbers:** the UI never re-implements math — it wires DOM to functions that are already unit-tested. The component is purely presentation + event wiring. If `bitsToUsd` passes its test, the rendered page is correct.

### `RevenueCalculator.astro` — bespoke (complex tool)

Inputs/layout:
- **Subs panel:** Tier 1/2/3 counts + Prime + gift subs, each editable; split selector (50/50 default, 60/40, 70/30, custom).
- **Bits panel:** Bits count → USD via shared `bitsToUsd` (reuses the tested function).
- **Ads panel:** CPM × minutes watched × avg viewers (region-defaulted, editable).
- **Output:** Monthly + annual estimate, "vs. minimum wage / hourly rate" comparison.
- **CTA:** Streamlabs Ultra block placed *after* result.

Pure function signature:

```ts
// src/lib/calculators/revenue.ts
export interface RevenueInput {
  subs: { tier1: number; tier2: number; tier3: number; prime: number; gift: number };
  split: number;            // share the streamer keeps (0.5 default)
  bits: number;
  ads: { cpm: number; minutes: number; viewers: number };
}
export const estimateRevenue = (i: RevenueInput) => ({
  monthly: { subs: ..., bits: ..., ads: ..., total: ... },
  annual:  { ... },
  hourlyEquivalent: number,
});
```

### `YoutubeCalculator.astro` — bespoke

Inputs: views (or view-hours), RPM (region/niche-defaulted, editable), optional memberships + CPM ad line. Output: monthly/annual earnings with a low–high RPM range (honesty = trust signal).

### Shared primitives (used by every tool)

`NumberInput` (autofocus, comma-format, min/max, `aria-label`), `ResultDisplay` (large mono, 150ms count-up), `CopyButton` (one-click "1000 Bits = $10.00 USD"), `ShareButton` (writes query params via `lib/share.ts`, copy-link), `ReferenceTable` (bulk rows), `Tabs` (unit toggle), `ThemeToggle`, `Tooltip`, plus structural: `Header`, `Footer`, `Breadcrumbs`, `RelatedTools`, `AffiliateCTA`, `FaqSection`, `Newsletter`.

### Interactivity model (vanilla JS islands)

- **`ThemeScript.astro`** — tiny inline `<script>` in `<head>` reads `localStorage` before paint → **no flash of wrong theme**.
- **`calculator-behavior.ts`** — shared island: input listener → pure fn → format → update `ResultDisplay` → sync opposite-direction input → update URL query params live. 150ms count-up via `requestAnimationFrame`. ~3 KB, no framework.
- Astro `client:load`/`client:visible` controls hydration (calculator interactive immediately; blog/newsletter can defer).

### Error handling

Pure functions guard inputs: `NaN`/negative/`Infinity` → return `0`; UI shows inline friendly validation (`aria-invalid` red border + message) rather than `NaN` in result. Shareable-URL parser validates/clamps query params (`?bits=-5` → empty). No `try/catch` swallowing — invalid state is shown, never silently hidden (trust-critical on a money tool).

---

## 3. Pages, routing, programmatic SEO & schema

### Page inventory (v1)

| Route | Type | Purpose | Layout | Primary schema |
|-------|------|---------|--------|----------------|
| `/` | Landing | Hub directory + hero + tool cards + latest posts + newsletter | BaseLayout | Organization + WebSite |
| `/twitch-bits-to-usd` | Tool (hero) | Bits↔USD calculator | ToolLayout | WebApplication + FAQPage + Breadcrumb |
| `/twitch-revenue-calculator` | Tool | Revenue estimator | ToolLayout | WebApplication + FAQPage + Breadcrumb |
| `/tiktok-coins-to-usd` | Tool | Coins↔USD + diamonds | ToolLayout | WebApplication + FAQPage + Breadcrumb |
| `/youtube-money-calculator` | Tool | RPM×views estimator | ToolLayout | WebApplication + FAQPage + Breadcrumb |
| `/twitch-bits-to-{gbp,eur,cad,aud}` | Programmatic | Same engine, region preset | ToolLayout | WebApplication + FAQPage + Breadcrumb |
| `/how-much-is-{1000,10000}-bits-on-twitch` | Programmatic | LinearConverter with `defaultAmount` | ToolLayout | FAQPage + Breadcrumb |
| `/blog` | Index | Post listing | BlogLayout | Blog + ItemList |
| `/blog/[slug]` | Content | Cornerstone posts | BlogLayout | Article + Breadcrumb |
| `/affiliate-disclosure` | Legal | FTC affiliate disclosure (auto-rendered from config) | BaseLayout | — |
| `/privacy` | Legal | No-cookies privacy policy | BaseLayout | — |
| `/terms` | Legal | Terms of use | BaseLayout | — |
| `/404` | Error | Helpful not-found | BaseLayout | — |

### Three layout types

- **`BaseLayout.astro`** — `<head>` SEO defaults (title template, meta, canonical, OG, Twitter, JSON-LD, Cloudflare Web Analytics, `ThemeScript`), `Header`, `Footer` with affiliate disclosure link. Landing + legal pages.
- **`ToolLayout.astro`** — extends BaseLayout; adds breadcrumb nav, `WebApplication` JSON-LD, page-level tool wrapper so every calculator page has identical structure (hero → calculator → reference table → educational snippet → FAQ → related tools → affiliate CTA).
- **`BlogLayout.astro`** — extends BaseLayout; article typography, reading time, share buttons, author block.

### Canonical calculator page structure (every tool)

```
Header (logo · Tools dropdown · Blog · disclosure)
  Breadcrumbs  (Home › Twitch Tools › Bits to USD)
  H1  (exact/near-exact primary keyword)
  Subhead  (benefit + CTA, <160 chars mirrors meta)
  Calculator card  (center stage, autofocus)
      Tabs(unit toggle) · NumberInput · ResultDisplay
      breakdown · CopyButton · ShareButton
  Reference table  (bulk rows)
  Educational snippet  (~150 words, SEO-rich)
  FAQ section  (5–8 Q&A from faqs.ts → visible + FAQPage JSON-LD)
  Related tools grid  (the other 3 calculators — internal linking)
  Affiliate CTA  (Streamlabs Ultra, in the attention gap)
  Newsletter capture  (Tally.so)
Footer (affiliate disclosure · privacy · terms)
```

### Programmatic SEO — variants stay cheap (thin wrappers, not new code)

```astro
---
// /pages/twitch-bits-to-gbp.astro — ~15-line file
import ToolLayout from '../layouts/ToolLayout.astro';
import LinearConverter from '../components/calculators/LinearConverter.astro';
import { bitsFaqs } from '../data/faqs';
import { bitsToUsd, usdToBits } from '../lib/calculators/bits';
import { BULK_TABLE, REGIONS } from '../data/bitsConfig';
import { buildWebAppSchema } from '../lib/schema';
---
<ToolLayout title="Twitch Bits to GBP Calculator"
  description="Convert Twitch Bits to British Pounds (GBP)..."
  schema={buildWebAppSchema({ name: 'Twitch Bits to GBP Calculator' })}
  faqs={bitsFaqs('gb')}>
  <LinearConverter config={{ tool:'bits', unitName:'Bits',
    toUsd: bitsToUsd, fromUsd: usdToBits, bulkRows: BULK_TABLE, region:'gb',
    viewerContext:{ perUnitCostUsd:0.0140, label:'viewer cost' } }} />
</ToolLayout>
```

Pack-size pages use `defaultAmount: 1000` + a FAQ answering "how much is 1000 Bits". Each variant reads the *same* `bitsConfig` + `bitsToUsd`, so a rate change updates every variant at build automatically.

**Why variants are pages, not dynamic routes:** Astro static pre-renders each route to fully-formed HTML with variant-specific title/H1/FAQ/canonical — the strongest indexable unit. Per-file variants keep the SEO target (one page = one keyword) physically visible in the repo, making cannibalization easy to audit.

### Shareable URLs

`lib/share.ts` reads/writes `?bits=1000&region=us`. On load the island parses params, populates inputs, computes — a shared Discord link lands the recipient on the exact calculation. Canonical tags point to the bare URL so query-param links never create duplicate-content variants; params are UX-only. `ShareButton` builds + copies the URL.

### Schema markup (rich snippets)

`lib/schema.ts` builds four JSON-LD blocks injected per layout:

1. **`WebApplication`** on every tool page — `applicationCategory: 'UtilityApplication'`, `operatingSystem: 'Web'`, `offers: { price: 0 }`.
2. **`FAQPage`** — generated from `faqs.ts` (single content source → visible FAQ *and* schema, can never drift).
3. **`BreadcrumbList`** — from the breadcrumbs array per page.
4. **`Organization` + `WebSite`** on `/`, with `potentialAction` SearchAction.

FAQ content in `faqs.ts` is parameterized by region where relevant (`/twitch-bits-to-gbp` gets GBP-phrased answers from the same generator).

### Sitemap, robots, canonicals

- `@astrojs/sitemap` generates `/sitemap-index.xml`; submitted to Search Console + Bing in the launch checklist.
- `public/robots.txt` allows all, points to sitemap.
- Every page emits a `canonical` link tag (bare URL, no query params).
- OG/Twitter images: one default `og-default.png` for v1; per-tool OG is a nice-to-have.

### SEO is structural, not bolted-on

- One page = one keyword; exact/near-exact H1; one H2 per feature section; semantic heading order (Section 4).
- Programmatic variants + FAQ schema + shareable URLs compete on UX (plan's risk response to "competitors outrank").
- Core Web Vitals as a ranking input: Lighthouse ≥ 95 / LCP < 1.2s (Section 4).
- Cookieless analytics → no consent banner slowing crawl/LCP (Section 5).

---

## 4. UI/UX design system (visual)

### Aesthetic & brand rationale

"Clean, fast, trustworthy — not 'gaming bro.' Streamers are professionals." Restraint: near-monochrome dark surface, Twitch purple used sparingly as the single accent, monospace reserved for the numbers that matter, generous spacing. The purple is a *signal*, not a wash.

### Color tokens (Tailwind 4 `@theme`)

```
/* Dark (default — streamers default to dark) */
--color-bg:            #0f0f13;   /* slate-near-black surface        */
--color-surface:       #18181b;   /* cards / calculator body        */
--color-surface-2:     #232327;   /* inputs / table stripes         */
--color-border:        #2e2e34;
--color-text:          #f4f4f5;   /* primary text                   */
--color-text-muted:    #a1a1aa;
--color-accent:        #9146ff;   /* Twitch purple — CTAs, focus     */
--color-accent-hover:  #7c3aed;
--color-success:       #22c55e;   /* result / "streamer gets"        */
--color-warning:       #f59e0b;   /* viewer-cost context            */
--color-danger:        #ef4444;   /* validation / aria-invalid      */

/* Light mode (CSS variable swap via [data-theme="light"]) */
--color-bg:#ffffff; --color-surface:#f8f8fb; --color-surface-2:#f1f1f5;
--color-border:#e4e4e7; --color-text:#18181b; --color-text-muted:#52525b;
/* accent stays Twitch purple; success/warning/danger unchanged */
```

Purple appears only on: focus rings, primary CTA buttons, active tab, result accent. Everything else slate. Single-accent discipline = "trustworthy tool" not "gaming landing page."

### Typography scale

- **Font:** Inter (UI/body), JetBrains Mono or Geist Mono (all numeric results + inputs — "numbers are data").
- Scale (rem, mobile-first): H1 `2rem/700`, H2 `1.5rem/600`, body `1rem/400`, small `0.875rem`, result `2.5rem/mono/600`, table `0.9375rem/mono`. Line-height 1.5 body, 1.2 headings. Max width 680px reading, 480px calculator card.

### Calculator card wireframe (mobile-first)

```
┌─────────────────────────────────────────────┐
│  [ Bits ] [ USD ]          ← unit toggle tabs │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 1,000                  Bits      ⓘ  │  │  ← autofocus, comma-format
│  └───────────────────────────────────────┘  │
│                                             │
│  $10.00 USD                        ← mono 2.5rem, count-up
│  ─────────────────────────────────────      │
│  Streamer gets   $10.00   (100%)            │
│  Viewer pays    ~$14.00  (pack pricing) ⓘ  │
│                                             │
│  [ Copy result ]   [ Share link ]            │
└─────────────────────────────────────────────┘
   Reference table · Educational · FAQ · Related · CTA below
```

Desktop: card centered max-width 480px; reference table + related-tools become a 2-col grid. Calculator never wider than 480px — large inputs read as confident, not empty.

### Hub homepage wireframe

```
┌──────────────────────────────────────────────┐
│  Logo        Tools ▾   Blog   Disclosure      │  Header
├──────────────────────────────────────────────┤
│   Free creator-economy calculators           │  H1
│   Know exactly what you earn — Twitch,       │  subhead
│   TikTok, and YouTube.                        │
│   [ Twitch Bits → USD ]   ← hero tool card    │
│   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│   │Bits→USD│ │Revenue │ │TikTok  │ │YouTube ││  tool grid (2×2 desktop, 1-col mobile)
│   └────────┘ └────────┘ └────────┘ └────────┘│
│   Latest guides  ─────────────────────────   │
│   • Twitch Bits to USD: 2026 Guide           │
│   • Bits vs Subs vs Ads                       │
│   • TikTok Coins vs Twitch Bits               │
│   Get new creator tools + monetization tips  │  Newsletter (Tally)
└──────────────────────────────────────────────┘
   Footer · disclosure · privacy · terms
```

### Component-level UX specs

| Primitive | Spec |
|-----------|------|
| `NumberInput` | 56px tall, 1.125rem mono, right-aligned, live comma grouping, `aria-label`, `inputmode="decimal"`, autofocus on primary, red ring + message when invalid |
| `ResultDisplay` | 2.5rem mono, accent/success color, 150ms rAF count-up, `aria-live="polite"` |
| `Tabs` | pill style, active = accent fill, inactive = surface-2; arrow-key nav, `role="tablist"` |
| `CopyButton` | full-width mobile, "Copy result" → "Copied ✓" 1.5s, copies `"1000 Bits = $10.00 USD"` |
| `ShareButton` | builds `?bits=…&region=…` URL, copies, toast "Link copied" |
| `ReferenceTable` | zebra surface-2 stripes, mono numbers, sticky header, responsive |
| `AffiliateCTA` | distinct surface-2 card, accent border-left, "Sponsored/affiliate" micro-label, single CTA — placed *after* result |
| `ThemeToggle` | sun/moon icon, persists to `localStorage`, no-flash via `ThemeScript` |
| `Tooltip` (ⓘ) | `aria-describedby`, focusable, dismissible — for "viewer cost"/"platform cut" jargon |

### Conversion micro-optimizations (plan → components)

Autofocus primary input (`NumberInput`); comma formatting (`format.ts`); 150ms result count-up (`calculator-behavior.ts`); affiliate CTA after result (layout order in `ToolLayout`); real Twitch language ("cheer", "payout", "streamer gets") in FAQ + breakdown copy.

### Accessibility (non-negotiable)

- WCAG AA both themes: `#9146ff` on `#18181b` passes AA large; muted `#a1a1aa` on `#0f0f13` = 4.6:1 ✓.
- Full keyboard nav: tab order input → tabs → copy → share; visible focus rings.
- `aria-live` results, `aria-invalid` + message on bad input, semantic headings, breadcrumb nav.
- `prefers-reduced-motion` disables count-up (instant update).
- No render-blocking 3rd-party scripts on calculator pages; Cloudflare cookieless analytics.

### Performance targets

Lighthouse Performance ≥ 95, LCP < 1.2s, TBT < 50ms. Achievable: static HTML, ~3 KB calculator JS, no framework runtime, Inter via `font-display: swap` + self-hosted subset, OG image lazy. `ThemeScript` is the only inline head script (~200 bytes).

---

## 5. Monetization, legal/trust, analytics & deployment

### Monetization architecture (zero-backend)

Revenue logic is **config, not code**: `affiliateLinks.ts` is the source of truth for every monetization URL + disclosure label. UI renders CTAs from it; disclosure page renders from it — a program change is one edit and disclosure can never drift from what's shown.

```ts
// src/data/affiliateLinks.ts
export const AFFILIATES = {
  streamlabs: {
    id: 'streamlabs-ultra',
    label: 'Streamlabs Ultra',
    url: 'https://streamlabs.com/...?aff_id=...',
    disclosure: 'We earn a commission when you sign up for Streamlabs Ultra.',
    cta: { primary: 'Upgrade your stream', alt: 'Start free trial' },
    placement: 'after-result',
  },
  amazon: {
    id: 'amazon-streaming-gear',
    label: 'Amazon Associates',
    url: '...',
    disclosure: 'As an Amazon Associate we earn from qualifying purchases.',
    placement: 'blog-only',
  },
};
```

**Placement:** `AffiliateCTA` renders *after* the result (the attention gap). Calculator pages: Streamlabs only. Blog/gear guides: Amazon Associates. **AdSense deferred** to post-10K sessions — no ad slots wired in v1 (keeps above-the-fold clean, Lighthouse high).

**A/B-ready CTA:** `AffiliateCTA` accepts a `variant` prop (`'primary' | 'alt'`) so the plan's Week-4 CTA copy test is a prop swap. No A/B backend; round-robin via `localStorage` bucket or hard-swap for now.

### Legal / trust pages

| Page | Content | Why |
|------|---------|-----|
| `/affiliate-disclosure` | FTC-compliant; auto-renders every program in `affiliateLinks.ts` + how commissions work + last-updated date | Required by Streamlabs/Impact + FTC; auto-generated so it never lies |
| `/privacy` | No-cookies: Cloudflare Web Analytics cookieless; no personal data; query-param share URLs client-only; Tally email note | Minimal but AdSense-ready |
| `/terms` | Calculators are estimates not financial advice; accuracy disclaimers; rate-update cadence | Liability protection |

Footer links all three; every `AffiliateCTA` has a micro "affiliate" label linking to disclosure.

### Analytics (privacy-friendly, no cookie banner)

- **Cloudflare Web Analytics** — free, cookieless, no consent banner. Single deferred snippet in `BaseLayout`.
- **No GA4/Hotjar/FB pixel in v1** — each adds a cookie banner + hurts Lighthouse. Plan's "no cookie banner" advantage preserved.
- **Search Console + Bing Webmaster** — sitemap submission (launch checklist), not site code.
- Optional later (flagged, not built): Plausible if richer analytics needed (still cookieless).

### Deployment & environment

**Target:** Cloudflare Pages, static output, git-connected for auto-deploy on push.

- `astro.config.mjs`: `site: 'https://twitchbits-calc.com'`, `@astrojs/sitemap`, `@astrojs/tailwind`, output static.
- Build `npm run build` → `dist/`. **No env vars needed in v1** (no API keys — the zero-backend point). Affiliate IDs are not secret (in public URLs), so they live in `affiliateLinks.ts` in-repo, not env vars — simpler, version-controlled, and lets the disclosure page auto-render "which programs are active" without build-time injection.
- Preview URLs per PR; production on custom domain.
- **Custom domain:** `twitchbits-calc.com` (plan recommendation, matches repo, available). DNS in Cloudflare. `streamercalc.com` grabbed + 301-redirected as broader-brand hedge.

**Why affiliate IDs are config, not env vars:** a partner ID in a public URL served to every browser is not a secret. Env-var-ing it adds build complexity + preview-deploy config for zero security benefit, and breaks the disclosure page's ability to auto-render active programs. Versioned config keeps disclosure and CTAs provably from the same source — trust is structural.

### Local dev & CI

- `npm run dev` (Astro dev, `:4321`); `npm run build` + `npm run preview`; `npm run test` (Vitest); `npm run lint` (ESLint + Prettier).
- Pre-commit lightweight: format + build + test pass before push. Cloudflare build is the deployment gate. No heavy CI in v1.

---

## 6. Testing, build sequence & Claude docs/skills

### Testing strategy

Pure calculator functions are the entire business logic and trivially unit-testable without a DOM — highest leverage.

**`tests/calculators.test.ts` (Vitest):**
```ts
expect(bitsToUsd(1000)).toBe(10);          // $0.01/Bits
expect(usdToBits(10)).toBe(1000);
expect(bitsToUsd(NaN)).toBe(0);             // input guard
expect(bitsToUsd(-5)).toBe(0);
expect(estimateRevenue({subs:{tier1:50,tier2:0,tier3:0,prime:5,gift:0},
  split:0.5, bits:5000, ads:{cpm:2,minutes:120,viewers:50}}).monthly.total).toMatchSnapshot();
```

- **Snapshot tests** on output objects lock the math when rates are edited — a snapshot diff in review is exactly the "rate change propagated as expected" (or "oops") signal.
- **Data-config tests:** `bitsConfig` rates are positive numbers; `affiliateLinks` has a `disclosure` string for every entry; `faqs` has 5–8 items per tool.
- **No heavy E2E in v1.** Interactivity is ~3 KB vanilla JS; a manual smoke checklist (in the deploy skill) covers load/autofocus/type/count-up/copy/share-round-trip/theme-persist. Add Playwright only if regressions appear (YAGNI).

**Why snapshot the output object, not rendered HTML:** HTML snapshots break on styling tweaks and train you to ignore them. Snapshotting the pure return value isolates the thing you want to catch (a math/rate change) from the noise (a Tailwind rename) — testing equivalent of Section 1's separation of concerns.

### Build sequence (3-day sprint)

| Day | Build | Verifiable outcome |
|-----|-------|--------------------|
| **1** | Scaffold Astro 6 + Tailwind 4; `data/bitsConfig.ts` + `lib/calculators/bits.ts`; `LinearConverter.astro` + primitives; `ToolLayout` + `/twitch-bits-to-usd`; `ThemeScript`; Vitest on bits fn; deploy to `*.pages.dev` | Live hero calculator, math unit-tested, dark mode no-flash |
| **2** | `RevenueCalculator` + `TiktokCalculator` (wrapper over `LinearConverter`) + `YoutubeCalculator`; `RelatedTools`; `lib/schema.ts`; `faqs.ts`; region + pack-size variants; blog content collection + 3 cornerstone posts | 4-tool hub + variants + blog, all with schema |
| **3** | `AffiliateCTA` + `affiliateLinks.ts` + auto-rendered `/affiliate-disclosure`; `/privacy` `/terms` `/404`; Cloudflare Web Analytics; custom domain; sitemap to Search Console + Bing; Lighthouse pass | Production hub, legally compliant, indexed |

Post-launch (week 1, marketing not code): Streamlabs links live, Product Hunt + Reddit + X posts, first cornerstone post promoted.

### Claude docs & skills to create (during implementation)

1. **`CLAUDE.md`** (repo root) — auto-loaded project guide: stack + why, three-layer separation rule (math/data/presentation), "rates live in `src/data/`, never hardcode in components," zero-backend constraint, single-accent design rule, Lighthouse targets, deploy command, pointers to the deep plan + this spec.
2. **`.claude/skills/deploy-cloudflare/SKILL.md`** — build → preview → push → confirm CF build → smoke-test live calculator → refresh sitemap. Deterministic, repeatable deployment.
3. **`.claude/skills/add-calculator-tool/SKILL.md`** — recipe to add a new tool or programmatic variant (data config → pure fn → page wrapper → faqs entry → RelatedTools link), enforcing the architecture as the hub grows.
4. **This spec** (`docs/superpowers/specs/2026-07-19-twitch-bits-hub-design.md`) — committed to git.

`CLAUDE.md` and the two skills are produced during implementation (per the brainstorming HARD-GATE, no implementation artifacts before spec approval). They are listed here so the spec records exactly what docs/skills the build will produce.

### Risks revisited (architecture's response)

| Plan risk | Architecture response |
|-----------|----------------------|
| Twitch changes Bits economics | One-line edit in `bitsConfig.ts`; pure fns + every variant re-render at build |
| Affiliate program terms change | One-line edit in `affiliateLinks.ts`; disclosure auto-re-renders |
| Competitors outrank | Programmatic variants + FAQ schema + speed + shareable URLs |
| Low conversion rate | A/B-ready `AffiliateCTA` variant prop; CTA after result |
| Seasonality | 4-tool hub spans Twitch/TikTok/YouTube already |

---

## Open items / future (out of v1 scope)

- Per-tool OG image generation at build (default `og-default.png` for v1).
- Plausible analytics (if richer than Cloudflare needed; still cookieless).
- AdSense (post-10K monthly sessions, per plan).
- Email list beyond Tally waitlist; PDF revenue report export (client-side, no backend); white-label embed widget.
- Multi-language `/{es,de,fr}/` builds (programmatic via the same data-driven pattern).
- Playwright E2E (only if manual smoke reveals regressions).