# Sub-project B2 — Design Spec

**Date:** 2026-07-20
**Branch:** `build/twitch-bits-hub` (stacked on Sub-projects A + B1; no PR until the cumulative end-of-roadmap PR)
**Execution model:** Subagent-Driven Development (SDD), 4 tasks, continuous execution
**Parent roadmap:** Sub-project B of the A–E decomposition (see `docs/superpowers/plans/2026-07-19-twitch-bits-hub.md`). B2 is the non-streaming pair; B1 (Kick Revenue + Twitch Ad Revenue) is complete.

## 1. Goal

Add two new single-page calculator tools to the Creator Calculator Hub, following the existing data-driven pattern (config in `src/data/*.ts`, pure guarded math in `src/lib/calculators/*.ts`, vanilla-JS island in `src/components/calculators/*.astro`, `ToolLayout` page):

1. **Patreon Revenue Calculator** — recurring membership revenue across 3 custom tiers, minus Patreon's platform fee (by plan) minus per-transaction processing fee (2.9% + $0.30/pledge). Foregrounds the post-Aug-2025 Standard 10% plan and the per-transaction fee's disproportionate impact on low-tier pledges.
2. **Spotify Royalties Calculator** — monthly streams × per-stream rate by listener region × creator share % (after label/distributor), with region as the dominant payout driver and a sourced per-region rate table.

Both ship as **single tool pages only** — no programmatic-SEO variant pages, no `ToolContent` depth blocks (lighter, matching B1; prog-SEO may retrofit in a later sub-project).

## 2. Non-goals

- Do **not** modify any existing calculator module or island (additive only — no regression to the 8 live tools, including B1's Kick/Ad work).
- Do **not** extract a shared tiered-revenue helper. Patreon's `Σ patrons×price` resembles Kick's subs math, but the two live in different sub-projects and B1 is already merged-into-cumulative-branch; touching `kick.ts` now risks B1 regression for marginal DRY. Deliberate non-DRY, same rationale as B1's two ad formulas.
- Do **not** add programmatic-SEO routes or `toolContent.ts` blocks for B2.
- Do **not** fabricate Patreon/Spotify affiliate/referral IDs. `src/data/affiliateLinks.ts` and the disclosure page are untouched.
- Do **not** open a PR after B2 — stack on `build/twitch-bits-hub` for the cumulative roadmap PR.
- Do **not** model Patreon one-time purchases/Shop, currency-conversion fees, payout fees, or iOS 30% — out of scope for a focused recurring-revenue estimator. The processing fee modeled is the standard USD credit-card/PayPal rate only.
- Do **not** model Spotify's Premium-vs-Free tier split or the 1,000-stream monetization threshold — region rate × share is the chosen simplified model (per the approved option).

## 3. Architecture & file plan

### New files (8)

| File                                                 | Purpose                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/data/patreonConfig.ts`                          | Plan rates (Standard 10% + legacy Lite/Pro/Premium), processing fee (2.9% + $0.30), default tiers |
| `src/lib/calculators/patreon.ts`                     | Pure `estimatePatreonRevenue` + `patreonPatronsForGoal`                                           |
| `src/components/calculators/PatreonCalculator.astro` | Tier-rows + plan `<select>` + processing display; goal calc                                       |
| `src/pages/patreon-revenue-calculator.astro`         | ToolLayout page                                                                                   |
| `src/data/spotifyConfig.ts`                          | Per-stream rate by region (sourced), creator-share default, region presets                        |
| `src/lib/calculators/spotify.ts`                     | Pure `estimateSpotifyRoyalties` + `spotifyStreamsForGoal`                                         |
| `src/components/calculators/SpotifyCalculator.astro` | Streams + region `<select>` + share slider; goal calc                                             |
| `src/pages/spotify-royalties-calculator.astro`       | ToolLayout page                                                                                   |

### Modified files (3)

- `src/lib/site.ts` — append 2 entries to `TOOLS[]` (patreon-revenue-calculator, spotify-royalties-calculator)
- `src/data/faqs.ts` — append `patreonRevenueFaqs` + `spotifyRoyaltiesFaqs` exports (feed visible FAQ + JSON-LD)
- `tests/calculators.test.ts` — append `describe("patreon revenue calculator")` + `describe("spotify royalties calculator")` blocks (established convention: all calculator math tests live in this one shared file; suite 65 → ~87)

### Untouched (do not modify — no-regression)

All 8 existing calc modules (`bits.ts`, `revenue.ts`, `subs.ts`, `tiktok.ts`, `youtube.ts`, `sponsorship.ts`, `kick.ts`, `ads.ts`), all 8 existing islands, `programmatic.ts`, `affiliateLinks.ts`, `toolContent.ts`.

## 4. Data config

### `src/data/patreonConfig.ts` (new)

Sourced from Patreon Help Center (see Sources). Patreon eliminated the Lite/Pro/Premium tiered plans for creators who publish **after August 4, 2025** — all new creators are on the Standard 10% plan. Legacy plans remain grandfathered for continuously-published pages.

```ts
export const PATREON_PLAN_RATES = {
  standard: 0.1, // new creators (post-Aug 4 2025)
  lite: 0.05, // legacy
  pro: 0.08, // legacy
  premium: 0.12, // legacy (Pro + Merch, ~11-12%)
} as const;

export const PATREON_PLAN_PRESETS = [
  { value: "standard", label: "Standard 10% (new creators)" },
  { value: "lite", label: "Lite 5% (legacy)" },
  { value: "pro", label: "Pro 8% (legacy)" },
  { value: "premium", label: "Premium 12% (legacy)" },
] as const;

export const PATREON_PROCESSING_DEFAULT = {
  percent: 0.029, // 2.9% (USD credit card / PayPal / Venmo)
  fixedPerTransaction: 0.3, // $0.30 per pledge
};

export const PATREON_TIER_DEFAULTS = {
  tier1: { patrons: 100, price: 5 },
  tier2: { patrons: 50, price: 10 },
  tier3: { patrons: 20, price: 25 },
};
```

Design note: unlike Twitch/Kick subs (fixed platform tier prices), Patreon tiers have **creator-set prices**, so each tier carries both `patrons` and `price`. The processing fee's **fixed $0.30 per pledge** is applied per patron per tier (each pledge is a transaction) — this is what makes low-tier pledges fee-inefficient and is the key insight the calculator surfaces. The plan rate and processing fee are separate editable levers (CLAUDE.md Rule 2): a Patreon fee change is a one-line config edit that propagates to the calculator and all derived displays.

### `src/data/spotifyConfig.ts` (new)

Sourced from Chartlex and Dynamoi (see Sources). Region is the single biggest driver of per-stream payout; a true global blended average sits near $0.0022–$0.003/stream (Dynamoi median $2.20/1k across 97 markets), while Tier-1 markets pay 4–5× more.

```ts
export const SPOTIFY_REGION_RATES = {
  us: 0.0044,
  uk: 0.0044,
  eu: 0.004, // Germany ~0.0042, France ~0.0037 → avg
  canada: 0.004,
  nordic: 0.0066, // Sweden/Norway/Finland/Denmark avg
  latin_america: 0.0019, // Brazil 0.0021, Mexico 0.0017 → avg
  india: 0.0008,
  global: 0.003, // blended global figure
} as const;

export const SPOTIFY_REGION_PRESETS = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "eu", label: "Europe (avg)" },
  { value: "canada", label: "Canada" },
  { value: "nordic", label: "Nordic" },
  { value: "latin_america", label: "Latin America" },
  { value: "india", label: "India" },
  { value: "global", label: "Global average" },
] as const;

export const SPOTIFY_CREATOR_SHARE_DEFAULT = 70; // % of gross royalty kept after label/distributor
export const SPOTIFY_STREAMS_DEFAULT = 100000; // monthly streams
```

Design note: region `<select>` labels are **names only** — the island displays the selected rate as a separate read-only value read from `SPOTIFY_REGION_RATES[region]`, so there is one source of truth for the rate (CLAUDE.md Rule 2). `SPOTIFY_CREATOR_SHARE_DEFAULT` (70%) is a middle-ground assumption for an independent artist via a distributor (e.g. DistroKid keeps ~10%); the slider lets the user model label deals (10–50%) or full-keeping indies (~90%).

## 5. Pure functions + tests

All pure functions follow CLAUDE.md Rule 3: no DOM, no Astro imports, no side effects, `g(n) = Number.isFinite(n) && n >= 0 ? n : 0` guard on every numeric input.

### `src/lib/calculators/patreon.ts`

```ts
import {
  PATREON_PLAN_RATES,
  PATREON_PROCESSING_DEFAULT,
} from "../../data/patreonConfig";

export interface PatreonTier {
  patrons: number;
  price: number;
}
export interface PatreonRevenueInput {
  tiers: { tier1: PatreonTier; tier2: PatreonTier; tier3: PatreonTier };
  plan: keyof typeof PATREON_PLAN_RATES;
  processing?: { percent: number; fixedPerTransaction: number };
}
export interface PatreonRevenueResult {
  gross: number;
  platformFee: number;
  processingFee: number;
  net: number;
  annual: number;
  effectiveRate: number; // (gross - net) / gross, 0-1
  perTier: { tier1: number; tier2: number; tier3: number }; // net per tier
}
```

- `estimatePatreonRevenue(i)`:
  - `planRate = PATREON_PLAN_RATES[i.plan] ?? PATREON_PLAN_RATES.standard` (invalid plan → standard 0.10)
  - `processing = i.processing ?? PATREON_PROCESSING_DEFAULT`
  - per tier: `tierGross = g(patrons) × g(price)`; `tierPlatform = tierGross × planRate`; `tierProcessing = tierGross × processing.percent + g(patrons) × processing.fixedPerTransaction` (each pledge of `price` costs `price × percent + fixed`; summed over `patrons` pledges → `tierGross × percent + patrons × fixed`)
  - `gross = Σ tierGross`; `platformFee = gross × planRate`; `processingFee = Σ (tierGross × processing.percent + g(patrons) × processing.fixedPerTransaction)`
  - `net = gross − platformFee − processingFee` (guard ≥ 0)
  - `annual = net × 12`; `effectiveRate = gross > 0 ? (gross − net) / gross : 0`
  - `perTier = { tier1: tier1Gross − tier1Platform − tier1Processing, ... }`
  - returns the result object
- `patreonPatronsForGoal(goalUsd, tierPrice, plan, processing = PATREON_PROCESSING_DEFAULT)`: guards `goalUsd` finite/>0 else 0; `planRate = PATREON_PLAN_RATES[plan] ?? standard`; net per patron at `tierPrice` = `tierPrice − tierPrice×planRate − (tierPrice×processing.percent + processing.fixedPerTransaction)`; if netPerPatron ≤ 0 return 0; else `Math.ceil(goalUsd / netPerPatron)`.

### `src/lib/calculators/spotify.ts`

```ts
import {
  SPOTIFY_REGION_RATES,
  SPOTIFY_CREATOR_SHARE_DEFAULT,
} from "../../data/spotifyConfig";

export interface SpotifyRoyaltiesInput {
  streams: number; // monthly
  region: keyof typeof SPOTIFY_REGION_RATES;
  creatorShare: number; // 0-100 (%)
}
export interface SpotifyRoyaltiesResult {
  gross: number;
  net: number;
  annual: number;
  per1000: number; // net $ per 1,000 streams
  rate: number; // resolved per-stream rate (echo for display)
}
```

- `estimateSpotifyRoyalties(i)`:
  - `rate = SPOTIFY_REGION_RATES[i.region] ?? SPOTIFY_REGION_RATES.global` (invalid region → global)
  - `share = g(i.creatorShare); if (share > 100) share = 100` (clamp 0–100)
  - `gross = g(i.streams) × rate`
  - `net = gross × (share / 100)`
  - `annual = net × 12`; `per1000 = rate × 1000 × (share / 100)`
  - returns `{ gross, net, annual, per1000, rate }`
- `spotifyStreamsForGoal(goalUsd, region, creatorShare)`: guards `goalUsd` finite/>0 else 0; `rate = SPOTIFY_REGION_RATES[region] ?? global`; `share` clamped 0–100; `netPerStream = rate × (share/100)`; if `netPerStream <= 0` return 0; else `Math.ceil(goalUsd / netPerStream)`.

### Tests (~22 total, appended to `tests/calculators.test.ts`)

Per repo convention, all calculator math tests live in the single shared file `tests/calculators.test.ts` (currently 65 tests across 9 `describe` blocks after B1). B2 appends two new `describe` blocks:

- `describe("patreon revenue calculator")`: NaN/negative/Infinity→0 on patrons/price; plan rate lookup (standard/lite/pro/premium); invalid plan → standard; processing fee = `tierGross × 2.9% + patrons × $0.30` (assert the per-transaction fixed hit on a low tier, e.g. 100 patrons × $5 → processing = 100×($5×0.029 + $0.30) = 100×$0.445 = $44.50); net = gross − platform − processing (hand-trace the $5 standard-plan example: gross $500, platform $50, processing $44.50, net $405.50, effectiveRate ~18.9%); annual = net × 12; perTier breakdown sums equal net; `patreonPatronsForGoal` guards (goal ≤ 0 → 0, netPerPatron ≤ 0 → 0) + ceil. ~12 `it` blocks.
- `describe("spotify royalties calculator")`: guards on streams/share; share clamp >100 → 100; region lookup (each of 8 regions resolves to its rate); invalid region → global; gross = streams × rate; net = gross × share/100; annual = net × 12; per1000 = rate × 1000 × share/100; `spotifyStreamsForGoal` guards (goal ≤ 0 → 0, share 0 → 0) + ceil. ~10 `it` blocks.

Suite total: 65 → ~87 tests.

## 6. Islands (vanilla-JS, existing pattern)

### `src/components/calculators/PatreonCalculator.astro`

- **3 tier rows**, each: patrons `RangeSlider` (0–1000, step 1) + price `RangeSlider` (0–100, step 1, `$` prefix). Defaults from `PATREON_TIER_DEFAULTS`.
- **Plan `<select>`** bound to `PATREON_PLAN_PRESETS` (Standard 10% selected).
- **Read-only processing line**: "Processing: 2.9% + $0.30/pledge" (from `PATREON_PROCESSING_DEFAULT`).
- **Result**: `{net}/month`; **subresult**: `≈ {annual}/year · {effectiveRate}% in fees`.
- **Breakdown grid**: Gross / Platform fee / Processing fee / Net + per-tier net rows (Tier 1 / Tier 2 / Tier 3).
- **Goal calc**: tier `<select>` (tier1/tier2/tier3, default tier1) + monthly goal `<input type="number">` → `patreonPatronsForGoal(goal, selectedTierPrice, plan)` → "At {planLabel} you need **N** ${price} patrons/month".
- Inline `<script>` reads sliders via `data-range-slider` dataset (existing pattern), `?? 0` fallback, `render()` on every input + plan `change` + goal `input`.

### `src/components/calculators/SpotifyCalculator.astro`

- **Streams** `RangeSlider` (monthly, 0–10,000,000, step 1000, default `SPOTIFY_STREAMS_DEFAULT`).
- **Region `<select>`** bound to `SPOTIFY_REGION_PRESETS` (US default).
- **Creator share** `RangeSlider` (0–100, step 1, `%` suffix, default `SPOTIFY_CREATOR_SHARE_DEFAULT`).
- **Read-only rate line**: "{rate}/stream · {per1000}/1,000 streams (your share)" (rate read from `SPOTIFY_REGION_RATES[region]`).
- **Result**: `{net}/month`; **subresult**: `≈ {annual}/year · {per1000}/1,000 streams net`.
- **Breakdown grid**: Streams / Gross / Creator share / Net / per-1,000-stream rate.
- **Goal calc**: monthly goal `<input type="number">` → `spotifyStreamsForGoal(goal, region, share)` → "At {share}% in {regionLabel} you need **N** streams/month".
- Inline `<script>` reads sliders via `data-range-slider` dataset, `?? 0` fallback, `render()` on every input + region `change` + goal `input`.

## 7. Pages / SEO (CLAUDE.md Rule 7 — structural)

`patreon-revenue-calculator.astro` & `spotify-royalties-calculator.astro` via `ToolLayout`:

- Exact H1: "Patreon Revenue Calculator", "Spotify Royalties Calculator" (one page = one keyword)
- One H2 per section; canonical bare-URL (no query params)
- JSON-LD: WebApplication + FAQPage + Breadcrumb on both (FAQ content from `faqs.ts`)
- `RelatedReads`: Patreon ↔ Twitch Sub Revenue + Sponsorship Calculator; Spotify ↔ YouTube Money + TikTok Coins→USD
- Add both to `TOOLS[]` in `src/lib/site.ts` (slug / name / short / desc)
- Affiliate config untouched; disclosure page auto-renders from `affiliateLinks.ts` as-is

## 8. Error handling

- **Pure layer:** `g()` guard on all numeric inputs (NaN/negative/Infinity→0); plan defaults to `standard` if invalid key; region defaults to `global` if invalid key; `creatorShare` clamped to 0–100; `net` guarded ≥ 0; goal functions return 0 for goal ≤ 0 or when per-unit net ≤ 0.
- **Island layer:** `Number(...?.dataset.value ?? 0)` reads — matches existing `KickRevenueCalculator.astro`; no unguarded `.value`.
- **Fully static, client-side, no async/fetch/external calls** (Rule 1).

## 9. Testing & verification

- `patron revenue` + `spotify royalties` describe blocks appended to `tests/calculators.test.ts`: ~22 pure tests (suite 65 → ~87)
- Build: 44 → 46 pages, green; `npm test` all pass; `npm run lint` clean
- No changes to `programmatic.test.ts` (no prog-SEO in B2)
- Verify no regression: existing 65 tests unchanged and green; all 8 existing islands/calc modules untouched

## 10. SDD task plan (Approach A — per-calculator vertical slices)

| Task     | Scope                                                                                                                | Model                                          | Depends on |
| -------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------- |
| **B2-1** | `patreonConfig.ts` + `patreon.ts` + append `describe("patreon revenue calculator")` to `tests/calculators.test.ts`   | haiku (mechanical, single-file, complete spec) | —          |
| **B2-2** | `PatreonCalculator.astro` + `patreon-revenue-calculator.astro` + `TOOLS[]` entry + FAQs                              | sonnet (integration, multi-file, parity)       | B2-1       |
| **B2-3** | `spotifyConfig.ts` + `spotify.ts` + append `describe("spotify royalties calculator")` to `tests/calculators.test.ts` | haiku (mechanical, single-file)                | —          |
| **B2-4** | `SpotifyCalculator.astro` + `spotify-royalties-calculator.astro` + `TOOLS[]` entry + FAQs                            | sonnet (integration)                           | B2-3       |

Per task: implementer subagent with curated brief → task reviewer (spec + quality) → fix loop for Critical/Important → commit with `Co-Authored-By: Claude <noreply@anthropic.com>` trailer. Continuous execution (no check-ins between tasks); stop only on BLOCKED or genuine ambiguity. Artifacts: `.superpowers/sdd/task-N-{brief,report}-b2.md`; ledger: `.superpowers/sdd/progress-b2.md`. No PR after B2. Final whole-branch review (opus) at B2 end covers `3f114ff..HEAD` (B1 + B2 combined) for the cumulative branch — but B2's per-task reviews are scoped to B2 commits.

## Sources

- Patreon Help Center — _A standard platform fee for new creators (effective Aug 4, 2025)_: https://support.patreon.com/hc/en-us/articles/36426991446797
- Patreon Help Center — _Creator fees overview_: https://support.patreon.com/hc/en-us/articles/11111747095181
- Patreon Help Center — _Pricing FAQ_: https://support.patreon.com/hc/en-us/articles/16733504643597
- Chartlex — _Spotify Royalty Rates by Country: 2026 Complete Guide_: https://www.chartlex.com/blog/money/spotify-royalty-rates-by-country-2026
- Chartlex — _Spotify Pay Per Stream 2026: $0.003-$0.005_: https://www.chartlex.com/blog/money/how-much-does-spotify-pay-per-stream-2026
- Dynamoi — _Spotify Royalty Rates through Mar 2026_: https://dynamoi.com/data/royalties/spotify
- Dynamoi — _How Much Spotify Pays Per Stream [2026 Data Study]_: https://dynamoi.com/learn/music-distribution/how-much-spotify-pays-per-stream
