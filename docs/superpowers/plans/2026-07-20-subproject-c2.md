# Sub-project C2 — CPM Modifiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in multiplicative CPM modifiers (season, niche, fill rate, skippability) to the Twitch Ad Revenue and YouTube Money calculators without changing their shipped default output.

**Architecture:** One shared editable config (`src/data/cpmModifiers.ts`) + one pure function (`src/lib/calculators/cpmModifiers.ts`) consumed by both islands. The existing pure calculators (`ads.ts`, `youtube.ts`) are untouched — the modifier is a pre-processing step in each island that feeds an effective CPM/RPM into the unchanged render path. All modifiers default to neutral (1.0×), so output is byte-identical to today until a user opens an "Advanced CPM modifiers" `<details>` panel.

**Tech Stack:** Astro 6 static, Tailwind 4, vanilla-JS islands, Vitest, TypeScript.

## Global Constraints

- **Zero backend.** All math client-side. (CLAUDE.md rule 1)
- **Rates in config, never hardcoded in components.** Every multiplier lives in `src/data/cpmModifiers.ts`; components only read it. A rate change is a one-line data edit. (rule 2)
- **`src/lib/calculators/` is pure.** No DOM, no Astro imports, no side effects. Input guards: NaN/negative/Infinity → 0 or neutral. All calculator functions have Vitest tests. (rule 3)
- **Single accent color.** Twitch purple `#9146ff` only on focus rings, primary CTAs, active tab, result accent. Everything else slate. No new colors. (rule 4)
- **Neutral opt-in defaults.** Every modifier defaults to 1.0×. Shipped default output must not change. prog-SEO output (which uses base rates) must not change.
- **Additive only.** Do not modify YouTube's existing niche/format/country logic or Twitch's existing ads-per-hour/region-CPM logic. New factors only; no double-counting.
- **Regression seam.** `src/lib/calculators/ads.ts`, `src/lib/calculators/youtube.ts`, `src/data/adConfig.ts`, `src/data/youtubeConfig.ts`, `src/lib/site.ts`, all pages, all prog-SEO routes, all other calculators must remain byte-for-byte unchanged.
- **Branch:** `build/subproject-c`, stacked on C1 tip `fcf1826`. Cumulative, no PR. Per-task commits.
- **Tests command:** `npm test` (vitest). **Lint:** `npm run lint`. **Build:** `npm run build`.

## File Structure

- **Create** `src/data/cpmModifiers.ts` — editable factor tables (season, Twitch niche, skippability) + key types. Single source of truth for all multiplier values.
- **Create** `src/lib/calculators/cpmModifiers.ts` — pure `applyCpmModifiers(base, selection)` + named-key resolver helpers + `NEUTRAL` constant. Guarded inputs.
- **Modify** `tests/calculators.test.ts` — append `cpmModifiers` describe block (import + tests). No edits to existing tests.
- **Modify** `src/data/faqs.ts` — append `cpmModifierFaqs` array export. No edits to existing FAQ arrays.
- **Modify** `src/components/calculators/AdRevenueCalculator.astro` — append Advanced `<details>` panel (season/niche/fill/skippable) + wire modifiers into render. Existing inputs untouched.
- **Modify** `src/components/calculators/YoutubeCalculator.astro` — append Advanced `<details>` panel (season/fill/skippable; no niche) + wire modifiers into render. Existing inputs untouched.
- **Modify** `src/pages/twitch-ad-revenue-calculator.astro` — merge `cpmModifierFaqs` into the `faqs` prop.
- **Modify** `src/pages/youtube-money-calculator.astro` — merge `cpmModifierFaqs` into the `faqs` prop.

**Untouched (regression seam):** `src/lib/calculators/ads.ts`, `src/lib/calculators/youtube.ts`, `src/data/adConfig.ts`, `src/data/youtubeConfig.ts`, `src/lib/site.ts`, all prog-SEO routes, all other islands/pages/calculators.

---

### Task C2-1: CPM modifiers config + pure function + tests

**Files:**
- Create: `src/data/cpmModifiers.ts`
- Create: `src/lib/calculators/cpmModifiers.ts`
- Test: `tests/calculators.test.ts` (append import + describe block)

**Interfaces:**
- Produces (consumed by C2-2 and C2-3 islands):
  - `applyCpmModifiers(base: number, s: CpmModifierSelection): number`
  - `NEUTRAL: CpmModifierSelection`
  - `seasonFactor(key: SeasonKey): number`
  - `nicheFactor(key: NicheKey): number`
  - `skippableFactor(key: SkippableKey): number`
  - `CpmModifierSelection { seasonFactor: number; nicheFactor: number; fillRatePct: number; skippableFactor: number }`
  - Types `SeasonKey`, `NicheKey`, `SkippableKey` (string unions from the config tables)

- [ ] **Step 1: Create the config file**

Create `src/data/cpmModifiers.ts`:

```ts
export const SEASON_MULTIPLIERS = {
  none: { label: "No season adjustment", factor: 1 },
  q1: { label: "Q1 (Jan–Mar, post-holiday slump)", factor: 0.8 },
  q2: { label: "Q2 (Apr–Jun)", factor: 1 },
  q3: { label: "Q3 (Jul–Sep, summer slowdown)", factor: 0.95 },
  q4: { label: "Q4 (Oct–Dec, holiday peak)", factor: 1.25 },
} as const;

export const TWITCH_NICHE_MULTIPLIERS = {
  none: { label: "No niche adjustment", factor: 1 },
  gaming: { label: "Gaming", factor: 1 },
  justchatting: { label: "Just Chatting / IRL", factor: 1.05 },
  music: { label: "Music & Performing Arts", factor: 0.9 },
  tech: { label: "Tech & Science", factor: 1.15 },
  art: { label: "Art & Creative", factor: 0.95 },
  sports: { label: "Sports", factor: 1.1 },
} as const;

export const SKIPPABLE_MULTIPLIERS = {
  standard: { label: "Standard mix", factor: 1 },
  skippable: { label: "Mostly skippable", factor: 0.85 },
  nonskippable: { label: "Mostly non-skippable", factor: 1.25 },
} as const;

export type SeasonKey = keyof typeof SEASON_MULTIPLIERS;
export type NicheKey = keyof typeof TWITCH_NICHE_MULTIPLIERS;
export type SkippableKey = keyof typeof SKIPPABLE_MULTIPLIERS;
```

- [ ] **Step 2: Create the pure function file**

Create `src/lib/calculators/cpmModifiers.ts`:

```ts
import {
  SEASON_MULTIPLIERS,
  TWITCH_NICHE_MULTIPLIERS,
  SKIPPABLE_MULTIPLIERS,
  type SeasonKey,
  type NicheKey,
  type SkippableKey,
} from "../../data/cpmModifiers";

export interface CpmModifierSelection {
  seasonFactor: number;
  nicheFactor: number;
  fillRatePct: number;
  skippableFactor: number;
}

export const NEUTRAL: CpmModifierSelection = {
  seasonFactor: 1,
  nicheFactor: 1,
  fillRatePct: 100,
  skippableFactor: 1,
};

const clamp = (n: number, lo: number, hi: number): number =>
  Number.isFinite(n) && n >= 0 ? Math.min(hi, Math.max(lo, n)) : lo;

export function applyCpmModifiers(
  base: number,
  s: CpmModifierSelection,
): number {
  const b = Number.isFinite(base) && base >= 0 ? base : 0;
  const season = clamp(s?.seasonFactor ?? 1, 0, 5);
  const niche = clamp(s?.nicheFactor ?? 1, 0, 5);
  const fill = clamp(s?.fillRatePct ?? 100, 0, 100) / 100;
  const skip = clamp(s?.skippableFactor ?? 1, 0, 5);
  return b * season * niche * fill * skip;
}

export function seasonFactor(key: SeasonKey): number {
  return SEASON_MULTIPLIERS[key]?.factor ?? 1;
}
export function nicheFactor(key: NicheKey): number {
  return TWITCH_NICHE_MULTIPLIERS[key]?.factor ?? 1;
}
export function skippableFactor(key: SkippableKey): number {
  return SKIPPABLE_MULTIPLIERS[key]?.factor ?? 1;
}
```

- [ ] **Step 3: Write the failing tests**

In `tests/calculators.test.ts`, add this import alongside the existing imports (e.g. after the `netIncome` import line near the top):

```ts
import {
  applyCpmModifiers,
  NEUTRAL,
  seasonFactor,
  nicheFactor,
  skippableFactor,
} from "../src/lib/calculators/cpmModifiers";
```

Then append this describe block at the end of the file (after the last existing `describe`/`it` block):

```ts
describe("cpmModifiers", () => {
  it("neutral selection returns base unchanged", () => {
    expect(applyCpmModifiers(4, NEUTRAL)).toBe(4);
    expect(applyCpmModifiers(0, NEUTRAL)).toBe(0);
  });

  it("applies season factor", () => {
    expect(applyCpmModifiers(4, { ...NEUTRAL, seasonFactor: 1.25 })).toBe(5);
  });

  it("applies niche factor", () => {
    expect(applyCpmModifiers(4, { ...NEUTRAL, nicheFactor: 1.15 })).toBe(4.6);
  });

  it("applies fill rate as a percentage", () => {
    expect(applyCpmModifiers(4, { ...NEUTRAL, fillRatePct: 50 })).toBe(2);
    expect(applyCpmModifiers(4, { ...NEUTRAL, fillRatePct: 100 })).toBe(4);
  });

  it("applies skippability factor", () => {
    expect(applyCpmModifiers(4, { ...NEUTRAL, skippableFactor: 1.25 })).toBe(5);
  });

  it("combines all factors multiplicatively", () => {
    // Q4 (1.25) x non-skippable (1.25) x 80% fill (0.8) = 1.25
    const sel = {
      seasonFactor: 1.25,
      nicheFactor: 1,
      fillRatePct: 80,
      skippableFactor: 1.25,
    };
    expect(applyCpmModifiers(4, sel)).toBeCloseTo(5, 10);
  });

  it("clamps fill rate to 0–100", () => {
    expect(applyCpmModifiers(4, { ...NEUTRAL, fillRatePct: 150 })).toBe(4);
    expect(applyCpmModifiers(4, { ...NEUTRAL, fillRatePct: -10 })).toBe(0);
  });

  it("clamps factors to 0–5", () => {
    expect(applyCpmModifiers(4, { ...NEUTRAL, seasonFactor: 99 })).toBe(20);
  });

  it("guards NaN/negative/Infinity base to 0", () => {
    expect(applyCpmModifiers(NaN, NEUTRAL)).toBe(0);
    expect(applyCpmModifiers(-5, NEUTRAL)).toBe(0);
    expect(applyCpmModifiers(Infinity, NEUTRAL)).toBe(0);
  });

  it("guards NaN factor to neutral", () => {
    expect(applyCpmModifiers(4, { ...NEUTRAL, seasonFactor: NaN })).toBe(4);
  });

  it("resolvers return the correct factor for named keys", () => {
    expect(seasonFactor("q4")).toBe(1.25);
    expect(seasonFactor("q1")).toBe(0.8);
    expect(nicheFactor("tech")).toBe(1.15);
    expect(skippableFactor("nonskippable")).toBe(1.25);
  });

  it("resolvers return neutral for unknown keys", () => {
    expect(seasonFactor("nope" as never)).toBe(1);
    expect(nicheFactor("nope" as never)).toBe(1);
    expect(skippableFactor("nope" as never)).toBe(1);
  });
});
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test`
Expected: all tests pass, suite grows from 103 to 115 (12 new `cpmModifiers` tests). No existing test changes.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/data/cpmModifiers.ts src/lib/calculators/cpmModifiers.ts tests/calculators.test.ts
git commit -m "feat(cpm): add CPM modifiers config + pure applyCpmModifiers + tests

Shared multiplicative modifier engine (season/niche/fill-rate/skippability)
for the Twitch Ad Revenue and YouTube Money calculators. Pure, guarded,
neutral-default. ads.ts and youtube.ts untouched.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task C2-2: Twitch Ad Revenue island — Advanced modifiers panel + FAQs

**Files:**
- Modify: `src/components/calculators/AdRevenueCalculator.astro`
- Modify: `src/data/faqs.ts` (append `cpmModifierFaqs`)
- Modify: `src/pages/twitch-ad-revenue-calculator.astro` (merge FAQs)

**Interfaces:**
- Consumes (from C2-1): `applyCpmModifiers`, `NEUTRAL`, `seasonFactor`, `nicheFactor`, `skippableFactor`, type `CpmModifierSelection`.

- [ ] **Step 1: Append `cpmModifierFaqs` to `src/data/faqs.ts`**

At the end of `src/data/faqs.ts`, append:

```ts
export const cpmModifierFaqs = [
  {
    q: "What are CPM modifiers?",
    a: "CPM modifiers are optional multipliers that adjust the base CPM (or RPM) for real-world ad-ops factors: seasonality, content niche, ad fill rate, and skippability. They default to neutral (1.0×) so your estimate is unchanged unless you enable them.",
  },
  {
    q: "Why does Q4 raise CPM?",
    a: "Q4 (October–December) is peak advertising season — holiday spend drives CPMs roughly 25% above baseline. Q1 is the post-holiday slump, typically 20% below baseline. Adjust the Season modifier to model this.",
  },
  {
    q: "What is ad fill rate?",
    a: "Fill rate is the percentage of available ad slots that actually get filled with paid ads. 100% means every slot is monetized; 50% means half go unfilled. Lower fill rate reduces effective CPM proportionally.",
  },
  {
    q: "Skippable vs non-skippable ads — what's the difference?",
    a: "Non-skippable ads command about a 25% CPM premium over skippable ads because advertisers pay for guaranteed full attention. Use 'Mostly non-skippable' if your content runs mostly pre-rolls or forced mid-rolls.",
  },
  {
    q: "Are the niche multipliers exact?",
    a: "No — Twitch does not publicly disclose CPM by content category, so the niche multipliers are illustrative relative adjustments (e.g. Tech tends higher, Music lower). Treat them as a rough directional guide, not exact rates.",
  },
];
```

- [ ] **Step 2: Merge FAQs on the Twitch Ad Revenue page**

In `src/pages/twitch-ad-revenue-calculator.astro`, change the `faqs` prop. Replace:

```astro
  faqs={adRevenueFaqs}
```

with:

```astro
  faqs={[...adRevenueFaqs, ...cpmModifierFaqs]}
```

And update the import line at the top of that page from:

```astro
import { adRevenueFaqs } from '../data/faqs';
```

to:

```astro
import { adRevenueFaqs, cpmModifierFaqs } from '../data/faqs';
```

- [ ] **Step 3: Add the Advanced modifiers panel markup to `AdRevenueCalculator.astro`**

In `src/components/calculators/AdRevenueCalculator.astro`, insert this block **immediately before** the `<div class="result" data-result ...>` line (i.e. after the closing `</fieldset>` of the inputs panel):

```html
  <details class="advanced-modifiers" data-modifiers>
    <summary>Advanced CPM modifiers</summary>
    <div class="modifier-grid">
      <label class="field">Season
        <select data-mod-season>
          <option value="none" selected>No adjustment</option>
          <option value="q1">Q1 (Jan–Mar)</option>
          <option value="q2">Q2 (Apr–Jun)</option>
          <option value="q3">Q3 (Jul–Sep)</option>
          <option value="q4">Q4 (Oct–Dec)</option>
        </select>
      </label>
      <label class="field">Niche
        <select data-mod-niche>
          <option value="none" selected>No adjustment</option>
          <option value="gaming">Gaming</option>
          <option value="justchatting">Just Chatting / IRL</option>
          <option value="music">Music &amp; Performing Arts</option>
          <option value="tech">Tech &amp; Science</option>
          <option value="art">Art &amp; Creative</option>
          <option value="sports">Sports</option>
        </select>
      </label>
      <label class="field">Fill rate
        <RangeSlider id="fill-rate" label="" min={0} max={100} step={1} value={100} suffix="%" compact />
      </label>
      <label class="field">Skippability
        <select data-mod-skippable>
          <option value="standard" selected>Standard mix</option>
          <option value="skippable">Mostly skippable</option>
          <option value="nonskippable">Mostly non-skippable</option>
        </select>
      </label>
    </div>
  </details>
```

Then add a modifier hint line **immediately after** the `<div class="sub" data-subresult></div>` line:

```html
  <div class="mod-hint" data-mod-hint hidden></div>
```

- [ ] **Step 4: Wire modifiers into the island script in `AdRevenueCalculator.astro`**

In the `<script>` block, update the import at the top. Replace:

```ts
  import { estimateAdRevenue } from '../../lib/calculators/ads';
  import { formatCurrency } from '../../lib/format';
```

with:

```ts
  import { estimateAdRevenue } from '../../lib/calculators/ads';
  import { formatCurrency } from '../../lib/format';
  import {
    applyCpmModifiers,
    seasonFactor,
    nicheFactor,
    skippableFactor,
    NEUTRAL,
  } from '../../lib/calculators/cpmModifiers';
```

Then, immediately after the existing `read` function definition (`const read = () => ({ ... });`), add a `readModifiers` helper and a `currentMultiplier` helper:

```ts
  const modSeason = form.querySelector('[data-mod-season]') as HTMLSelectElement;
  const modNiche = form.querySelector('[data-mod-niche]') as HTMLSelectElement;
  const modSkippable = form.querySelector('[data-mod-skippable]') as HTMLSelectElement;
  const modFill = form.querySelector('[data-range-slider="fill-rate"]') as HTMLElement;
  const modHint = form.querySelector('[data-mod-hint]') as HTMLElement;

  const readModifiers = () => ({
    seasonFactor: seasonFactor((modSeason?.value ?? 'none') as never),
    nicheFactor: nicheFactor((modNiche?.value ?? 'none') as never),
    fillRatePct: Number(modFill?.dataset.value ?? 100),
    skippableFactor: skippableFactor((modSkippable?.value ?? 'standard') as never),
  });

  const currentMultiplier = (sel: ReturnType<typeof readModifiers>): number => {
    const m = applyCpmModifiers(1, sel);
    return Math.round(m * 100) / 100;
  };
```

Then update the `render` function. Replace the existing `render` body's first two lines:

```ts
  const render = () => {
    const r = estimateAdRevenue(read());
```

with:

```ts
  const render = () => {
    const base = read();
    const sel = readModifiers();
    const effectiveCpm = applyCpmModifiers(base.cpm, sel);
    const r = estimateAdRevenue({ ...base, cpm: effectiveCpm });
    const mult = currentMultiplier(sel);
    if (modHint) {
      if (mult !== 1) {
        modHint.hidden = false;
        modHint.textContent = `Modifiers active: ×${mult.toFixed(2)}`;
      } else {
        modHint.hidden = true;
        modHint.textContent = '';
      }
    }
```

(The rest of the existing `render` body — the `form.querySelector('[data-result]')...` lines and the breakdown grid — stays unchanged.)

Then register change listeners on the new modifier controls. Find the existing listener-registration block:

```ts
  form.querySelectorAll('[data-range-slider]').forEach(slider => {
    slider.addEventListener('input', render);
  });
```

and replace it with:

```ts
  form.querySelectorAll('[data-range-slider]').forEach(slider => {
    slider.addEventListener('input', render);
  });
  [modSeason, modNiche, modSkippable].forEach(el => el?.addEventListener('change', render));
```

- [ ] **Step 5: Add the panel styles to `AdRevenueCalculator.astro`**

In the `<style>` block, append (before the closing `</style>`):

```css
  .advanced-modifiers { border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-surface-warm); padding: var(--spacing-4); }
  .advanced-modifiers > summary { font-weight: 800; font-size: var(--text-sm); color: var(--color-fg); cursor: pointer; }
  .advanced-modifiers[open] > summary { margin-bottom: var(--spacing-4); }
  .modifier-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--spacing-4); }
  .mod-hint { font-size: var(--text-sm); color: var(--color-muted); font-weight: 700; }
  @media (max-width: 560px) { .modifier-grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 6: Run tests + lint + build**

Run: `npm test` → expected 115/115 pass.
Run: `npm run lint` → clean.
Run: `npm run build` → expected 47 pages (unchanged), no errors.

- [ ] **Step 7: Manual smoke check**

Run `npm run dev`, open `/twitch-ad-revenue-calculator`. Confirm: result is unchanged from before (neutral default). Open "Advanced CPM modifiers", set Season=Q4 → result rises ~25%, "Modifiers active: ×1.25" appears. Set fill rate=50% → result halves. Close panel → values persist (selects keep state); result unchanged on reopen.

- [ ] **Step 8: Commit**

```bash
git add src/components/calculators/AdRevenueCalculator.astro src/data/faqs.ts src/pages/twitch-ad-revenue-calculator.astro
git commit -m "feat(cpm): add Advanced CPM modifiers panel to Twitch Ad Revenue calculator

Season/niche/fill-rate/skippability, neutral defaults, opt-in <details>.
Effective CPM feeds unchanged estimateAdRevenue. Adds cpmModifierFaqs.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task C2-3: YouTube Money island — Advanced modifiers panel

**Files:**
- Modify: `src/components/calculators/YoutubeCalculator.astro`
- Modify: `src/pages/youtube-money-calculator.astro` (merge FAQs)

**Interfaces:**
- Consumes (from C2-1): `applyCpmModifiers`, `seasonFactor`, `skippableFactor`, `NEUTRAL`. Niche is **not** wired here (YouTube already has its own niche select).

- [ ] **Step 1: Merge FAQs on the YouTube Money page**

In `src/pages/youtube-money-calculator.astro`, change the `faqs` prop. Replace:

```astro
  faqs={youtubeFaqs}
```

with:

```astro
  faqs={[...youtubeFaqs, ...cpmModifierFaqs]}
```

And update the import line from:

```astro
import { youtubeFaqs } from '../data/faqs';
```

to:

```astro
import { youtubeFaqs, cpmModifierFaqs } from '../data/faqs';
```

- [ ] **Step 2: Add the Advanced modifiers panel markup to `YoutubeCalculator.astro`**

In `src/components/calculators/YoutubeCalculator.astro`, insert this block **immediately before** the `<div class="result" data-result ...>` line:

```html
  <details class="advanced-modifiers" data-modifiers>
    <summary>Advanced CPM modifiers</summary>
    <div class="modifier-grid">
      <label class="field">Season
        <select data-mod-season>
          <option value="none" selected>No adjustment</option>
          <option value="q1">Q1 (Jan–Mar)</option>
          <option value="q2">Q2 (Apr–Jun)</option>
          <option value="q3">Q3 (Jul–Sep)</option>
          <option value="q4">Q4 (Oct–Dec)</option>
        </select>
      </label>
      <label class="field">Fill rate
        <RangeSlider id="yt-fill-rate" label="" min={0} max={100} step={1} value={100} suffix="%" compact />
      </label>
      <label class="field">Skippability
        <select data-mod-skippable>
          <option value="standard" selected>Standard mix</option>
          <option value="skippable">Mostly skippable</option>
          <option value="nonskippable">Mostly non-skippable</option>
        </select>
      </label>
    </div>
  </details>
```

Then add a modifier hint line **immediately after** the `<p class="result-note" data-result-note>...</p>` line:

```html
  <div class="mod-hint" data-mod-hint hidden></div>
```

- [ ] **Step 3: Wire modifiers into the island script in `YoutubeCalculator.astro`**

In the `<script>` block, update the imports. Replace:

```ts
  import { rangeFromRpm, earningsFromViews, adjustedRpm } from '../../lib/calculators/youtube';
  import { RPM_BY_NICHE, RPM_BY_FORMAT, RPM_BY_COUNTRY, DEFAULT_RPM } from '../../data/youtubeConfig';
  import { formatCurrency } from '../../lib/format';
```

with:

```ts
  import { rangeFromRpm, earningsFromViews, adjustedRpm } from '../../lib/calculators/youtube';
  import { RPM_BY_NICHE, RPM_BY_FORMAT, RPM_BY_COUNTRY, DEFAULT_RPM } from '../../data/youtubeConfig';
  import { formatCurrency } from '../../lib/format';
  import {
    applyCpmModifiers,
    seasonFactor,
    skippableFactor,
  } from '../../lib/calculators/cpmModifiers';
```

Then, immediately after the existing element-grab block (after the `const whatIfGrid = ...` line), add modifier element grabs + helpers:

```ts
  const modSeason = form.querySelector('[data-mod-season]') as HTMLSelectElement;
  const modSkippable = form.querySelector('[data-mod-skippable]') as HTMLSelectElement;
  const modFill = form.querySelector('[data-range-slider="yt-fill-rate"]') as HTMLElement;
  const modHint = form.querySelector('[data-mod-hint]') as HTMLElement;

  const readModifiers = () => ({
    seasonFactor: seasonFactor((modSeason?.value ?? 'none') as never),
    nicheFactor: 1,
    fillRatePct: Number(modFill?.dataset.value ?? 100),
    skippableFactor: skippableFactor((modSkippable?.value ?? 'standard') as never),
  });
  const currentMultiplier = (sel: ReturnType<typeof readModifiers>): number =>
    Math.round(applyCpmModifiers(1, sel) * 100) / 100;
```

Then update the `render` function. The existing `render` computes `low` and `high` then sets `result.textContent`. Insert the modifier application **right before** the `result.textContent = ...` line. Concretely, find:

```ts
    result.textContent = `${formatCurrency(low, 'USD')} – ${formatCurrency(high, 'USD')} / month`;
```

and insert **immediately before** it:

```ts
    const sel = readModifiers();
    const mult = currentMultiplier(sel);
    low = applyCpmModifiers(low, sel);
    high = applyCpmModifiers(high, sel);
    if (modHint) {
      if (mult !== 1) {
        modHint.hidden = false;
        modHint.textContent = `Modifiers active: ×${mult.toFixed(2)}`;
      } else {
        modHint.hidden = true;
        modHint.textContent = '';
      }
    }
```

> **Note for the implementer:** `low` and `high` are declared with `let` in the existing `render` (`let low: number, high: number;`). Confirm that is the case; if they were declared `const`, change the declaration to `let`. The reassignment above is required.

Then register change listeners. Find the existing listener block at the end of `render` setup:

```ts
  formatInputs.forEach(i => i.addEventListener('change', render));
  nicheSelect.addEventListener('change', render);
  countrySelect.addEventListener('change', render);
  viewsSlider.addEventListener('input', render);
  rpmSlider.addEventListener('input', render);
```

and append after it:

```ts
  [modSeason, modSkippable].forEach(el => el?.addEventListener('change', render));
```

(The `modFill` slider is already covered by the existing `viewsSlider.addEventListener('input', render)`? No — it is a separate slider. Add `modFill?.addEventListener('input', render);` as well.)

So the final appended block is:

```ts
  [modSeason, modSkippable].forEach(el => el?.addEventListener('change', render));
  modFill?.addEventListener('input', render);
```

- [ ] **Step 4: Add the panel styles to `YoutubeCalculator.astro`**

In the `<style>` block, append (before the closing `</style>`):

```css
  .advanced-modifiers { border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-surface-warm); padding: var(--spacing-4); }
  .advanced-modifiers > summary { font-weight: 800; font-size: var(--text-sm); color: var(--color-fg); cursor: pointer; }
  .advanced-modifiers[open] > summary { margin-bottom: var(--spacing-4); }
  .modifier-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--spacing-4); }
  .mod-hint { font-size: var(--text-sm); color: var(--color-muted); font-weight: 700; }
  @media (max-width: 560px) { .modifier-grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 5: Run tests + lint + build**

Run: `npm test` → expected 115/115 pass.
Run: `npm run lint` → clean.
Run: `npm run build` → expected 47 pages (unchanged), no errors.

- [ ] **Step 6: Manual smoke check**

Run `npm run dev`, open `/youtube-money-calculator`. Confirm: result range is unchanged from before (neutral default). Open "Advanced CPM modifiers", set Season=Q4 → both low and high rise ~25%, "Modifiers active: ×1.25" appears. Set fill=50% → range halves. The existing niche/format/country selects still work and combine with the modifiers. The `youtube-money-[views]-views` prog-SEO page is unaffected (build a sample and check its static HTML if unsure).

- [ ] **Step 7: Commit**

```bash
git add src/components/calculators/YoutubeCalculator.astro src/pages/youtube-money-calculator.astro
git commit -m "feat(cpm): add Advanced CPM modifiers panel to YouTube Money calculator

Season/fill-rate/skippability (no niche — YouTube has its own), neutral
defaults, opt-in <details>. Effective low/high RPM feeds unchanged render.
prog-SEO route untouched (neutral modifiers = 1.0x).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task C2-4: Final verify + whole-branch opus review

**Files:** none (verification only)

- [ ] **Step 1: Full test + lint + build**

Run: `npm test` → 115/115 pass.
Run: `npm run lint` → clean.
Run: `npm run build` → 47 pages, no errors.

- [ ] **Step 2: Regression-seam check**

Confirm these files are byte-unchanged vs `fcf1826` (C1 tip):
```bash
git diff fcf1826 -- src/lib/calculators/ads.ts src/lib/calculators/youtube.ts src/data/adConfig.ts src/data/youtubeConfig.ts src/lib/site.ts
```
Expected: empty diff (no changes to the pure calculators, configs, or registry).

- [ ] **Step 3: Neutral-default regression check**

Open `/twitch-ad-revenue-calculator` and `/youtube-money-calculator` with the Advanced panel **closed**. Confirm the default result numbers match the pre-C2 numbers (no modifier = ×1.00). The build output for prog-SEO pages (`dist/youtube-money-...-views/`) must also be unchanged.

- [ ] **Step 4: Dispatch whole-branch opus review**

Dispatch an opus reviewer over the full C2 diff (`fcf1826..HEAD`) checking: CLAUDE.md 8 rules, neutral-default invariant, regression seam, pure-function guards, FAQ JSON-LD validity, no double-counting with existing factors. Resolve any Critical/Important findings; record Minors.

- [ ] **Step 5: Update memory + ledger**

Update `.superpowers/sdd/progress-c2.md` and the memory files (`project-sub-roadmap.md`, `project-sub-project-B-scope.md` if appropriate) with C2's commit range, test/page counts, and review verdict.

- [ ] **Step 6: No PR (stacked)**

C2 is stacked on C1 on `build/subproject-c`. Do not open a PR — the user's strategy is one cumulative PR after all wanted sub-projects. Report READY TO MERGE status and await the user's next instruction (likely Sub-project D or a cumulative PR).

---

## Self-Review (run by plan author)

**Spec coverage:**
- Factors & values table → Task C2-1 Step 1 (config) ✅
- Pure math layer (applyCpmModifiers, NEUTRAL, resolvers, guards) → Task C2-1 Step 2 ✅
- Tests (neutral, per-factor, combined, clamp, guards, resolvers) → Task C2-1 Step 3 ✅
- Twitch Advanced panel (season/niche/fill/skippable) → Task C2-2 Step 3 ✅
- YouTube Advanced panel (season/fill/skippable, no niche) → Task C2-3 Step 2 ✅
- Modifier-active hint → C2-2 Step 3 & C2-3 Step 2 ✅
- FAQ `cpmModifierFaqs` → C2-2 Step 1 ✅; merged on both pages → C2-2 Step 2 & C2-3 Step 1 ✅
- Regression seam (ads.ts/youtube.ts/configs/registry/pages/prog-SEO untouched) → C2-4 Step 2 ✅
- prog-SEO unaffected (neutral default) → C2-4 Step 3 ✅
- 8 CLAUDE.md rules → Global Constraints + C2-4 Step 4 ✅
- SDD task split C2-1..C2-4 → task structure ✅

**Placeholder scan:** None. All code blocks complete. The one implementer note flags a `let` vs `const` declaration check in the YouTube `render` function — an explicit instruction, not a placeholder.

**Type consistency:** `CpmModifierSelection` fields (`seasonFactor`, `nicheFactor`, `fillRatePct`, `skippableFactor`) match across config types, pure fn, tests, and both islands. Resolver names (`seasonFactor`, `nicheFactor`, `skippableFactor`) match between C2-1 (produced) and C2-2/C2-3 (consumed). `NEUTRAL` used in tests only (islands build selections dynamically). RangeSlider id `fill-rate` (Twitch) and `yt-fill-rate` (YouTube) — distinct, matching the `data-range-slider` lookups in their respective scripts.

No issues found. Plan is complete.