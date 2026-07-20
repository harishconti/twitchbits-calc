# Sub-project C2 — CPM Modifiers (Design)

**Date:** 2026-07-20
**Branch:** `build/subproject-c` (stacked on C1 tip `fcf1826`)
**Predecessors:** Sub-project A (prog-SEO), B1 (Kick + Twitch Ad), B2 (Patreon + Spotify), C1 (Net Income/Tax)
**Status:** Design — approved 2026-07-20

## Purpose

Enhance the two CPM/RPM-based calculators — **Twitch Ad Revenue** and **YouTube Money** — with multiplicative CPM modifiers (season, niche, ad-density/fill rate, skippability) so creators can model how real-world ad-ops factors move their revenue. TikTok is intentionally excluded: its calculator is coin→USD (gifts/diamonds), not ad revenue, so it has no CPM/RPM axis to modify.

This is a **fresh brainstorm→spec→plan→SDD cycle**. No prior sub-project's design carries over.

## Scope decisions (from brainstorm)

1. **Two tools, additive only.** C2 touches the existing Twitch Ad Revenue and YouTube Money calculators. It adds new factors only; it does **not** alter or duplicate the factors those tools already have (YouTube's niche/format/country selects; Twitch's ads-per-hour + per-region CPM default). No double-counting.
2. **Neutral opt-in defaults.** Every new modifier defaults to neutral (1.0×). The calculator output is byte-identical to today until a user opens the Advanced panel and selects something. Zero regression on shipped default output; the panel is purely opt-in. This also guarantees prog-SEO output (which uses neutral/base rates) cannot drift.
3. **Shared config + shared pure function.** One editable config (`src/data/cpmModifiers.ts`) and one pure function (`src/lib/calculators/cpmModifiers.ts`) consumed by both islands. Satisfies CLAUDE.md rule 2 (rates in one editable place) and rule 3 (one pure, tested function).
4. **No change to existing pure calculators.** `src/lib/calculators/ads.ts` and `src/lib/calculators/youtube.ts` are untouched. The modifier is a pre-processing step in the island that feeds an `effectiveCpm` (or adjusted low/high RPM) into the existing pure calc. This keeps the regression seam clean.

## Factors & values

Four factors, all multiplicative, all defaulting to neutral (1.0×). Combined multiplier = `season × niche × (fill/100) × skippable`.

| Factor                     | Options (multiplier)                                                                                          | Default                      | Source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Season**                 | Q1 0.80× · Q2 1.00× · Q3 0.95× · Q4 1.25×                                                                     | "No season adjustment" 1.00× | CPM seasonality: Q4 runs 1.13–1.30× baseline (Meta/TikTok), Q1 "January slump" ~0.60–0.70× of Q4 peak. Conservative rounded figures. ([Freestar](https://freestar.com/what-to-know-about-seasonality-and-cpms/), [MonetizationGuy](https://monetizationguy.com/articles/cpm-seasonality), [Gupta Media](https://www.guptamedia.com/social-media-ads-cost), [Red Volcano](https://www.redvolcano.io/pages/blog/seasonal-advertising-trends-when-to-expect-your-highest-and-lowest-cpms)) |
| **Niche** _(Twitch only)_  | Gaming 1.00× · Just Chatting/IRL 1.05× · Music 0.90× · Tech/Science 1.15× · Art/Creative 0.95× · Sports 1.10× | "No niche adjustment" 1.00×  | Relative multipliers — Twitch ad CPM by category is not publicly disclosed; values are illustrative relative adjustments, flagged as such in FAQs. Config is the editable source of truth (CLAUDE.md rule 2).                                                                                                                                                                                                                                                                           |
| **Fill rate / ad density** | Slider 0–100% → multiplier = `fill/100`                                                                       | 100% = 1.00×                 | Ad-ops standard: fill rate = filled impressions / total ad slots. Maps directly to the neutral-default constraint (100% = 1.0×).                                                                                                                                                                                                                                                                                                                                                        |
| **Skippability**           | Mostly skippable 0.85× · Standard mix 1.00× · Mostly non-skippable 1.25×                                      | "Standard mix" 1.00×         | ~30% non-skippable CPM premium, consistent across verticals (DigitalApplied 2026: non-skippable $14.85 vs skippable $11.42). ([DigitalApplied](https://www.digitalapplied.com/blog/youtube-ads-benchmarks-2026-cpv-cpm-ctr-industry), [Store Growers](https://www.storegrowers.com/youtube-ads-benchmarks/), [ThumbMentor](https://thumbmentor.com/en/blog/youtube-ad-formats-explained))                                                                                               |

**Niche is Twitch-only** because YouTube already has a niche select; adding a second would double-count (decision 1).

## Architecture

```
src/data/cpmModifiers.ts          ← editable factor tables + NEUTRAL constant (rule 2)
src/lib/calculators/cpmModifiers.ts ← pure applyCpmModifiers() + factor resolvers (rule 3)
src/components/calculators/
  AdRevenueCalculator.astro       ← + Advanced <details> panel (season/niche/fill/skippable)
  YoutubeCalculator.astro         ← + Advanced <details> panel (season/fill/skippable; no niche)
src/data/faqs.ts                   ← + cpmModifierFaqs (4–5 Q/A)
tests/calculators.test.ts          ← + describe block (cpmModifiers)
```

**Untouched (regression seam):** `src/lib/calculators/ads.ts`, `src/lib/calculators/youtube.ts`, `src/data/adConfig.ts`, `src/data/youtubeConfig.ts`, `src/lib/site.ts` (TOOLS), all pages, all prog-SEO routes, all other calculators.

## Pure math layer

`src/lib/calculators/cpmModifiers.ts` (pure, no DOM, guarded inputs):

```ts
export interface CpmModifierSelection {
  seasonFactor: number; // default 1
  nicheFactor: number; // default 1 (Twitch only; YouTube passes 1)
  fillRatePct: number; // 0–100, default 100
  skippableFactor: number; // default 1
}

export const NEUTRAL: CpmModifierSelection = {
  seasonFactor: 1,
  nicheFactor: 1,
  fillRatePct: 100,
  skippableFactor: 1,
};

export function applyCpmModifiers(
  base: number,
  s: CpmModifierSelection,
): number {
  const b = Number.isFinite(base) && base >= 0 ? base : 0;
  // Factors are multipliers: missing/NaN → neutral (1); fill → 100. The base
  // is a quantity: NaN/negative/Infinity → 0. Negative-finite clamps to lo.
  const clampFactor = (n: number | undefined, fallback: number): number =>
    n == null || !Number.isFinite(n) ? fallback : Math.min(5, Math.max(0, n));
  const clampFill = (n: number | undefined): number =>
    n == null || !Number.isFinite(n) ? 100 : Math.min(100, Math.max(0, n));
  const season = clampFactor(s.seasonFactor, 1);
  const niche = clampFactor(s.nicheFactor, 1);
  const fill = clampFill(s.fillRatePct) / 100;
  const skip = clampFactor(s.skippableFactor, 1);
  return b * season * niche * fill * skip;
}

// Named-option resolvers — keep islands thin, tables in config
export function seasonFactor(key: string): number;
export function nicheFactor(key: string): number;
export function skippableFactor(key: string): number;
```

**Usage:**

- Twitch island: `effectiveCpm = applyCpmModifiers(cpm, selection)` → passes `{ cpm: effectiveCpm, ... }` into unchanged `estimateAdRevenue`.
- YouTube island: `low' = applyCpmModifiers(low, selection)`, `high' = applyCpmModifiers(high, selection)` → fed into unchanged `rangeFromRpm`/render.

Input guards (rule 3): NaN/negative/Infinity → 0 or neutral; fill-rate clamped to 0–100; each factor clamped to 0–5 to bound the product.

## UI / island changes

A collapsible **"Advanced CPM modifiers"** `<details>` panel appended at the bottom of both `AdRevenueCalculator.astro` and `YoutubeCalculator.astro`, rendered closed (no `open` attribute). Contents:

- **Season** — `<select>`: No adjustment / Q1 / Q2 / Q3 / Q4
- **Niche** _(Twitch only)_ — `<select>`: No adjustment / Gaming / Just Chatting / Music / Tech / Art / Sports
- **Fill rate** — `<RangeSlider>` 0–100%, default 100, suffix `%`
- **Skippability** — `<select>`: Standard mix / Mostly skippable / Mostly non-skippable

On any change the island resolves each option to its factor via the pure resolvers, builds a `CpmModifierSelection`, calls `applyCpmModifiers`, and re-renders through the existing render path (result formatting unchanged). A small "Modifiers active: ×1.30" hint appears near the result when the combined multiplier ≠ 1.0, so users see exactly what's applied. Existing inputs and result formatting are untouched.

`<details>` is chosen deliberately: native HTML disclosure, zero JS to toggle, keyboard-accessible, and closed by default — it mirrors the "opt-in, neutral default" decision at the DOM level.

## Pages, registry, FAQs, prog-SEO

- **Pages:** `twitch-ad-revenue-calculator.astro` and `youtube-money-calculator.astro` — no structural change; the island swap is internal to the component. No new pages.
- **Registry:** `src/lib/site.ts` `TOOLS[]` unchanged (no new tool).
- **FAQs:** add `cpmModifierFaqs` to `src/data/faqs.ts` (4–5 Q/A: "What are CPM modifiers?", "Why does Q4 raise CPM?", "What is fill rate?", "Skippable vs non-skippable?", "Are niche multipliers exact?"). Fed into FAQPage JSON-LD on the two tool pages via the existing tool-specific FAQ rendering path.
- **Prog-SEO:** `youtube-money-[views]-views.astro` uses base RPM only. Neutral default = 1.0× means prog-SEO output is already correct and **unaffected** — this is the payoff of neutral defaults.
- **JSON-LD:** WebApplication + FAQPage + Breadcrumb on the two tool pages remain valid; FAQPage gains the new Q/A entries.

## CLAUDE.md rule compliance

1. **Zero backend** — all client-side. ✅
2. **Rates in config** — all multipliers in `src/data/cpmModifiers.ts`, one-line edit propagates. ✅
3. **Pure calculators** — new `cpmModifiers.ts` is pure, guarded, Vitest-tested; `ads.ts`/`youtube.ts` untouched. ✅
4. **Single accent** — modifiers use existing slate/purple tokens; no new colors. ✅
5. **No render-blocking 3rd-party** — none added. ✅
6. **Performance** — `<details>` is free; no new JS weight beyond a small island addition. ✅
7. **Structural SEO** — no new pages; existing H1/H2/canonical/JSON-LD preserved; FAQPage extended. ✅
8. **Affiliate IDs config** — n/a (no affiliate changes). ✅

## SDD task split (for the implementation plan)

Mirrors B1/B2/C1 vertical-slice shape. Cumulative on `build/subproject-c` off `fcf1826`, per-task commits, same-branch stacking (no PR).

- **C2-1:** `src/data/cpmModifiers.ts` config + `src/lib/calculators/cpmModifiers.ts` pure fn + tests (sonnet)
- **C2-2:** Twitch Ad island Advanced panel + FAQ wiring (haiku)
- **C2-3:** YouTube island Advanced panel (haiku)
- **C2-4:** Final verify + lint + whole-branch opus review (sonnet)

## Testing

New `describe("cpmModifiers", ...)` block in `tests/calculators.test.ts`:

- Neutral `NEUTRAL` selection returns base unchanged (byte-identical to no modifiers).
- Each factor multiplies independently (season only, niche only, fill only, skippable only).
- Combined multiplication (e.g. Q4 × non-skippable × 80% fill = 1.25 × 1.25 × 0.80 = 1.25).
- Clamping: fill 150% → 100% (=1.0), fill negative → 0, factor >5 clamped to 5, NaN → neutral.
- Zero base → 0.
- Resolver helpers return correct factor for named keys; unknown key → 1 (neutral).

Suite: 103 → ~113. Existing tests unchanged (regression seam).

## Open / deferred

- Niche multipliers for Twitch are illustrative (Twitch CPM not publicly disclosed); flagged in FAQs and editable in config for future refinement.
- No per-factor "preset" scenarios (e.g. "Holiday peak" preset) — YAGNI; users compose factors manually.
- Mobile layout for the Advanced panel follows the existing island responsive rules (`@media max-width`).
