# Sub-project B1 — Kick Revenue + Twitch Ad Revenue Calculators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new single-page creator-economy calculators — Kick Revenue (full combined: subs + Kicks + ads at 95/5) and Twitch Ad Revenue (standalone, impressions-based) — following the hub's data-driven pattern, with no regression to the existing combined Twitch Revenue Calculator.

**Architecture:** Additive only. New `src/data/kickConfig.ts` + `src/lib/calculators/kick.ts` (pure) + `KickRevenueCalculator.astro` island + `/kick-revenue-calculator` page. New `src/lib/calculators/ads.ts` (pure) + `AdRevenueCalculator.astro` island + `/twitch-ad-revenue-calculator` page, plus `AD_INPUT_DEFAULTS` appended to `src/data/adConfig.ts`. Tests appended to the shared `tests/calculators.test.ts`. Registry (`TOOLS[]`) and FAQs (`faqs.ts`) get two new entries each. No existing calculator file is modified.

**Tech Stack:** Astro 6 static output, Tailwind 4 (`@tailwindcss/vite`), vanilla-JS islands, Vitest 3 (`environment: node`), TypeScript. Pure math in `src/lib/calculators/`, config in `src/data/`, islands in `src/components/calculators/`, pages via `src/layouts/ToolLayout.astro`.

## Global Constraints

- **Zero backend** (CLAUDE.md Rule 1): no DB, no auth, no API keys, no SSR/edge, no fetch. All math client-side.
- **Rates never hardcoded in components** (Rule 2): every rate/split/price reads from `src/data/*.ts`. Kick sub prices, 95/5 split, and `KICKS_FACE_USD_PER_100` live in `kickConfig.ts`; ad CPM default reuses `AD_CPM_DEFAULTS.us`; `AD_INPUT_DEFAULTS` lives in `adConfig.ts`.
- **`src/lib/calculators/` is pure** (Rule 3): no DOM, no Astro imports, no side effects. Input guards: NaN/negative/Infinity → 0. All calculator functions have Vitest tests.
- **Single accent color** (Rule 4): Twitch purple `#9146ff` (the `--color-accent` token) only on focus rings, primary CTAs, active tab, result accent. Everything else slate. No neon gradients. Islands inherit existing component styles (RangeSlider, panels) — do not introduce new colors.
- **No render-blocking 3rd-party scripts** (Rule 5): no new analytics.
- **Performance bar** (Rule 6): Lighthouse ≥ 95, LCP < 1.2s, TBT < 50ms. Two new static pages must not regress this.
- **SEO is structural** (Rule 7): one page = one keyword, exact H1, one H2 per section, canonical bare-URL, WebApplication + FAQPage + Breadcrumb JSON-LD. `ToolLayout` already builds WebApp + Breadcrumb JSON-LD and renders FAQ; the page supplies `title`/`description`/`slug`/`crumbs`/`faqs`.
- **Affiliate IDs are config, not env vars** (Rule 8): do NOT add Kick affiliate IDs; `affiliateLinks.ts` untouched. The disclosure page auto-renders.
- **Branch:** `build/twitch-bits-hub`. Do NOT push a red build. Do NOT open a PR (stack for the cumulative roadmap PR).
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- **Test convention:** calculator math tests are appended to the shared `tests/calculators.test.ts` (do NOT create `src/lib/calculators/*.test.ts` files). Run `npm test` = `vitest run`.

---

## File Structure

**New files (7):**

- `src/data/kickConfig.ts` — Kick sub prices, 95/5 split default + presets, Kicks face value. Single editable source of truth for Kick economics.
- `src/lib/calculators/kick.ts` — pure `estimateKickRevenue(i: KickRevenueInput)` + `kickSubsForGoal(goalUsd, split)`. Mirrors `src/lib/calculators/revenue.ts` shape with Kick economics.
- `src/components/calculators/KickRevenueCalculator.astro` — three-panel vanilla-JS island (Subs / Kicks / Ads) mirroring `RevenueCalculator.astro`.
- `src/pages/kick-revenue-calculator.astro` — `ToolLayout` page, H1 "Kick Revenue Calculator".
- `src/lib/calculators/ads.ts` — pure `estimateAdRevenue(i: AdRevenueInput)` (impressions-based).
- `src/components/calculators/AdRevenueCalculator.astro` — focused single-panel vanilla-JS island.
- `src/pages/twitch-ad-revenue-calculator.astro` — `ToolLayout` page, H1 "Twitch Ad Revenue Calculator".

**Modified files (4):**

- `src/data/adConfig.ts` — append `AD_INPUT_DEFAULTS` (existing `AD_CPM_DEFAULTS` + `MIN_WAGE_USD_HOURLY` untouched).
- `src/lib/site.ts` — append 2 entries to `TOOLS[]`.
- `src/data/faqs.ts` — append `kickRevenueFaqs` + `adRevenueFaqs` exports.
- `tests/calculators.test.ts` — append 2 `describe` blocks (kick revenue, ad revenue).

**Untouched (do not modify — no-regression):** `src/lib/calculators/revenue.ts`, `src/components/calculators/RevenueCalculator.astro`, `src/data/programmatic.ts`, `src/data/affiliateLinks.ts`.

---

## Task 1: Kick config + pure calculator + tests

**Files:**

- Create: `src/data/kickConfig.ts`
- Create: `src/lib/calculators/kick.ts`
- Modify: `tests/calculators.test.ts` (append imports + one `describe` block)

**Interfaces:**

- Consumes: `MIN_WAGE_USD_HOURLY` from `src/data/adConfig.ts` (existing export, value `7.25`).
- Produces:
  - `KICK_SUB_PRICES`, `KICK_SPLIT_DEFAULT`, `KICK_SPLIT_PRESETS`, `KICKS_FACE_USD_PER_100` (from `kickConfig.ts`)
  - `estimateKickRevenue(i: KickRevenueInput): KickRevenueResult`
  - `kickSubsForGoal(goalUsd: number, split?: number): number`
  - `interface KickRevenueInput { subs: { tier1: number; tier2: number; tier3: number; gift: number }; split: number; kicks: number; ads: { cpm: number; minutes: number; viewers: number } }`
  - `interface KickRevenueResult { monthly: { subs: number; kicks: number; ads: number; total: number }; annual: { subs: number; kicks: number; ads: number; total: number }; hourlyEquivalent: number; minWageMultiple: number; subsBreakdown: { tier1: number; tier2: number; tier3: number; gift: number; total: number } }`

- [ ] **Step 1: Write `src/data/kickConfig.ts`**

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
] as const;
export const KICKS_FACE_USD_PER_100 = 1.09; // 100 KICKs face value; split applied in calc
```

- [ ] **Step 2: Write the failing tests (append to `tests/calculators.test.ts`)**

Add to the import block at the top of `tests/calculators.test.ts` (after the existing `sponsorship` import):

```ts
import {
  estimateKickRevenue,
  kickSubsForGoal,
} from "../src/lib/calculators/kick";
```

Append this `describe` block at the end of the file:

```ts
describe("kick revenue calculator", () => {
  it("computes monthly revenue from subs + kicks + ads at 95/5", () => {
    const r = estimateKickRevenue({
      subs: { tier1: 50, tier2: 0, tier3: 0, gift: 0 },
      split: 0.95,
      kicks: 10000, // 100 KICKs = $1.09 face → 10000/100 * 1.09 * 0.95 = 103.55
      ads: { cpm: 4, minutes: 120, viewers: 50 }, // 4 * (120/1000) * 50 = 24 (no split)
    });
    // subs: 50 * 4.99 * 0.95 = 237.025
    expect(r.monthly.subs).toBeCloseTo(237.025, 2);
    expect(r.monthly.kicks).toBeCloseTo(103.55, 2);
    expect(r.monthly.ads).toBeCloseTo(24, 2);
    expect(r.monthly.total).toBeCloseTo(237.025 + 103.55 + 24, 2);
  });

  it("defaults split to 95/5 when split is invalid", () => {
    const a = estimateKickRevenue({
      subs: { tier1: 10, tier2: 0, tier3: 0, gift: 0 },
      split: NaN,
      kicks: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    const b = estimateKickRevenue({
      subs: { tier1: 10, tier2: 0, tier3: 0, gift: 0 },
      split: 0.95,
      kicks: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    expect(a.monthly.subs).toBeCloseTo(b.monthly.subs, 4); // 10 * 4.99 * 0.95 = 47.405
    expect(a.monthly.subs).toBeCloseTo(47.405, 2);
  });

  it("clamps split > 1 to the default", () => {
    const r = estimateKickRevenue({
      subs: { tier1: 10, tier2: 0, tier3: 0, gift: 0 },
      split: 2,
      kicks: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    expect(r.monthly.subs).toBeCloseTo(47.405, 2); // default 0.95 applied
  });

  it("clamps split <= 0 to the default", () => {
    const r = estimateKickRevenue({
      subs: { tier1: 10, tier2: 0, tier3: 0, gift: 0 },
      split: 0,
      kicks: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    expect(r.monthly.subs).toBeCloseTo(47.405, 2);
  });

  it("guards NaN/negative/Infinity inputs to 0", () => {
    const r = estimateKickRevenue({
      subs: { tier1: -5, tier2: NaN, tier3: Infinity, gift: -1 },
      split: 0.95,
      kicks: -100,
      ads: { cpm: -1, minutes: NaN, viewers: Infinity },
    });
    expect(r.monthly.total).toBe(0);
    expect(r.monthly.subs).toBe(0);
    expect(r.monthly.kicks).toBe(0);
    expect(r.monthly.ads).toBe(0);
  });

  it("treats gift subs as tier-1 price", () => {
    const r = estimateKickRevenue({
      subs: { tier1: 0, tier2: 0, tier3: 0, gift: 10 },
      split: 0.95,
      kicks: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    expect(r.monthly.subs).toBeCloseTo(10 * 4.99 * 0.95, 2); // 47.405
    expect(r.subsBreakdown.gift).toBeCloseTo(47.405, 2);
  });

  it("does not apply split to ads (Kick pays 100% on ads)", () => {
    const lowSplit = estimateKickRevenue({
      subs: { tier1: 0, tier2: 0, tier3: 0, gift: 0 },
      split: 0.5,
      kicks: 0,
      ads: { cpm: 4, minutes: 120, viewers: 50 },
    });
    const highSplit = estimateKickRevenue({
      subs: { tier1: 0, tier2: 0, tier3: 0, gift: 0 },
      split: 1.0,
      kicks: 0,
      ads: { cpm: 4, minutes: 120, viewers: 50 },
    });
    expect(lowSplit.monthly.ads).toBe(24);
    expect(highSplit.monthly.ads).toBe(24);
  });

  it("annual equals monthly times 12", () => {
    const r = estimateKickRevenue({
      subs: { tier1: 50, tier2: 0, tier3: 0, gift: 0 },
      split: 0.95,
      kicks: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    expect(r.annual.subs).toBeCloseTo(r.monthly.subs * 12, 4);
    expect(r.annual.total).toBeCloseTo(r.monthly.total * 12, 4);
  });

  it("breakdown tiers sum to monthly subs", () => {
    const r = estimateKickRevenue({
      subs: { tier1: 10, tier2: 5, tier3: 1, gift: 2 },
      split: 0.95,
      kicks: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    const sum =
      r.subsBreakdown.tier1 +
      r.subsBreakdown.tier2 +
      r.subsBreakdown.tier3 +
      r.subsBreakdown.gift;
    expect(sum).toBeCloseTo(r.monthly.subs, 4);
    expect(r.subsBreakdown.total).toBeCloseTo(r.monthly.subs, 4);
  });

  it("computes hourlyEquivalent and minWageMultiple over 120 hrs/month", () => {
    const r = estimateKickRevenue({
      subs: { tier1: 50, tier2: 0, tier3: 0, gift: 0 },
      split: 0.95,
      kicks: 0,
      ads: { cpm: 0, minutes: 0, viewers: 0 },
    });
    expect(r.hourlyEquivalent).toBeCloseTo(r.monthly.total / 120, 6);
    expect(r.minWageMultiple).toBeCloseTo(r.hourlyEquivalent / 7.25, 6);
  });

  it("kickSubsForGoal ceils tier-1 subs needed at the given split", () => {
    // $1000 / (4.99 * 0.95) = 1000 / 4.7405 ≈ 210.95 → ceil 211
    expect(kickSubsForGoal(1000, 0.95)).toBe(211);
    expect(kickSubsForGoal(0, 0.95)).toBe(0);
    expect(kickSubsForGoal(-50, 0.95)).toBe(0);
  });

  it("kickSubsForGoal clamps invalid split to default 0.95", () => {
    expect(kickSubsForGoal(1000, 2)).toBe(211);
    expect(kickSubsForGoal(1000, 0)).toBe(211);
    expect(kickSubsForGoal(1000, NaN)).toBe(211);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test 2>&1 | tail -20`
Expected: FAIL — `estimateKickRevenue` and `kickSubsForGoal` not exported (module `../src/lib/calculators/kick` does not exist). Vitest reports a failed import / "Cannot find module".

- [ ] **Step 4: Write `src/lib/calculators/kick.ts`**

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

export interface KickRevenueResult {
  monthly: { subs: number; kicks: number; ads: number; total: number };
  annual: { subs: number; kicks: number; ads: number; total: number };
  hourlyEquivalent: number;
  minWageMultiple: number;
  subsBreakdown: {
    tier1: number;
    tier2: number;
    tier3: number;
    gift: number;
    total: number;
  };
}

const g = (n: number): number => (Number.isFinite(n) && n >= 0 ? n : 0);

export function estimateKickRevenue(i: KickRevenueInput): KickRevenueResult {
  const split = i.split > 0 && i.split <= 1 ? i.split : KICK_SPLIT_DEFAULT;
  const rawSubs = {
    tier1: g(i.subs.tier1) * KICK_SUB_PRICES.tier1,
    tier2: g(i.subs.tier2) * KICK_SUB_PRICES.tier2,
    tier3: g(i.subs.tier3) * KICK_SUB_PRICES.tier3,
    gift: g(i.subs.gift) * KICK_SUB_PRICES.tier1,
  };
  const subsUsd =
    (rawSubs.tier1 + rawSubs.tier2 + rawSubs.tier3 + rawSubs.gift) * split;
  const kicksUsd = g(i.kicks) * (KICKS_FACE_USD_PER_100 / 100) * split; // 95/5 applies to Kicks
  const adsUsd = g(i.ads.cpm) * (g(i.ads.minutes) / 1000) * g(i.ads.viewers); // 100% to streamer, no split
  const monthlyTotal = subsUsd + kicksUsd + adsUsd;
  const hoursPerMonth = 120;
  const hourlyEquivalent = monthlyTotal / hoursPerMonth;
  return {
    monthly: {
      subs: subsUsd,
      kicks: kicksUsd,
      ads: adsUsd,
      total: monthlyTotal,
    },
    annual: {
      subs: subsUsd * 12,
      kicks: kicksUsd * 12,
      ads: adsUsd * 12,
      total: monthlyTotal * 12,
    },
    hourlyEquivalent,
    minWageMultiple: hourlyEquivalent / MIN_WAGE_USD_HOURLY,
    subsBreakdown: {
      tier1: rawSubs.tier1 * split,
      tier2: rawSubs.tier2 * split,
      tier3: rawSubs.tier3 * split,
      gift: rawSubs.gift * split,
      total: subsUsd,
    },
  };
}

export function kickSubsForGoal(
  goalUsd: number,
  split: number = KICK_SPLIT_DEFAULT,
): number {
  if (!Number.isFinite(goalUsd) || goalUsd <= 0) return 0;
  if (split <= 0 || split > 1) split = KICK_SPLIT_DEFAULT;
  const perSub = KICK_SUB_PRICES.tier1 * split;
  return Math.ceil(goalUsd / perSub);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test 2>&1 | tail -20`
Expected: PASS — all tests pass (the 12 new kick tests + the existing 45). Suite total ~57.

- [ ] **Step 6: Lint**

Run: `npm run lint 2>&1 | tail -20`
Expected: clean (prettier + eslint, no errors). If prettier reports formatting changes, run `npx prettier --write src/data/kickConfig.ts src/lib/calculators/kick.ts tests/calculators.test.ts` and re-run lint.

- [ ] **Step 7: Commit**

```bash
git add src/data/kickConfig.ts src/lib/calculators/kick.ts tests/calculators.test.ts
git commit -m "$(cat <<'EOF'
feat(kick): add Kick revenue calculator pure math + config + tests

estimateKickRevenue (subs + Kicks + ads, 95/5 split default) and
kickSubsForGoal, with KICK_SUB_PRICES / KICK_SPLIT_PRESETS /
KICKS_FACE_USD_PER_100 in src/data/kickConfig.ts. 12 tests appended
to tests/calculators.test.ts. Kick pays 100% on ads (no split applied).

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Kick island + page + registry + FAQs

**Files:**

- Create: `src/components/calculators/KickRevenueCalculator.astro`
- Create: `src/pages/kick-revenue-calculator.astro`
- Modify: `src/lib/site.ts` (append 1 entry to `TOOLS[]`)
- Modify: `src/data/faqs.ts` (append `kickRevenueFaqs` export)

**Interfaces:**

- Consumes:
  - `estimateKickRevenue`, `kickSubsForGoal` from `src/lib/calculators/kick.ts` (Task B1-1)
  - `KICK_SPLIT_PRESETS`, `KICK_SUB_PRICES` from `src/data/kickConfig.ts` (Task B1-1)
  - `AD_CPM_DEFAULTS` from `src/data/adConfig.ts` (existing export, `AD_CPM_DEFAULTS.us = 4.0`)
  - `formatCurrency` from `src/lib/format.ts` — signature `formatCurrency(usd: number, currency: string): string`, returns e.g. `"$1,234.50"`
  - `RangeSlider` from `src/components/primitives/RangeSlider.astro` — Props: `id, label, min, max, step, value, prefix, suffix, compact`; renders `data-range-slider={id}` and writes `data-value` to its root dataset
  - `ToolLayout` from `src/layouts/ToolLayout.astro` — Props: `title, description, slug, crumbs: {name,url}[], faqs: {q,a}[]`; default slot holds the calculator
- Produces:
  - `<KickRevenueCalculator />` Astro component (no props)
  - `kickRevenueFaqs` exported from `src/data/faqs.ts` — type `{ q: string; a: string }[]`
  - `TOOLS[]` entry: `{ slug: "kick-revenue-calculator", name: "Kick Revenue Calculator", short: "Kick", desc: "Estimate Kick earnings from subs, KICKs, and ads at 95/5." }`

- [ ] **Step 1: Write `src/components/calculators/KickRevenueCalculator.astro`**

Mirror `src/components/calculators/RevenueCalculator.astro` structure (three panels: Subs / Kicks / Ads), with Kick values and a 95/5 default split.

```astro
---
import { estimateKickRevenue, kickSubsForGoal } from '../../lib/calculators/kick';
import { KICK_SPLIT_PRESETS } from '../../data/kickConfig';
import { AD_CPM_DEFAULTS } from '../../data/adConfig';
import { formatCurrency } from '../../lib/format';
import RangeSlider from '../primitives/RangeSlider.astro';
---
<form class="kick-calc" data-tool="kick-revenue">
  <div class="panels">
    <fieldset class="panel-mini">
      <legend>Subscriptions</legend>
      <label>Tier 1 ($4.99)
        <RangeSlider id="sub-tier1" label="" min={0} max={2000} step={1} value={50} compact />
      </label>
      <label>Tier 2 ($9.99)
        <RangeSlider id="sub-tier2" label="" min={0} max={500} step={1} value={0} compact />
      </label>
      <label>Tier 3 ($24.99)
        <RangeSlider id="sub-tier3" label="" min={0} max={200} step={1} value={0} compact />
      </label>
      <label>Gift
        <RangeSlider id="sub-gift" label="" min={0} max={500} step={1} value={0} compact />
      </label>
      <label>Split
        <select data-split>
          {KICK_SPLIT_PRESETS.map(s => <option value={s.value} selected={s.value === 0.95}>{s.label}</option>)}
        </select>
      </label>
    </fieldset>
    <fieldset class="panel-mini">
      <legend>KICKs</legend>
      <label>KICKs received
        <RangeSlider id="kicks" label="" min={0} max={250000} step={100} value={5000} compact />
      </label>
    </fieldset>
    <fieldset class="panel-mini">
      <legend>Ads</legend>
      <label>CPM ($)
        <RangeSlider id="cpm" label="" min={0} max={20} step={0.1} value={AD_CPM_DEFAULTS.us} prefix="$" compact />
      </label>
      <label>Minutes/stream
        <RangeSlider id="minutes" label="" min={0} max={480} step={5} value={120} suffix="min" compact />
      </label>
      <label>Avg viewers
        <RangeSlider id="viewers" label="" min={0} max={5000} step={10} value={50} compact />
      </label>
    </fieldset>
  </div>

  <div class="result" data-result aria-live="polite">$0.00 / month</div>
  <div class="sub" data-subresult></div>

  <div class="breakdown" data-breakdown>
    <strong>Where your money comes from</strong>
    <div class="breakdown-grid" data-breakdown-grid></div>
  </div>

  <div class="goal-calc" data-goal>
    <label>Monthly goal ($)
      <input type="number" min="0" data-goal-input value="1000" />
    </label>
    <p data-goal-output>At a 95/5 split you need ~<strong>211</strong> Tier 1 subs/month.</p>
  </div>
</form>
<script>
  import { estimateKickRevenue, kickSubsForGoal } from '../../lib/calculators/kick';
  import { formatCurrency } from '../../lib/format';
  import { KICK_SPLIT_PRESETS } from '../../data/kickConfig';

  const form = document.querySelector('[data-tool="kick-revenue"]') as HTMLFormElement;
  const sliderValue = (id: string) => Number(form.querySelector(`[data-range-slider="${id}"]`)?.dataset.value ?? 0);

  const read = () => ({
    subs: {
      tier1: sliderValue('sub-tier1'),
      tier2: sliderValue('sub-tier2'),
      tier3: sliderValue('sub-tier3'),
      gift: sliderValue('sub-gift'),
    },
    split: Number((form.querySelector('[data-split]') as HTMLSelectElement)?.value ?? 0.95),
    kicks: sliderValue('kicks'),
    ads: { cpm: sliderValue('cpm'), minutes: sliderValue('minutes'), viewers: sliderValue('viewers') },
  });

  const render = () => {
    const r = estimateKickRevenue(read());
    form.querySelector('[data-result]')!.textContent = `${formatCurrency(r.monthly.total, 'USD')} / month`;
    form.querySelector('[data-subresult]')!.textContent = `≈ ${formatCurrency(r.annual.total, 'USD')} / year · ${formatCurrency(r.hourlyEquivalent, 'USD')}/hr (${r.minWageMultiple.toFixed(1)}× min wage)`;

    const grid = form.querySelector('[data-breakdown-grid]') as HTMLElement;
    const rows = [
      { label: 'Tier 1', value: r.subsBreakdown.tier1 },
      { label: 'Tier 2', value: r.subsBreakdown.tier2 },
      { label: 'Tier 3', value: r.subsBreakdown.tier3 },
      { label: 'Gift', value: r.subsBreakdown.gift },
      { label: 'KICKs', value: r.monthly.kicks },
      { label: 'Ads', value: r.monthly.ads },
    ];
    grid.innerHTML = rows.map(row => `
      <div class="breakdown-cell">
        <span>${row.label}</span>
        <strong>${formatCurrency(row.value, 'USD')}</strong>
      </div>
    `).join('');

    renderGoal();
  };

  const renderGoal = () => {
    const goal = Number((form.querySelector('[data-goal-input]') as HTMLInputElement)?.value ?? 0);
    const split = Number((form.querySelector('[data-split]') as HTMLSelectElement)?.value ?? 0.95);
    const needed = kickSubsForGoal(goal, split);
    const splitLabel = KICK_SPLIT_PRESETS.find(s => s.value === split)?.label.split(' ')[0] ?? '95/5';
    form.querySelector('[data-goal-output]')!.innerHTML = `At a ${splitLabel} split you need <strong>${needed.toLocaleString()}</strong> Tier 1 subs/month to hit ${formatCurrency(goal, 'USD')}.`;
  };

  form.querySelectorAll('[data-range-slider]').forEach(slider => {
    slider.addEventListener('input', render);
  });
  form.querySelector('[data-split]')?.addEventListener('change', render);
  form.querySelector('[data-goal-input]')?.addEventListener('input', renderGoal);

  render();
</script>
<style>
  .kick-calc { display: flex; flex-direction: column; gap: var(--spacing-6); }
  .panels { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--spacing-4); }
  .panel-mini { border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-surface-warm); padding: var(--spacing-4); display: grid; gap: var(--spacing-4); }
  legend { font-weight: 800; font-size: var(--text-sm); color: var(--color-fg); padding: 0 var(--spacing-2); }
  label { display: grid; gap: var(--spacing-2); color: var(--color-fg-2); font-size: var(--text-sm); font-weight: 700; }
  select { width: 100%; min-height: 44px; padding: 0 var(--spacing-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-fg); font: inherit; transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard); }
  select:focus { outline: none; border-color: var(--color-accent); box-shadow: var(--shadow-focus-ring); }
  .result { font-family: var(--font-mono); font-size: clamp(28px, 4vw, 48px); font-weight: 700; color: var(--color-accent); line-height: var(--leading-tight); white-space: nowrap; }
  .sub { color: var(--color-muted); font-size: var(--text-sm); }
  .breakdown { display: flex; flex-direction: column; gap: var(--spacing-3); padding: var(--spacing-4); border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-surface-warm); }
  .breakdown strong { font-size: var(--text-sm); color: var(--color-fg); }
  .breakdown-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--spacing-3); }
  .breakdown-cell { display: flex; flex-direction: column; gap: var(--spacing-1); padding: var(--spacing-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); }
  .breakdown-cell span { font-size: var(--text-xs); font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); }
  .breakdown-cell strong { font-family: var(--font-mono); font-size: var(--text-base); color: var(--color-fg); }
  .goal-calc { display: grid; grid-template-columns: 1fr 2fr; gap: var(--spacing-4); align-items: center; padding: var(--spacing-4); border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-surface-warm); }
  .goal-calc label { margin: 0; }
  .goal-calc input { width: 100%; min-height: 44px; padding: 0 var(--spacing-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-fg); font: inherit; }
  .goal-calc input:focus { outline: none; border-color: var(--color-accent); box-shadow: var(--shadow-focus-ring); }
  .goal-calc p { color: var(--color-fg-2); font-size: var(--text-sm); margin: 0; }
  .goal-calc p strong { color: var(--color-accent); }
  @media (max-width: 860px) { .panels, .goal-calc { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 2: Append `kickRevenueFaqs` to `src/data/faqs.ts`**

Append at the end of `src/data/faqs.ts`:

```ts
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
```

- [ ] **Step 3: Write `src/pages/kick-revenue-calculator.astro`**

```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import KickRevenueCalculator from '../components/calculators/KickRevenueCalculator.astro';
import { kickRevenueFaqs } from '../data/faqs';
---
<ToolLayout
  title="Kick Revenue Calculator"
  description="Estimate monthly and annual Kick earnings from subs, KICKs, and ads at the 95/5 split. Compare to minimum wage by the hour."
  slug="kick-revenue-calculator"
  crumbs={[{ name: 'Home', url: '/' }, { name: 'Kick Tools', url: '/kick-revenue-calculator' }]}
  faqs={kickRevenueFaqs}
>
  <KickRevenueCalculator />
</ToolLayout>
```

- [ ] **Step 4: Append the Kick entry to `TOOLS[]` in `src/lib/site.ts`**

Append this object as the last element of the `TOOLS` array (after the sponsorship entry, before the closing `] as const;`):

```ts
  {
    slug: "kick-revenue-calculator",
    name: "Kick Revenue Calculator",
    short: "Kick",
    desc: "Estimate Kick earnings from subs, KICKs, and ads at 95/5.",
  },
```

- [ ] **Step 5: Build, test, lint**

Run: `npm run build 2>&1 | tail -10`
Expected: build succeeds; page count 42 → 43 (adds `/kick-revenue-calculator`).

Run: `npm test 2>&1 | tail -10`
Expected: all tests pass (no test changes in this task; suite still ~57 from B1-1).

Run: `npm run lint 2>&1 | tail -10`
Expected: clean. If prettier reports changes, run `npx prettier --write src/components/calculators/KickRevenueCalculator.astro src/pages/kick-revenue-calculator.astro src/data/faqs.ts src/lib/site.ts` and re-run lint.

- [ ] **Step 6: Manually verify the rendered page**

Run: `npm run preview &` (or `npm run dev`), open `http://localhost:4321/kick-revenue-calculator/`.
Expected: H1 "Kick Revenue Calculator"; three panels render; result shows non-zero USD/month at defaults (50 tier1 @ 95/5 + 5000 KICKs + CPM 4/120min/50 viewers); breakdown grid shows 6 rows; changing sliders updates results live; goal calc updates on input.

Kill the preview/dev server.

- [ ] **Step 7: Commit**

```bash
git add src/components/calculators/KickRevenueCalculator.astro src/pages/kick-revenue-calculator.astro src/data/faqs.ts src/lib/site.ts
git commit -m "$(cat <<'EOF'
feat(kick): add Kick Revenue Calculator page + island + FAQs + registry

Three-panel island (subs/kicks/ads) mirroring RevenueCalculator with
KICK_SPLIT_PRESETS (95/5 default) and KICKs panel. New /kick-revenue-
calculator ToolLayout page, kickRevenueFaqs, and TOOLS[] entry.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Ad config defaults + pure ad calculator + tests

**Files:**

- Modify: `src/data/adConfig.ts` (append `AD_INPUT_DEFAULTS`; existing exports untouched)
- Create: `src/lib/calculators/ads.ts`
- Modify: `tests/calculators.test.ts` (append import + one `describe` block)

**Interfaces:**

- Consumes: nothing from earlier B1 tasks (standalone). `adConfig.ts` already exports `AD_CPM_DEFAULTS` and `MIN_WAGE_USD_HOURLY`.
- Produces:
  - `AD_INPUT_DEFAULTS` from `src/data/adConfig.ts` — `{ adsPerHour: 3; hoursPerStream: 4; streamsPerMonth: 20; viewers: 50 }`
  - `estimateAdRevenue(i: AdRevenueInput): AdRevenueResult`
  - `interface AdRevenueInput { cpm: number; viewers: number; adsPerHour: number; hoursPerStream: number; streamsPerMonth: number }`
  - `interface AdRevenueResult { monthly: number; annual: number; impressionsPerStream: number; monthlyImpressions: number; rpmPerViewer: number }`

- [ ] **Step 1: Append `AD_INPUT_DEFAULTS` to `src/data/adConfig.ts`**

The existing file is:

```ts
export const AD_CPM_DEFAULTS: Record<string, number> = {
  us: 4.0,
  gb: 3.0,
  eu: 3.0,
  ca: 3.0,
  au: 3.5,
};
export const MIN_WAGE_USD_HOURLY = 7.25;
```

Append at the end (do not modify existing lines):

```ts
export const AD_INPUT_DEFAULTS = {
  adsPerHour: 3,
  hoursPerStream: 4,
  streamsPerMonth: 20,
  viewers: 50,
};
```

- [ ] **Step 2: Write the failing tests (append to `tests/calculators.test.ts`)**

Add to the import block at the top (after the kick import added in B1-1):

```ts
import { estimateAdRevenue } from "../src/lib/calculators/ads";
```

Append this `describe` block at the end of the file:

```ts
describe("ad revenue calculator", () => {
  it("computes monthly ad revenue from impressions", () => {
    // impressionsPerStream = 3 ads/hr * 4 hrs * 50 viewers = 600
    // monthlyImpressions = 600 * 20 streams = 12000
    // monthly = (12000 / 1000) * 4 CPM = 48
    const r = estimateAdRevenue({
      cpm: 4,
      viewers: 50,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 20,
    });
    expect(r.impressionsPerStream).toBe(600);
    expect(r.monthlyImpressions).toBe(12000);
    expect(r.monthly).toBeCloseTo(48, 2);
    expect(r.annual).toBeCloseTo(48 * 12, 2);
  });

  it("guards NaN/negative/Infinity inputs to 0", () => {
    const r = estimateAdRevenue({
      cpm: -1,
      viewers: NaN,
      adsPerHour: Infinity,
      hoursPerStream: -2,
      streamsPerMonth: NaN,
    });
    expect(r.impressionsPerStream).toBe(0);
    expect(r.monthlyImpressions).toBe(0);
    expect(r.monthly).toBe(0);
    expect(r.annual).toBe(0);
  });

  it("monthly is proportional to CPM", () => {
    const low = estimateAdRevenue({
      cpm: 2,
      viewers: 50,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 20,
    });
    const high = estimateAdRevenue({
      cpm: 8,
      viewers: 50,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 20,
    });
    expect(high.monthly).toBeCloseTo(low.monthly * 4, 4);
  });

  it("annual equals monthly times 12", () => {
    const r = estimateAdRevenue({
      cpm: 4,
      viewers: 50,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 20,
    });
    expect(r.annual).toBeCloseTo(r.monthly * 12, 4);
  });

  it("rpmPerViewer is monthly revenue per average viewer", () => {
    const r = estimateAdRevenue({
      cpm: 4,
      viewers: 50,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 20,
    });
    // monthly 48 / 50 viewers = 0.96
    expect(r.rpmPerViewer).toBeCloseTo(0.96, 4);
  });

  it("rpmPerViewer is 0 when viewers is 0 (no division by zero)", () => {
    const r = estimateAdRevenue({
      cpm: 4,
      viewers: 0,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 20,
    });
    expect(r.monthly).toBe(0); // 0 viewers → 0 impressions → 0 revenue
    expect(r.rpmPerViewer).toBe(0);
  });

  it("monthly scales with streams per month", () => {
    const r10 = estimateAdRevenue({
      cpm: 4,
      viewers: 50,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 10,
    });
    const r40 = estimateAdRevenue({
      cpm: 4,
      viewers: 50,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 40,
    });
    expect(r40.monthly).toBeCloseTo(r10.monthly * 4, 4);
  });

  it("default inputs produce a sane positive monthly estimate", () => {
    const r = estimateAdRevenue({
      cpm: 4,
      viewers: 50,
      adsPerHour: 3,
      hoursPerStream: 4,
      streamsPerMonth: 20,
    });
    expect(r.monthly).toBeGreaterThan(0);
    expect(r.impressionsPerStream).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test 2>&1 | tail -20`
Expected: FAIL — `estimateAdRevenue` not exported (`../src/lib/calculators/ads` does not exist).

- [ ] **Step 4: Write `src/lib/calculators/ads.ts`**

```ts
export interface AdRevenueInput {
  cpm: number;
  viewers: number;
  adsPerHour: number;
  hoursPerStream: number;
  streamsPerMonth: number;
}

export interface AdRevenueResult {
  monthly: number;
  annual: number;
  impressionsPerStream: number;
  monthlyImpressions: number;
  rpmPerViewer: number;
}

const g = (n: number): number => (Number.isFinite(n) && n >= 0 ? n : 0);

export function estimateAdRevenue(i: AdRevenueInput): AdRevenueResult {
  const impressionsPerStream =
    g(i.adsPerHour) * g(i.hoursPerStream) * g(i.viewers);
  const monthlyImpressions = impressionsPerStream * g(i.streamsPerMonth);
  const monthly = (monthlyImpressions / 1000) * g(i.cpm);
  const annual = monthly * 12;
  const rpmPerViewer = g(i.viewers) > 0 ? monthly / g(i.viewers) : 0;
  return {
    monthly,
    annual,
    impressionsPerStream,
    monthlyImpressions,
    rpmPerViewer,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test 2>&1 | tail -20`
Expected: PASS — all tests pass (8 new ad tests + existing ~57). Suite total ~65.

- [ ] **Step 6: Lint**

Run: `npm run lint 2>&1 | tail -20`
Expected: clean. If prettier reports changes, run `npx prettier --write src/data/adConfig.ts src/lib/calculators/ads.ts tests/calculators.test.ts` and re-run lint.

- [ ] **Step 7: Commit**

```bash
git add src/data/adConfig.ts src/lib/calculators/ads.ts tests/calculators.test.ts
git commit -m "$(cat <<'EOF'
feat(ads): add Twitch ad revenue pure math + AD_INPUT_DEFAULTS + tests

estimateAdRevenue (impressions-based: adsPerHour × hoursPerStream ×
viewers × streamsPerMonth × CPM / 1000) with rpmPerViewer and zero-viewer
guard. AD_INPUT_DEFAULTS appended to adConfig.ts. 8 tests appended
to tests/calculators.test.ts. Standalone — does not touch revenue.ts.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Ad island + page + registry + FAQs

**Files:**

- Create: `src/components/calculators/AdRevenueCalculator.astro`
- Create: `src/pages/twitch-ad-revenue-calculator.astro`
- Modify: `src/lib/site.ts` (append 1 entry to `TOOLS[]`)
- Modify: `src/data/faqs.ts` (append `adRevenueFaqs` export)

**Interfaces:**

- Consumes:
  - `estimateAdRevenue` from `src/lib/calculators/ads.ts` (Task B1-3)
  - `AD_INPUT_DEFAULTS`, `AD_CPM_DEFAULTS` from `src/data/adConfig.ts` (Task B1-3 + existing)
  - `formatCurrency` from `src/lib/format.ts`
  - `RangeSlider` from `src/components/primitives/RangeSlider.astro` (Props as in B1-2)
  - `ToolLayout` from `src/layouts/ToolLayout.astro` (Props as in B1-2)
- Produces:
  - `<AdRevenueCalculator />` Astro component (no props)
  - `adRevenueFaqs` exported from `src/data/faqs.ts` — type `{ q: string; a: string }[]`
  - `TOOLS[]` entry: `{ slug: "twitch-ad-revenue-calculator", name: "Twitch Ad Revenue Calculator", short: "Ad Rev", desc: "Estimate Twitch ad revenue from CPM, viewers, and ad slots." }`

- [ ] **Step 1: Write `src/components/calculators/AdRevenueCalculator.astro`**

Focused single-panel island (no goal calc):

```astro
---
import { estimateAdRevenue } from '../../lib/calculators/ads';
import { AD_CPM_DEFAULTS, AD_INPUT_DEFAULTS } from '../../data/adConfig';
import { formatCurrency } from '../../lib/format';
import RangeSlider from '../primitives/RangeSlider.astro';
---
<form class="ad-calc" data-tool="ad-revenue">
  <fieldset class="panel-mini">
    <legend>Ad earnings</legend>
    <label>CPM ($)
      <RangeSlider id="cpm" label="" min={0} max={20} step={0.1} value={AD_CPM_DEFAULTS.us} prefix="$" compact />
    </label>
    <label>Avg concurrent viewers
      <RangeSlider id="viewers" label="" min={0} max={5000} step={10} value={AD_INPUT_DEFAULTS.viewers} compact />
    </label>
    <label>Ads per hour
      <RangeSlider id="ads-per-hour" label="" min={0} max={12} step={1} value={AD_INPUT_DEFAULTS.adsPerHour} compact />
    </label>
    <label>Hours per stream
      <RangeSlider id="hours-per-stream" label="" min={0} max={12} step={0.5} value={AD_INPUT_DEFAULTS.hoursPerStream} suffix="hr" compact />
    </label>
    <label>Streams per month
      <RangeSlider id="streams-per-month" label="" min={0} max={120} step={1} value={AD_INPUT_DEFAULTS.streamsPerMonth} compact />
    </label>
  </fieldset>

  <div class="result" data-result aria-live="polite">$0.00 / month</div>
  <div class="sub" data-subresult></div>

  <div class="breakdown" data-breakdown>
    <strong>Ad performance</strong>
    <div class="breakdown-grid" data-breakdown-grid></div>
  </div>
</form>
<script>
  import { estimateAdRevenue } from '../../lib/calculators/ads';
  import { formatCurrency } from '../../lib/format';

  const form = document.querySelector('[data-tool="ad-revenue"]') as HTMLFormElement;
  const sliderValue = (id: string) => Number(form.querySelector(`[data-range-slider="${id}"]`)?.dataset.value ?? 0);

  const read = () => ({
    cpm: sliderValue('cpm'),
    viewers: sliderValue('viewers'),
    adsPerHour: sliderValue('ads-per-hour'),
    hoursPerStream: sliderValue('hours-per-stream'),
    streamsPerMonth: sliderValue('streams-per-month'),
  });

  const render = () => {
    const r = estimateAdRevenue(read());
    form.querySelector('[data-result]')!.textContent = `${formatCurrency(r.monthly, 'USD')} / month`;
    form.querySelector('[data-subresult]')!.textContent = `≈ ${formatCurrency(r.annual, 'USD')} / year · ${formatCurrency(r.rpmPerViewer, 'USD')}/viewer/month`;

    const grid = form.querySelector('[data-breakdown-grid]') as HTMLElement;
    const rows = [
      { label: 'Impressions / stream', value: r.impressionsPerStream.toLocaleString('en-US') },
      { label: 'Monthly impressions', value: r.monthlyImpressions.toLocaleString('en-US') },
      { label: 'RPM / viewer', value: formatCurrency(r.rpmPerViewer, 'USD') },
    ];
    grid.innerHTML = rows.map(row => `
      <div class="breakdown-cell">
        <span>${row.label}</span>
        <strong>${row.value}</strong>
      </div>
    `).join('');
  };

  form.querySelectorAll('[data-range-slider]').forEach(slider => {
    slider.addEventListener('input', render);
  });

  render();
</script>
<style>
  .ad-calc { display: flex; flex-direction: column; gap: var(--spacing-6); }
  .panel-mini { border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-surface-warm); padding: var(--spacing-4); display: grid; gap: var(--spacing-4); }
  legend { font-weight: 800; font-size: var(--text-sm); color: var(--color-fg); padding: 0 var(--spacing-2); }
  label { display: grid; gap: var(--spacing-2); color: var(--color-fg-2); font-size: var(--text-sm); font-weight: 700; }
  .result { font-family: var(--font-mono); font-size: clamp(28px, 4vw, 48px); font-weight: 700; color: var(--color-accent); line-height: var(--leading-tight); white-space: nowrap; }
  .sub { color: var(--color-muted); font-size: var(--text-sm); }
  .breakdown { display: flex; flex-direction: column; gap: var(--spacing-3); padding: var(--spacing-4); border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-surface-warm); }
  .breakdown strong { font-size: var(--text-sm); color: var(--color-fg); }
  .breakdown-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--spacing-3); }
  .breakdown-cell { display: flex; flex-direction: column; gap: var(--spacing-1); padding: var(--spacing-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); }
  .breakdown-cell span { font-size: var(--text-xs); font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); }
  .breakdown-cell strong { font-family: var(--font-mono); font-size: var(--text-base); color: var(--color-fg); }
  @media (max-width: 860px) { .panel-mini { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 2: Append `adRevenueFaqs` to `src/data/faqs.ts`**

Append at the end of `src/data/faqs.ts` (after `kickRevenueFaqs`):

```ts
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
```

- [ ] **Step 3: Write `src/pages/twitch-ad-revenue-calculator.astro`**

```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import AdRevenueCalculator from '../components/calculators/AdRevenueCalculator.astro';
import { adRevenueFaqs } from '../data/faqs';
---
<ToolLayout
  title="Twitch Ad Revenue Calculator"
  description="Estimate Twitch ad earnings from CPM, average concurrent viewers, ads per hour, hours per stream, and streams per month."
  slug="twitch-ad-revenue-calculator"
  crumbs={[{ name: 'Home', url: '/' }, { name: 'Twitch Tools', url: '/twitch-ad-revenue-calculator' }]}
  faqs={adRevenueFaqs}
>
  <AdRevenueCalculator />
</ToolLayout>
```

- [ ] **Step 4: Append the Ad entry to `TOOLS[]` in `src/lib/site.ts`**

Append this object as the last element of the `TOOLS` array (after the Kick entry added in B1-2, before the closing `] as const;`):

```ts
  {
    slug: "twitch-ad-revenue-calculator",
    name: "Twitch Ad Revenue Calculator",
    short: "Ad Rev",
    desc: "Estimate Twitch ad revenue from CPM, viewers, and ad slots.",
  },
```

- [ ] **Step 5: Build, test, lint**

Run: `npm run build 2>&1 | tail -10`
Expected: build succeeds; page count 43 → 44 (adds `/twitch-ad-revenue-calculator`).

Run: `npm test 2>&1 | tail -10`
Expected: all tests pass (~65, no test changes in this task).

Run: `npm run lint 2>&1 | tail -10`
Expected: clean. If prettier reports changes, run `npx prettier --write src/components/calculators/AdRevenueCalculator.astro src/pages/twitch-ad-revenue-calculator.astro src/data/faqs.ts src/lib/site.ts` and re-run lint.

- [ ] **Step 6: Manually verify the rendered page**

Run: `npm run preview &` (or `npm run dev`), open `http://localhost:4321/twitch-ad-revenue-calculator/`.
Expected: H1 "Twitch Ad Revenue Calculator"; single panel with 5 sliders (CPM default $4.00, viewers 50, ads/hr 3, hours/stream 4, streams/month 20); result shows `$48.00 / month` at defaults (impressions 600/stream, 12000/month, CPM 4 → $48); subresult shows annual $576.00 + $0.96/viewer/month; breakdown shows 3 rows; sliders update live.

Kill the preview/dev server.

- [ ] **Step 7: Commit**

```bash
git add src/components/calculators/AdRevenueCalculator.astro src/pages/twitch-ad-revenue-calculator.astro src/data/faqs.ts src/lib/site.ts
git commit -m "$(cat <<'EOF'
feat(ads): add Twitch Ad Revenue Calculator page + island + FAQs + registry

Focused single-panel island (CPM, viewers, ads/hr, hours/stream,
streams/month) with impressions/RPM breakdown. New /twitch-ad-revenue-
calculator ToolLayout page, adRevenueFaqs, and TOOLS[] entry.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review (run after writing the full plan)

**1. Spec coverage:** Every spec section maps to a task.

- §3 file plan (7 new + 4 modified) → B1-1 creates kickConfig/kick.ts + modifies tests; B1-2 creates island/page + modifies site.ts/faqs.ts; B1-3 creates ads.ts + modifies adConfig.ts/tests; B1-4 creates island/page + modifies site.ts/faqs.ts. ✓
- §4 data config (kickConfig.ts, AD_INPUT_DEFAULTS) → B1-1 Step 1, B1-3 Step 1. ✓
- §5 pure functions + tests → B1-1 Steps 1-5, B1-3 Steps 1-5. ✓
- §6 islands → B1-2 Step 1, B1-4 Step 1. ✓
- §7 pages/SEO → B1-2 Steps 2-4, B1-4 Steps 2-4 (ToolLayout supplies JSON-LD/FAQ/canonical). ✓
- §8 error handling → `g()` guards + split clamping + zero-viewer guard in pure fns (B1-1 Step 4, B1-3 Step 4); `?? 0` island reads (B1-2 Step 1, B1-4 Step 1). ✓
- §9 testing & verification → every task runs `npm test`, `npm run build`, `npm run lint`. ✓
- §10 SDD task plan → 4 tasks, dependency chain B1-1→B1-2 and B1-3→B1-4. ✓
- No-regression (§2 non-goals: revenue.ts/RevenueCalculator.astro untouched) → no task modifies them. ✓

**2. Placeholder scan:** No TBD/TODO/"add appropriate error handling"/"similar to Task N" — every step has complete code. ✓

**3. Type consistency:**

- `KickRevenueInput` (B1-1 Step 2 tests, Step 4 impl) matches: `subs:{tier1,tier2,tier3,gift}`, `split`, `kicks`, `ads:{cpm,minutes,viewers}`. ✓
- `KickRevenueResult` fields used in B1-2 island (`r.monthly.total`, `r.annual.total`, `r.hourlyEquivalent`, `r.minWageMultiple`, `r.subsBreakdown.{tier1,tier2,tier3,gift}`, `r.monthly.kicks`, `r.monthly.ads`) all defined in B1-1 Step 4. ✓
- `kickSubsForGoal(goalUsd, split)` signature consistent across B1-1 tests/impl and B1-2 island. ✓
- `AdRevenueInput` / `AdRevenueResult` fields used in B1-4 island (`r.monthly`, `r.annual`, `r.rpmPerViewer`, `r.impressionsPerStream`, `r.monthlyImpressions`) all defined in B1-3 Step 4. ✓
- `KICK_SPLIT_PRESETS` shape `{value, label}` used in B1-2 island matches kickConfig.ts (B1-1 Step 1) and the `.label.split(' ')[0]` goal-label logic. ✓
- `AD_INPUT_DEFAULTS` fields (`viewers`, `adsPerHour`, `hoursPerStream`, `streamsPerMonth`) used in B1-4 island match B1-3 Step 1. ✓
- `TOOLS[]` entry shape `{slug,name,short,desc}` matches existing `TOOLS` in `src/lib/site.ts`. ✓
- FAQ shape `{q, a}` matches `ToolLayout` Props `faqs: { q: string; a: string }[]`. ✓

No issues found.
