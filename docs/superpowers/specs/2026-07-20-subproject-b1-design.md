# Sub-project B1 — Design Spec

**Date:** 2026-07-20
**Branch:** `build/twitch-bits-hub` (stacked on Sub-project A; no PR until the cumulative end-of-roadmap PR)
**Execution model:** Subagent-Driven Development (SDD), 4 tasks, continuous execution
**Parent roadmap:** Sub-project B of the A–E decomposition (see `docs/superpowers/plans/2026-07-19-twitch-bits-hub.md`). B1 is the streaming-side pair; B2 (Patreon / Spotify) follows separately.

## 1. Goal

Add two new calculator tools to the Creator Calculator Hub, following the existing data-driven pattern (config in `src/data/*.ts`, pure guarded math in `src/lib/calculators/*.ts`, vanilla-JS island in `src/components/calculators/*.astro`, `ToolLayout` page):

1. **Kick Revenue Calculator** — full combined revenue (subs + Kicks + ads/CPM) foregrounding Kick's 95/5 sub split as the differentiator vs Twitch's 50/50.
2. **Twitch Ad Revenue Calculator** — standalone focused tool estimating ad revenue from impressions (CPM × viewers × ad slots × streams), distinct from the ad panel inside the existing combined Twitch Revenue Calculator.

Both ship as **single tool pages only** — no programmatic-SEO variant pages, no `ToolContent` depth blocks (lighter than Sub-project A; prog-SEO may retrofit in a later sub-project).

## 2. Non-goals

- Do **not** modify `src/lib/calculators/revenue.ts` or `src/components/calculators/RevenueCalculator.astro` (Approach A — no regression to the live, 45/45-tested combined Twitch Revenue Calculator).
- Do **not** extract/refactor the existing combined ad math into a shared function. Two ad formulas coexist (combined "viewer-minutes × CPM" and standalone "impressions × CPM") — different intents, deliberate non-DRY.
- Do **not** add programmatic-SEO routes or `toolContent.ts` blocks for B1.
- Do **not** fabricate Kick affiliate/referral IDs. `src/data/affiliateLinks.ts` and the disclosure page are untouched.
- Do **not** open a PR after B1 — stack on `build/twitch-bits-hub` for the cumulative roadmap PR.

## 3. Architecture & file plan

### New files (7)

| File                                                     | Purpose                                                         |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| `src/data/kickConfig.ts`                                 | Kick sub prices, 95/5 split default + presets, Kicks face value |
| `src/lib/calculators/kick.ts`                            | Pure `estimateKickRevenue` + `kickSubsForGoal`                  |
| `src/components/calculators/KickRevenueCalculator.astro` | Three-panel island (subs/kicks/ads)                             |
| `src/pages/kick-revenue-calculator.astro`                | ToolLayout page                                                 |
| `src/lib/calculators/ads.ts`                             | Pure `estimateAdRevenue` (impressions-based)                    |
| `src/components/calculators/AdRevenueCalculator.astro`   | Focused ad island                                               |
| `src/pages/twitch-ad-revenue-calculator.astro`           | ToolLayout page                                                 |

### Modified files (4)

- `src/lib/site.ts` — add 2 entries to `TOOLS[]` (kick-revenue-calculator, twitch-ad-revenue-calculator)
- `src/data/faqs.ts` — add `kickRevenueFaqs` + `adRevenueFaqs` exports (feed visible FAQ + JSON-LD)
- `src/data/adConfig.ts` — add `AD_INPUT_DEFAULTS` (existing `AD_CPM_DEFAULTS` + `MIN_WAGE_USD_HOURLY` untouched)
- `tests/calculators.test.ts` — append `describe("kick revenue calculator")` + `describe("ad revenue calculator")` blocks (established convention: all calculator math tests live in this one shared file)

## 4. Data config

### `src/data/kickConfig.ts` (new)

Sourced from Kick.com Help Center and streamhub.world (see Sources).

```ts
export const KICK_SUB_PRICES = {
  tier1: 4.99,
  tier2: 9.99,
  tier3: 24.99,
} as const;
export const KICK_SPLIT_DEFAULT = 0.95; // streamer keeps 95%
export const KICK_SPLIT_PRESETS = [
  { value: 0.95, label: "95/5 (Kick standard)" },
  { value: 0.5, label: "50/50" },
  { value: 1.0, label: "100% (custom deal)" },
];
export const KICKS_FACE_USD_PER_100 = 1.09; // 100 KICKs face value
```

Design note: `KICKS_FACE_USD_PER_100` is stored as **face value**; the 95/5 split is applied in the calc (`kicks × face/100 × split`), not pre-baked into a net rate. This keeps the split as a single editable lever that propagates to subs _and_ Kicks (CLAUDE.md Rule 2). No Prime entry (Kick has no Prime). Gift subs use tier1 price, matching `revenue.ts` convention.

### `src/data/adConfig.ts` (extend — existing constants untouched)

```ts
export const AD_INPUT_DEFAULTS = {
  adsPerHour: 3,
  hoursPerStream: 4,
  streamsPerMonth: 20,
  viewers: 50,
};
```

CPM default for the ad island still comes from the existing `AD_CPM_DEFAULTS.us` (= 4.0); no new CPM constant.

## 5. Pure functions + tests

All pure functions follow CLAUDE.md Rule 3: no DOM, no Astro imports, no side effects, `g(n) = Number.isFinite(n) && n >= 0 ? n : 0` guard on every numeric input.

### `src/lib/calculators/kick.ts`

```ts
import {
  KICK_SUB_PRICES,
  KICK_SPLIT_DEFAULT,
  KICKS_FACE_USD_PER_100,
} from "../../data/kickConfig";
import { MIN_WAGE_USD_HOURLY } from "../../data/adConfig";

export interface KickRevenueInput {
  subs: { tier1: number; tier2: number; tier3: number; gift: number };
  split: number; // 0.95 default
  kicks: number; // KICKs received
  ads: { cpm: number; minutes: number; viewers: number };
}
```

- `estimateKickRevenue(i)`:
  - `split = (i.split > 0 && i.split <= 1) ? i.split : KICK_SPLIT_DEFAULT`
  - `subsUsd = (g(tier1)×4.99 + g(tier2)×9.99 + g(tier3)×24.99 + g(gift)×4.99) × split`
  - `kicksUsd = g(i.kicks) × (KICKS_FACE_USD_PER_100 / 100) × split` (95/5 applies to Kicks)
  - `adsUsd = g(cpm) × (g(minutes)/1000) × g(viewers)` — **no split** (Kick pays 100% on ads; mirrors existing Twitch combined calc)
  - `hoursPerMonth = 120`; `hourlyEquivalent = monthlyTotal / 120`
  - returns `{monthly:{subs,kicks,ads,total}, annual:{subs,kicks,ads,total}, hourlyEquivalent, minWageMultiple, subsBreakdown:{tier1,tier2,tier3,gift,total}}`
- `kickSubsForGoal(goalUsd, split = KICK_SPLIT_DEFAULT)`: guards `goalUsd` finite/>0 else 0; clamps split; returns `Math.ceil(goalUsd / (KICK_SUB_PRICES.tier1 × split))`

### `src/lib/calculators/ads.ts`

```ts
export interface AdRevenueInput {
  cpm: number;
  viewers: number;
  adsPerHour: number;
  hoursPerStream: number;
  streamsPerMonth: number;
}
```

- `estimateAdRevenue(i)`:
  - `impressionsPerStream = g(adsPerHour) × g(hoursPerStream) × g(viewers)`
  - `monthlyImpressions = impressionsPerStream × g(streamsPerMonth)`
  - `monthly = (monthlyImpressions / 1000) × g(cpm)`
  - `annual = monthly × 12`
  - `rpmPerViewer = g(viewers) > 0 ? monthly / g(viewers) : 0`
  - returns `{monthly, annual, impressionsPerStream, monthlyImpressions, rpmPerViewer}`

### Tests (~20 total, appended to `tests/calculators.test.ts`)

Per repo convention, all calculator math tests live in the single shared file `tests/calculators.test.ts` (currently 27 tests across 6 `describe` blocks). B1 appends two new `describe` blocks:

- `describe("kick revenue calculator")`: NaN/negative/Infinity→0 on every field; split clamping (≤0, >1, NaN → 0.95); subs math at 95/5; Kicks face-value×split; ads no-split; breakdown sums equal monthly total; annual = monthly×12; hourlyEquivalent; minWageMultiple; `kickSubsForGoal` guards + ceil. ~12 `it` blocks.
- `describe("ad revenue calculator")`: guards on every field; impressions math; monthly/annual; zero-viewer `rpmPerViewer` = 0; non-zero RPM correctness; default-inputs sanity. ~8 `it` blocks.

Suite total: 45 → ~65 tests.

## 6. Islands (vanilla-JS, existing pattern)

### `src/components/calculators/KickRevenueCalculator.astro`

Three-panel grid mirroring `RevenueCalculator.astro`:

- **Subs panel**: Tier 1 ($4.99), Tier 2 ($9.99), Tier 3 ($24.99), Gift — `RangeSlider` each; Split `<select>` bound to `KICK_SPLIT_PRESETS` (95/5 selected)
- **Kicks panel**: Kicks received `RangeSlider`
- **Ads panel**: CPM (default `AD_CPM_DEFAULTS.us`), Minutes/stream, Avg viewers — `RangeSlider` each
- Result: `{monthly.total}/month`; subresult: `≈ {annual.total}/year · {hourlyEquivalent}/hr ({minWageMultiple}× min wage)`
- Breakdown grid: Tier1/Tier2/Tier3/Gift/Kicks/Ads rows
- Goal calc: monthly goal `<input type="number">` → `kickSubsForGoal(goal, split)` → "At 95/5 you need **N** Tier 1 subs/month"
- Inline `<script>` reads sliders via `data-range-slider` dataset (existing pattern), `?? 0` fallback, `render()` on every input + split `change` + goal `input`

### `src/components/calculators/AdRevenueCalculator.astro`

Focused single panel:

- Inputs: CPM (default `AD_CPM_DEFAULTS.us`), Avg concurrent viewers, Ads/hour (default 3), Hours/stream (default 4), Streams/month (default 20) — all `RangeSlider`
- Result: `{monthly}/month`; subresult: `≈ {annual}/year · {rpmPerViewer}/viewer/month`
- Breakdown: per-stream impressions, monthly impressions, effective CPM
- No goal calc (inverse is viewer-dependent; would dilute the focused tool)

## 7. Pages / SEO (CLAUDE.md Rule 7 — structural)

`kick-revenue-calculator.astro` & `twitch-ad-revenue-calculator.astro` via `ToolLayout`:

- Exact H1: "Kick Revenue Calculator", "Twitch Ad Revenue Calculator" (one page = one keyword)
- One H2 per section; canonical bare-URL (no query params)
- JSON-LD: WebApplication + FAQPage + Breadcrumb on both (FAQ content from `faqs.ts`)
- `RelatedReads`: Kick ↔ Twitch Revenue + Twitch Sub Revenue; Ad ↔ Twitch Revenue + YouTube Money
- Add both to `TOOLS[]` in `src/lib/site.ts` (slug / name / short / desc)
- Affiliate config untouched; disclosure page auto-renders from `affiliateLinks.ts` as-is

## 8. Error handling

- Pure layer: `g()` guard on all numeric inputs (NaN/negative/Infinity→0); split clamped to `(0,1]` else `KICK_SPLIT_DEFAULT`; zero-viewer guard on `rpmPerViewer`
- Island layer: `Number(...?.dataset.value ?? 0)` reads — matches existing `RevenueCalculator.astro`; no unguarded `.value`
- Fully static, client-side, no async/fetch/external calls (Rule 1)

## 9. Testing & verification

- `kick` + `ad revenue` describe blocks appended to `tests/calculators.test.ts`: ~20 pure tests (suite 45 → ~65)
- Build: 42 → 44 pages, green; `npm test` all pass; `npm run lint` clean
- No changes to `programmatic.test.ts` (no prog-SEO in B1)
- Verify no regression: existing `revenue.test.ts` and `programmatic.test.ts` unchanged and green

## 10. SDD task plan (Approach 1 — per-calculator vertical slices)

| Task     | Scope                                                                                                                    | Model                                                           | Depends on |
| -------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ---------- |
| **B1-1** | `kickConfig.ts` + `kick.ts` + append `describe("kick revenue calculator")` to `tests/calculators.test.ts`                | cheap (mechanical, single-file, complete spec)                  | —          |
| **B1-2** | `KickRevenueCalculator.astro` + `kick-revenue-calculator.astro` + `TOOLS[]` entry + FAQs                                 | sonnet (integration, multi-file, parity with RevenueCalculator) | B1-1       |
| **B1-3** | `adConfig.ts` `AD_INPUT_DEFAULTS` + `ads.ts` + append `describe("ad revenue calculator")` to `tests/calculators.test.ts` | cheap (mechanical, single-file)                                 | —          |
| **B1-4** | `AdRevenueCalculator.astro` + `twitch-ad-revenue-calculator.astro` + `TOOLS[]` entry + FAQs                              | sonnet (integration)                                            | B1-3       |

Per task: implementer subagent with curated brief → task reviewer (spec + quality) → fix loop for Critical/Important → commit with `Co-Authored-By: Claude <noreply@anthropic.com>` trailer. Continuous execution (no check-ins between tasks); stop only on BLOCKED or genuine ambiguity. Artifacts: `.superpowers/sdd/task-B1-{n}-{brief,report}.md`; ledger: `.superpowers/sdd/progress-b1.md`. No PR after B1.

## Sources

- Kick.com Help Center — _Understanding KICK's revenue split_ (95/5 subs + Kicks, 100% ad revenue to streamer): https://help.kick.com/en/articles/15159722-understanding-kick-s-revenue-split
- Kick.com Help Center — _KICK payout schedule, thresholds, and methods_: https://help.kick.com/en/articles/15159725-kick-payout-schedule-thresholds-and-methods
- win.gg — _All about the KICKs currency_ (100 KICKs = $1.09 face value): https://win.gg/kicks-currency-buy-kick-gifts/
- streamhub.world — _Kick Streamer Payouts Explained_: https://streamhub.world/streamer-blog/kick/1121-kick-streamer-payouts-explained-how-to-earn-and-withdraw-money/
