# Sub-project B2 — Patreon Revenue + Spotify Royalties Calculators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use powers:subagent-driven-development (recommended) or powers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new single-page creator-economy calculators — Patreon Revenue (tiers + plan-rate fee + per-transaction processing) and Spotify Royalties (streams × region rate × creator share %) — following the hub's data-driven pattern, with no regression to the 8 existing tools.

**Architecture:** Additive only. New `src/data/patreonConfig.ts` + `src/lib/calculators/patreon.ts` (pure) + `PatreonCalculator.astro` island + `/patreon-revenue-calculator` page. New `src/data/spotifyConfig.ts` + `src/lib/calculators/spotify.ts` (pure) + `SpotifyCalculator.astro` island + `/spotify-royalties-calculator` page. Tests appended to the shared `tests/calculators.test.ts`. Registry (`TOOLS[]`) and FAQs (`faqs.ts`) get two new entries each. No existing calculator file is modified.

**Tech Stack:** Astro 6 static output, Tailwind 4 (`@tailwindcss/vite`), vanilla-JS islands, Vitest 3 (`environment: node`), TypeScript. Pure math in `src/lib/calculators/`, config in `src/data/`, islands in `src/components/calculators/`, pages via `src/layouts/ToolLayout.astro`.

## Global Constraints

- **Zero backend** (CLAUDE.md Rule 1): no DB, no auth, no API keys, no SSR/edge, no fetch. All math client-side.
- **Rates never hardcoded in components** (Rule 2): every rate/fee/price reads from `src/data/*.ts`. Patreon plan rates, processing fee, and tier defaults live in `patreonConfig.ts`; Spotify per-stream region rates, creator-share default, and streams default live in `spotifyConfig.ts`. Display labels in markup are UI affordances; the `<script>` reads slider/select values, not literals.
- **`src/lib/calculators/` is pure** (Rule 3): no DOM, no Astro imports, no side effects. Input guards: NaN/negative/Infinity → 0 via `g(n) = Number.isFinite(n) && n >= 0 ? n : 0`. All calculator functions have Vitest tests.
- **Single accent color** (Rule 4): Twitch purple `#9146ff` (the `--color-accent` token) only on focus rings, primary CTAs, active tab, result accent. Everything else slate. No neon gradients. Islands inherit existing component styles (RangeSlider, panels) — do not introduce new colors.
- **No render-blocking 3rd-party scripts** (Rule 5): no new analytics.
- **Performance bar** (Rule 6): Lighthouse ≥ 95, LCP < 1.2s, TBT < 50ms. Two new static pages must not regress this.
- **SEO is structural** (Rule 7): one page = one keyword, exact H1, one H2 per section, canonical bare-URL, WebApplication + FAQPage + Breadcrumb JSON-LD. `ToolLayout` already builds WebApp + Breadcrumb JSON-LD and renders FAQ; the page supplies `title`/`description`/`slug`/`crumbs`/`faqs`.
- **Affiliate IDs are config, not env vars** (Rule 8): do NOT add Patreon/Spotify affiliate IDs; `affiliateLinks.ts` untouched. The disclosure page auto-renders.
- **Branch:** `build/twitch-bits-hub`. Do NOT push a red build. Do NOT open a PR (stack for the cumulative roadmap PR).
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- **Test convention:** calculator math tests are appended to the shared `tests/calculators.test.ts` (do NOT create `src/lib/calculators/*.test.ts` files). Run `npm test` = `vitest run`.

---

## File Structure

**New files (8):**

- `src/data/patreonConfig.ts` — Patreon plan rates (Standard 10% + legacy Lite/Pro/Premium), processing fee (2.9% + $0.30), tier defaults. Single editable source of truth for Patreon fees.
- `src/lib/calculators/patreon.ts` — pure `estimatePatreonRevenue(i: PatreonRevenueInput): PatreonRevenueResult` + `patreonPatronsForGoal(goalUsd, tierPrice, plan, processing)`.
- `src/components/calculators/PatreonCalculator.astro` — tier-rows vanilla-JS island (3 tiers × patrons+price) + plan `<select>` + goal calc, mirroring `KickRevenueCalculator.astro`.
- `src/pages/patreon-revenue-calculator.astro` — `ToolLayout` page, H1 "Patreon Revenue Calculator".
- `src/data/spotifyConfig.ts` — per-stream rate by region (sourced), region presets, creator-share + streams defaults.
- `src/lib/calculators/spotify.ts` — pure `estimateSpotifyRoyalties(i: SpotifyRoyaltiesInput): SpotifyRoyaltiesResult` + `spotifyStreamsForGoal(goalUsd, region, creatorShare)`.
- `src/components/calculators/SpotifyCalculator.astro` — streams + region + share vanilla-JS island + goal calc.
- `src/pages/spotify-royalties-calculator.astro` — `ToolLayout` page, H1 "Spotify Royalties Calculator".

**Modified files (3):**

- `src/lib/site.ts` — append 2 entries to `TOOLS[]`.
- `src/data/faqs.ts` — append `patreonRevenueFaqs` + `spotifyRoyaltiesFaqs` exports.
- `tests/calculators.test.ts` — append 2 `describe` blocks (patreon revenue, spotify royalties). Suite 65 → 88.

**Untouched (do not modify — no-regression):** all 8 existing calc modules (`bits.ts`, `revenue.ts`, `subs.ts`, `tiktok.ts`, `youtube.ts`, `sponsorship.ts`, `kick.ts`, `ads.ts`), all 8 existing islands, `src/data/programmatic.ts`, `src/data/toolContent.ts`, `src/data/affiliateLinks.ts`, `src/components/calculators/RevenueCalculator.astro`.

---

## Task 1: Patreon config + pure calculator + tests

**Files:**

- Create: `src/data/patreonConfig.ts`
- Create: `src/lib/calculators/patreon.ts`
- Modify: `tests/calculators.test.ts` (append imports + one `describe` block)

**Interfaces:**

- Consumes: nothing from earlier tasks (greenfield config + math).
- Produces:
  - `PATREON_PLAN_RATES`, `PATREON_PLAN_PRESETS`, `PATREON_PROCESSING_DEFAULT`, `PATREON_TIER_DEFAULTS` (from `patreonConfig.ts`)
  - `estimatePatreonRevenue(i: PatreonRevenueInput): PatreonRevenueResult`
  - `patreonPatronsForGoal(goalUsd: number, tierPrice: number, plan: keyof typeof PATREON_PLAN_RATES, processing?: { percent: number; fixedPerTransaction: number }): number`
  - `interface PatreonTier { patrons: number; price: number }`
  - `interface PatreonRevenueInput { tiers: { tier1: PatreonTier; tier2: PatreonTier; tier3: PatreonTier }; plan: keyof typeof PATREON_PLAN_RATES; processing?: { percent: number; fixedPerTransaction: number } }`
  - `interface PatreonRevenueResult { gross: number; platformFee: number; processingFee: number; net: number; annual: number; effectiveRate: number; perTier: { tier1: number; tier2: number; tier3: number } }`

- [ ] **Step 1: Write `src/data/patreonConfig.ts`**

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

- [ ] **Step 2: Write the failing tests (append to `tests/calculators.test.ts`)**

Add to the import block at the top of `tests/calculators.test.ts` (after the existing `import { estimateAdRevenue } from "../src/lib/calculators/ads";` line):

```ts
import {
  estimatePatreonRevenue,
  patreonPatronsForGoal,
} from "../src/lib/calculators/patreon";
```

Append this `describe` block at the end of the file:

```ts
describe("patreon revenue calculator", () => {
  it("computes net = gross - platform fee - processing for a single tier at standard plan", () => {
    const r = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "standard",
    });
    // gross 500, platform 50, processing 500*0.029 + 100*0.30 = 14.50 + 30 = 44.50
    expect(r.gross).toBeCloseTo(500, 2);
    expect(r.platformFee).toBeCloseTo(50, 2);
    expect(r.processingFee).toBeCloseTo(44.5, 2);
    expect(r.net).toBeCloseTo(405.5, 2);
  });

  it("applies the legacy Pro 8% plan rate when selected", () => {
    const r = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "pro",
    });
    // platform 500 * 0.08 = 40
    expect(r.platformFee).toBeCloseTo(40, 2);
  });

  it("falls back to standard 10% for an invalid plan", () => {
    const r = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "nonexistent" as any,
    });
    expect(r.platformFee).toBeCloseTo(50, 2);
  });

  it("sums gross, fees, and net across all three tiers", () => {
    const r = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 50, price: 10 },
        tier3: { patrons: 20, price: 25 },
      },
      plan: "standard",
    });
    // gross = 500 + 500 + 500 = 1500
    expect(r.gross).toBeCloseTo(1500, 2);
    // platform = 1500 * 0.10 = 150
    expect(r.platformFee).toBeCloseTo(150, 2);
    // processing = (14.50 + 30) + (14.50 + 15) + (14.50 + 6) = 94.50
    expect(r.processingFee).toBeCloseTo(94.5, 2);
    expect(r.net).toBeCloseTo(1500 - 150 - 94.5, 2);
  });

  it("annual is net x 12", () => {
    const r = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "standard",
    });
    expect(r.annual).toBeCloseTo(r.net * 12, 4);
  });

  it("effectiveRate is (gross - net) / gross", () => {
    const r = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "standard",
    });
    expect(r.effectiveRate).toBeCloseTo((500 - 405.5) / 500, 4);
  });

  it("perTier nets sum to total net", () => {
    const r = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 50, price: 10 },
        tier3: { patrons: 20, price: 25 },
      },
      plan: "standard",
    });
    expect(r.perTier.tier1 + r.perTier.tier2 + r.perTier.tier3).toBeCloseTo(
      r.net,
      4,
    );
  });

  it("guards NaN/negative/Infinity patrons and price to 0", () => {
    const r = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: NaN, price: 5 },
        tier2: { patrons: -10, price: 10 },
        tier3: { patrons: 20, price: Infinity },
      },
      plan: "standard",
    });
    expect(r.gross).toBe(0);
    expect(r.net).toBe(0);
  });

  it("uses default processing when processing is omitted", () => {
    const a = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "standard",
    });
    const b = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "standard",
      processing: { percent: 0.029, fixedPerTransaction: 0.3 },
    });
    expect(a.net).toBeCloseTo(b.net, 4);
  });

  it("low-tier pledges have a higher effective rate than high-tier", () => {
    const low = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 100, price: 5 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "standard",
    });
    const high = estimatePatreonRevenue({
      tiers: {
        tier1: { patrons: 20, price: 25 },
        tier2: { patrons: 0, price: 0 },
        tier3: { patrons: 0, price: 0 },
      },
      plan: "standard",
    });
    // low eff ~18.9%, high eff ~14.1%
    expect(low.effectiveRate).toBeGreaterThan(high.effectiveRate);
  });

  it("patreonPatronsForGoal returns 0 for goal <= 0", () => {
    expect(patreonPatronsForGoal(0, 5, "standard")).toBe(0);
    expect(patreonPatronsForGoal(-100, 5, "standard")).toBe(0);
  });

  it("patreonPatronsForGoal returns 0 when net per patron <= 0", () => {
    expect(patreonPatronsForGoal(1000, 0, "standard")).toBe(0);
  });

  it("patreonPatronsForGoal ceils the patrons needed", () => {
    // netPerPatron at $5 standard = 5 - 0.50 - (0.145 + 0.30) = 4.055; 1000/4.055 = 246.61 -> 247
    expect(patreonPatronsForGoal(1000, 5, "standard")).toBe(247);
  });
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/lib/calculators/patreon'` (the new `describe("patreon revenue calculator")` block fails to load because `patreon.ts` does not exist yet). The existing 65 tests still pass.

- [ ] **Step 4: Write `src/lib/calculators/patreon.ts`**

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
  tiers: {
    tier1: PatreonTier;
    tier2: PatreonTier;
    tier3: PatreonTier;
  };
  plan: keyof typeof PATREON_PLAN_RATES;
  processing?: { percent: number; fixedPerTransaction: number };
}

export interface PatreonRevenueResult {
  gross: number;
  platformFee: number;
  processingFee: number;
  net: number;
  annual: number;
  effectiveRate: number;
  perTier: { tier1: number; tier2: number; tier3: number };
}

const g = (n: number): number => (Number.isFinite(n) && n >= 0 ? n : 0);

export function estimatePatreonRevenue(
  i: PatreonRevenueInput,
): PatreonRevenueResult {
  const planRate = PATREON_PLAN_RATES[i.plan] ?? PATREON_PLAN_RATES.standard;
  const processing = i.processing ?? PATREON_PROCESSING_DEFAULT;
  const tiers = [
    {
      key: "tier1" as const,
      patrons: g(i.tiers.tier1.patrons),
      price: g(i.tiers.tier1.price),
    },
    {
      key: "tier2" as const,
      patrons: g(i.tiers.tier2.patrons),
      price: g(i.tiers.tier2.price),
    },
    {
      key: "tier3" as const,
      patrons: g(i.tiers.tier3.patrons),
      price: g(i.tiers.tier3.price),
    },
  ];
  let gross = 0;
  let platformFee = 0;
  let processingFee = 0;
  const perTier = { tier1: 0, tier2: 0, tier3: 0 };
  for (const t of tiers) {
    const tierGross = t.patrons * t.price;
    const tierPlatform = tierGross * planRate;
    // per pledge: price * percent + fixed; summed over patrons ->
    // tierGross * percent + patrons * fixed
    const tierProcessing =
      tierGross * processing.percent + t.patrons * processing.fixedPerTransaction;
    const tierNet = tierGross - tierPlatform - tierProcessing;
    gross += tierGross;
    platformFee += tierPlatform;
    processingFee += tierProcessing;
    perTier[t.key] = tierNet > 0 ? tierNet : 0;
  }
  let net = gross - platformFee - processingFee;
  if (net < 0) net = 0;
  const annual = net * 12;
  const effectiveRate = gross > 0 ? (gross - net) / gross : 0;
  return { gross, platformFee, processingFee, net, annual, effectiveRate, perTier };
}

export function patreonPatronsForGoal(
  goalUsd: number,
  tierPrice: number,
  plan: keyof typeof PATREON_PLAN_RATES,
  processing: { percent: number; fixedPerTransaction: number } = PATREON_PROCESSING_DEFAULT,
): number {
  if (!Number.isFinite(goalUsd) || goalUsd <= 0) return 0;
  const price = g(tierPrice);
  if (price <= 0) return 0;
  const planRate = PATREON_PLAN_RATES[plan] ?? PATREON_PLAN_RATES.standard;
  const netPerPatron =
    price - price * planRate - (price * processing.percent + processing.fixedPerTransaction);
  if (netPerPatron <= 0) return 0;
  return Math.ceil(goalUsd / netPerPatron);
}
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `npm test`
Expected: PASS — all tests pass. The 12 new `patreon revenue calculator` tests pass; suite total 65 → 77.

- [ ] **Step 6: Build + lint**

Run: `npm run build`
Expected: 44 pages (unchanged — no page changes this task), green.

Run: `npm run lint`
Expected: clean. If prettier flags files YOU touched this task (`src/data/patreonConfig.ts`, `src/lib/calculators/patreon.ts`, `tests/calculators.test.ts`), run `npx prettier --write <file>` on those files only, then re-run lint. Do NOT reformat docs or files outside this task's scope.

- [ ] **Step 7: Commit**

```bash
git add src/data/patreonConfig.ts src/lib/calculators/patreon.ts tests/calculators.test.ts
git commit -m "feat(patreon): add Patreon revenue pure math + config + tests

PatreonRevenueCalculator pure layer: estimatePatreonRevenue (tiers ->
gross - plan fee - per-transaction processing) + patreonPatronsForGoal.
patreonConfig.ts holds Standard 10% + legacy Lite/Pro/Premium plan rates,
2.9% + $0.30 processing, tier defaults. 12 tests appended to the shared
tests/calculators.test.ts (suite 65 -> 77).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Patreon island + page + registry + FAQs

**Files:**

- Create: `src/components/calculators/PatreonCalculator.astro`
- Create: `src/pages/patreon-revenue-calculator.astro`
- Modify: `src/lib/site.ts` (append one Patreon entry to `TOOLS[]`)
- Modify: `src/data/faqs.ts` (append `patreonRevenueFaqs` export)

**Interfaces:**

- Consumes: `estimatePatreonRevenue`, `patreonPatronsForGoal` from `src/lib/calculators/patreon.ts` (Task 1); `PATREON_PLAN_PRESETS`, `PATREON_PROCESSING_DEFAULT`, `PATREON_TIER_DEFAULTS` from `src/data/patreonConfig.ts` (Task 1); `formatCurrency` from `src/lib/format.ts`; `RangeSlider` from `src/components/primitives/RangeSlider.astro`; `ToolLayout` from `src/layouts/ToolLayout.astro`.
- Produces: the `/patreon-revenue-calculator` page (44 → 45 pages); a `TOOLS[]` entry; `patreonRevenueFaqs`.

- [ ] **Step 1: Write `src/components/calculators/PatreonCalculator.astro`**

```astro
---
import { estimatePatreonRevenue, patreonPatronsForGoal } from '../../lib/calculators/patreon';
import { PATREON_PLAN_PRESETS, PATREON_PROCESSING_DEFAULT, PATREON_TIER_DEFAULTS } from '../../data/patreonConfig';
import { formatCurrency } from '../../lib/format';
import RangeSlider from '../primitives/RangeSlider.astro';
---
<form class="patreon-calc" data-tool="patreon-revenue">
  <div class="tiers">
    <fieldset class="panel-mini">
      <legend>Tier 1</legend>
      <label>Patrons
        <RangeSlider id="t1-patrons" label="" min={0} max={5000} step={1} value={PATREON_TIER_DEFAULTS.tier1.patrons} compact />
      </label>
      <label>Price ($)
        <RangeSlider id="t1-price" label="" min={0} max={100} step={1} value={PATREON_TIER_DEFAULTS.tier1.price} prefix="$" compact />
      </label>
    </fieldset>
    <fieldset class="panel-mini">
      <legend>Tier 2</legend>
      <label>Patrons
        <RangeSlider id="t2-patrons" label="" min={0} max={5000} step={1} value={PATREON_TIER_DEFAULTS.tier2.patrons} compact />
      </label>
      <label>Price ($)
        <RangeSlider id="t2-price" label="" min={0} max={100} step={1} value={PATREON_TIER_DEFAULTS.tier2.price} prefix="$" compact />
      </label>
    </fieldset>
    <fieldset class="panel-mini">
      <legend>Tier 3</legend>
      <label>Patrons
        <RangeSlider id="t3-patrons" label="" min={0} max={5000} step={1} value={PATREON_TIER_DEFAULTS.tier3.patrons} compact />
      </label>
      <label>Price ($)
        <RangeSlider id="t3-price" label="" min={0} max={100} step={1} value={PATREON_TIER_DEFAULTS.tier3.price} prefix="$" compact />
      </label>
    </fieldset>
  </div>

  <label class="plan-row">Plan
    <select data-plan>
      {PATREON_PLAN_PRESETS.map(p => <option value={p.value} selected={p.value === 'standard'}>{p.label}</option>)}
    </select>
  </label>
  <p class="processing-line">Processing: {(PATREON_PROCESSING_DEFAULT.percent * 100).toFixed(1)}% + {formatCurrency(PATREON_PROCESSING_DEFAULT.fixedPerTransaction, "USD")}/pledge</p>

  <div class="result" data-result aria-live="polite">$0.00 / month</div>
  <div class="sub" data-subresult></div>

  <div class="breakdown" data-breakdown>
    <strong>Where your money goes</strong>
    <div class="breakdown-grid" data-breakdown-grid></div>
  </div>

  <div class="goal-calc" data-goal>
    <label>Tier
      <select data-goal-tier>
        <option value="tier1" selected>Tier 1</option>
        <option value="tier2">Tier 2</option>
        <option value="tier3">Tier 3</option>
      </select>
    </label>
    <label>Monthly goal ($)
      <input type="number" min="0" data-goal-input value="1000" />
    </label>
    <p data-goal-output>At the Standard plan you need ~<strong>247</strong> $5 patrons/month.</p>
  </div>
</form>
<script>
  import { estimatePatreonRevenue, patreonPatronsForGoal } from '../../lib/calculators/patreon';
  import { formatCurrency } from '../../lib/format';
  import { PATREON_PLAN_PRESETS } from '../../data/patreonConfig';

  const form = document.querySelector('[data-tool="patreon-revenue"]') as HTMLFormElement;
  const sliderValue = (id: string) => Number(form.querySelector(`[data-range-slider="${id}"]`)?.dataset.value ?? 0);

  const tierPriceSlider = (tierKey: string) =>
    tierKey === 'tier1' ? 't1-price' : tierKey === 'tier2' ? 't2-price' : 't3-price';

  const read = () => ({
    tiers: {
      tier1: { patrons: sliderValue('t1-patrons'), price: sliderValue('t1-price') },
      tier2: { patrons: sliderValue('t2-patrons'), price: sliderValue('t2-price') },
      tier3: { patrons: sliderValue('t3-patrons'), price: sliderValue('t3-price') },
    },
    plan: (form.querySelector('[data-plan]') as HTMLSelectElement)?.value ?? 'standard',
  });

  const render = () => {
    const r = estimatePatreonRevenue(read());
    form.querySelector('[data-result]')!.textContent = `${formatCurrency(r.net, 'USD')} / month`;
    form.querySelector('[data-subresult]')!.textContent = `≈ ${formatCurrency(r.annual, 'USD')} / year · ${(r.effectiveRate * 100).toFixed(1)}% in fees`;

    const grid = form.querySelector('[data-breakdown-grid]') as HTMLElement;
    const rows = [
      { label: 'Gross', value: r.gross },
      { label: 'Platform fee', value: r.platformFee },
      { label: 'Processing fee', value: r.processingFee },
      { label: 'Net', value: r.net },
      { label: 'Tier 1 net', value: r.perTier.tier1 },
      { label: 'Tier 2 net', value: r.perTier.tier2 },
      { label: 'Tier 3 net', value: r.perTier.tier3 },
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
    const plan = (form.querySelector('[data-plan]') as HTMLSelectElement)?.value ?? 'standard';
    const tierKey = (form.querySelector('[data-goal-tier]') as HTMLSelectElement)?.value ?? 'tier1';
    const price = sliderValue(tierPriceSlider(tierKey));
    const needed = patreonPatronsForGoal(goal, price, plan);
    const planLabel = PATREON_PLAN_PRESETS.find(p => p.value === plan)?.label ?? 'Standard 10% (new creators)';
    form.querySelector('[data-goal-output]')!.innerHTML = `At the ${planLabel} you need <strong>${needed.toLocaleString()}</strong> ${formatCurrency(price, 'USD')} patrons/month to hit ${formatCurrency(goal, 'USD')}.`;
  };

  form.querySelectorAll('[data-range-slider]').forEach(slider => {
    slider.addEventListener('input', render);
  });
  form.querySelector('[data-plan]')?.addEventListener('change', render);
  form.querySelector('[data-goal-tier]')?.addEventListener('change', renderGoal);
  form.querySelector('[data-goal-input]')?.addEventListener('input', renderGoal);

  render();
</script>
<style>
  .patreon-calc { display: flex; flex-direction: column; gap: var(--spacing-6); }
  .tiers { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--spacing-4); }
  .panel-mini { border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-surface-warm); padding: var(--spacing-4); display: grid; gap: var(--spacing-4); }
  legend { font-weight: 800; font-size: var(--text-sm); color: var(--color-fg); padding: 0 var(--spacing-2); }
  label { display: grid; gap: var(--spacing-2); color: var(--color-fg-2); font-size: var(--text-sm); font-weight: 700; }
  .plan-row { display: grid; gap: var(--spacing-2); color: var(--color-fg-2); font-size: var(--text-sm); font-weight: 700; }
  select { width: 100%; min-height: 44px; padding: 0 var(--spacing-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-fg); font: inherit; transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard); }
  select:focus { outline: none; border-color: var(--color-accent); box-shadow: var(--shadow-focus-ring); }
  .processing-line { color: var(--color-muted); font-size: var(--text-sm); margin: 0; }
  .result { font-family: var(--font-mono); font-size: clamp(28px, 4vw, 48px); font-weight: 700; color: var(--color-accent); line-height: var(--leading-tight); white-space: nowrap; }
  .sub { color: var(--color-muted); font-size: var(--text-sm); }
  .breakdown { display: flex; flex-direction: column; gap: var(--spacing-3); padding: var(--spacing-4); border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-surface-warm); }
  .breakdown strong { font-size: var(--text-sm); color: var(--color-fg); }
  .breakdown-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--spacing-3); }
  .breakdown-cell { display: flex; flex-direction: column; gap: var(--spacing-1); padding: var(--spacing-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); }
  .breakdown-cell span { font-size: var(--text-xs); font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); }
  .breakdown-cell strong { font-family: var(--font-mono); font-size: var(--text-base); color: var(--color-fg); }
  .goal-calc { display: grid; grid-template-columns: 1fr 1fr 2fr; gap: var(--spacing-4); align-items: center; padding: var(--spacing-4); border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-surface-warm); }
  .goal-calc label { margin: 0; }
  .goal-calc input { width: 100%; min-height: 44px; padding: 0 var(--spacing-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-fg); font: inherit; }
  .goal-calc input:focus { outline: none; border-color: var(--color-accent); box-shadow: var(--shadow-focus-ring); }
  .goal-calc p { color: var(--color-fg-2); font-size: var(--text-sm); margin: 0; }
  .goal-calc p strong { color: var(--color-accent); }
  @media (max-width: 860px) { .tiers, .goal-calc { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 2: Append `patreonRevenueFaqs` to `src/data/faqs.ts`**

Append at the END of `src/data/faqs.ts` (after the existing `adRevenueFaqs` export). Do not modify existing exports.

```ts
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
```

- [ ] **Step 3: Write `src/pages/patreon-revenue-calculator.astro`**

```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import PatreonCalculator from '../components/calculators/PatreonCalculator.astro';
import { patreonRevenueFaqs } from '../data/faqs';
---
<ToolLayout
  title="Patreon Revenue Calculator"
  description="Estimate Patreon take-home from membership tiers after Patreon's plan fee and per-transaction processing. See effective fee rate by tier."
  slug="patreon-revenue-calculator"
  crumbs={[{ name: 'Home', url: '/' }, { name: 'Patreon Tools', url: '/patreon-revenue-calculator' }]}
  faqs={patreonRevenueFaqs}
>
  <PatreonCalculator />
</ToolLayout>
```

- [ ] **Step 4: Append the Patreon entry to `TOOLS[]` in `src/lib/site.ts`**

Append at the END of the `TOOLS` array (after the existing `twitch-ad-revenue-calculator` entry, before `] as const;`). Do not reorder existing entries.

```ts
  {
    slug: "patreon-revenue-calculator",
    name: "Patreon Revenue Calculator",
    short: "Patreon",
    desc: "Estimate Patreon take-home by tier after plan fee + processing.",
  },
```

- [ ] **Step 5: Build + test + lint**

Run: `npm run build`
Expected: 44 → 45 pages, green.

Run: `npm test`
Expected: 77/77 passing (no test changes this task).

Run: `npm run lint`
Expected: clean. If prettier flags files YOU touched this task (the 2 new files + 2 modified files), run `npx prettier --write <file>` on those files only, then re-run lint. Do NOT reformat docs or files outside this task's scope.

- [ ] **Step 6: Headless verification**

Confirm `/patreon-revenue-calculator/` appears in `dist/`:

```bash
ls dist/patreon-revenue-calculator/
```

Expected: an `index.html` exists.

Optionally start a preview and curl the H1:

```bash
npm run preview &
# wait a few seconds for the server to start
curl -s http://localhost:4321/patreon-revenue-calculator/ | grep -o '<h1>[^<]*</h1>'
pkill -f "astro preview"
```

Expected: `<h1>Patreon Revenue Calculator</h1>`.

- [ ] **Step 7: Commit**

```bash
git add src/components/calculators/PatreonCalculator.astro src/pages/patreon-revenue-calculator.astro src/lib/site.ts src/data/faqs.ts
git commit -m "feat(patreon): add Patreon Revenue Calculator page + island + FAQs + registry

Three-tier island (patrons + price each) with plan select (Standard 10%
default) and per-pledge processing display. New /patreon-revenue-calculator
ToolLayout page, patreonRevenueFaqs, and TOOLS[] entry.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Spotify config + pure calculator + tests

**Files:**

- Create: `src/data/spotifyConfig.ts`
- Create: `src/lib/calculators/spotify.ts`
- Modify: `tests/calculators.test.ts` (append imports + one `describe` block)

**Interfaces:**

- Consumes: nothing from earlier tasks (greenfield config + math). Independent of Task 1/2 — may run before or after.
- Produces:
  - `SPOTIFY_REGION_RATES`, `SPOTIFY_REGION_PRESETS`, `SPOTIFY_CREATOR_SHARE_DEFAULT`, `SPOTIFY_STREAMS_DEFAULT` (from `spotifyConfig.ts`)
  - `estimateSpotifyRoyalties(i: SpotifyRoyaltiesInput): SpotifyRoyaltiesResult`
  - `spotifyStreamsForGoal(goalUsd: number, region: keyof typeof SPOTIFY_REGION_RATES, creatorShare: number): number`
  - `interface SpotifyRoyaltiesInput { streams: number; region: keyof typeof SPOTIFY_REGION_RATES; creatorShare: number }`
  - `interface SpotifyRoyaltiesResult { gross: number; net: number; annual: number; per1000: number; rate: number }`

- [ ] **Step 1: Write `src/data/spotifyConfig.ts`**

```ts
export const SPOTIFY_REGION_RATES = {
  us: 0.0044,
  uk: 0.0044,
  eu: 0.004, // Germany ~0.0042, France ~0.0037 -> avg
  canada: 0.004,
  nordic: 0.0066, // Sweden/Norway/Finland/Denmark avg
  latin_america: 0.0019, // Brazil 0.0021, Mexico 0.0017 -> avg
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

- [ ] **Step 2: Write the failing tests (append to `tests/calculators.test.ts`)**

Add to the import block at the top of `tests/calculators.test.ts` (after the `import { estimatePatreonRevenue, patreonPatronsForGoal } from "../src/lib/calculators/patreon";` line added in Task 1):

```ts
import {
  estimateSpotifyRoyalties,
  spotifyStreamsForGoal,
} from "../src/lib/calculators/spotify";
```

Append this `describe` block at the end of the file (after the `patreon revenue calculator` describe block):

```ts
describe("spotify royalties calculator", () => {
  it("computes gross = streams x rate, net = gross x share/100 for US", () => {
    const r = estimateSpotifyRoyalties({ streams: 100000, region: "us", creatorShare: 70 });
    expect(r.gross).toBeCloseTo(100000 * 0.0044, 4); // 440
    expect(r.net).toBeCloseTo(440 * 0.7, 4); // 308
  });

  it("annual is net x 12", () => {
    const r = estimateSpotifyRoyalties({ streams: 100000, region: "us", creatorShare: 70 });
    expect(r.annual).toBeCloseTo(r.net * 12, 4);
  });

  it("per1000 is rate x 1000 x share/100", () => {
    const r = estimateSpotifyRoyalties({ streams: 100000, region: "us", creatorShare: 70 });
    expect(r.per1000).toBeCloseTo(0.0044 * 1000 * 0.7, 4); // 3.08
  });

  it("resolves each region to its sourced rate", () => {
    const cases = [
      { region: "us", rate: 0.0044 },
      { region: "uk", rate: 0.0044 },
      { region: "eu", rate: 0.004 },
      { region: "canada", rate: 0.004 },
      { region: "nordic", rate: 0.0066 },
      { region: "latin_america", rate: 0.0019 },
      { region: "india", rate: 0.0008 },
      { region: "global", rate: 0.003 },
    ] as const;
    for (const c of cases) {
      const r = estimateSpotifyRoyalties({ streams: 1000, region: c.region, creatorShare: 100 });
      expect(r.gross).toBeCloseTo(1000 * c.rate, 6);
      expect(r.rate).toBeCloseTo(c.rate, 6);
    }
  });

  it("falls back to global for an invalid region", () => {
    const r = estimateSpotifyRoyalties({ streams: 1000, region: "mars" as any, creatorShare: 100 });
    expect(r.rate).toBeCloseTo(0.003, 6);
    expect(r.gross).toBeCloseTo(3, 4);
  });

  it("clamps creatorShare > 100 to 100", () => {
    const r = estimateSpotifyRoyalties({ streams: 1000, region: "us", creatorShare: 150 });
    expect(r.net).toBeCloseTo(r.gross, 4);
  });

  it("guards NaN/negative/Infinity streams to 0", () => {
    const r = estimateSpotifyRoyalties({ streams: NaN, region: "us", creatorShare: 70 });
    expect(r.gross).toBe(0);
    expect(r.net).toBe(0);
  });

  it("share 0 yields 0 net", () => {
    const r = estimateSpotifyRoyalties({ streams: 100000, region: "us", creatorShare: 0 });
    expect(r.net).toBe(0);
    expect(r.per1000).toBe(0);
  });

  it("spotifyStreamsForGoal returns 0 for goal <= 0", () => {
    expect(spotifyStreamsForGoal(0, "us", 70)).toBe(0);
    expect(spotifyStreamsForGoal(-500, "us", 70)).toBe(0);
  });

  it("spotifyStreamsForGoal returns 0 when share is 0", () => {
    expect(spotifyStreamsForGoal(1000, "us", 0)).toBe(0);
  });

  it("spotifyStreamsForGoal ceils the streams needed", () => {
    // netPerStream = 0.0044 * 0.70 = 0.00308; 1000/0.00308 = 324675.32 -> 324676
    expect(spotifyStreamsForGoal(1000, "us", 70)).toBe(324676);
  });
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/lib/calculators/spotify'`. The existing 77 tests (65 + 12 from Task 1) still pass.

- [ ] **Step 4: Write `src/lib/calculators/spotify.ts`**

```ts
import {
  SPOTIFY_REGION_RATES,
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

const g = (n: number): number => (Number.isFinite(n) && n >= 0 ? n : 0);

export function estimateSpotifyRoyalties(
  i: SpotifyRoyaltiesInput,
): SpotifyRoyaltiesResult {
  const rate = SPOTIFY_REGION_RATES[i.region] ?? SPOTIFY_REGION_RATES.global;
  let share = g(i.creatorShare);
  if (share > 100) share = 100;
  const gross = g(i.streams) * rate;
  const net = gross * (share / 100);
  const annual = net * 12;
  const per1000 = rate * 1000 * (share / 100);
  return { gross, net, annual, per1000, rate };
}

export function spotifyStreamsForGoal(
  goalUsd: number,
  region: keyof typeof SPOTIFY_REGION_RATES,
  creatorShare: number,
): number {
  if (!Number.isFinite(goalUsd) || goalUsd <= 0) return 0;
  const rate = SPOTIFY_REGION_RATES[region] ?? SPOTIFY_REGION_RATES.global;
  let share = g(creatorShare);
  if (share > 100) share = 100;
  const netPerStream = rate * (share / 100);
  if (netPerStream <= 0) return 0;
  return Math.ceil(goalUsd / netPerStream);
}
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `npm test`
Expected: PASS — all tests pass. The 11 new `spotify royalties calculator` tests pass; suite total 77 → 88.

- [ ] **Step 6: Build + lint**

Run: `npm run build`
Expected: 45 pages (unchanged if Task 2 ran; 44 if Task 2 has not run — no page changes this task), green.

Run: `npm run lint`
Expected: clean. If prettier flags files YOU touched this task (`src/data/spotifyConfig.ts`, `src/lib/calculators/spotify.ts`, `tests/calculators.test.ts`), run `npx prettier --write <file>` on those files only, then re-run lint. Do NOT reformat docs or files outside this task's scope.

- [ ] **Step 7: Commit**

```bash
git add src/data/spotifyConfig.ts src/lib/calculators/spotify.ts tests/calculators.test.ts
git commit -m "feat(spotify): add Spotify royalties pure math + config + tests

estimateSpotifyRoyalties (streams x region rate x creator share) +
spotifyStreamsForGoal. spotifyConfig.ts holds sourced per-stream rates
for 8 regions (US/UK/Europe/Canada/Nordic/LatAm/India/Global), 70% default
share, 100k default streams. 11 tests appended (suite 77 -> 88).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Spotify island + page + registry + FAQs

**Files:**

- Create: `src/components/calculators/SpotifyCalculator.astro`
- Create: `src/pages/spotify-royalties-calculator.astro`
- Modify: `src/lib/site.ts` (append one Spotify entry to `TOOLS[]`)
- Modify: `src/data/faqs.ts` (append `spotifyRoyaltiesFaqs` export)

**Interfaces:**

- Consumes: `estimateSpotifyRoyalties`, `spotifyStreamsForGoal` from `src/lib/calculators/spotify.ts` (Task 3); `SPOTIFY_REGION_PRESETS`, `SPOTIFY_CREATOR_SHARE_DEFAULT`, `SPOTIFY_STREAMS_DEFAULT` from `src/data/spotifyConfig.ts` (Task 3); `formatCurrency`, `formatCurrencyPrecise` from `src/lib/format.ts` (`formatCurrencyPrecise` is required for sub-$0.01 per-stream rates); `RangeSlider`; `ToolLayout`.
- Produces: the `/spotify-royalties-calculator` page (45 → 46 pages); a `TOOLS[]` entry; `spotifyRoyaltiesFaqs`.

- [ ] **Step 1: Write `src/components/calculators/SpotifyCalculator.astro`**

```astro
---
import { estimateSpotifyRoyalties, spotifyStreamsForGoal } from '../../lib/calculators/spotify';
import { SPOTIFY_REGION_PRESETS, SPOTIFY_CREATOR_SHARE_DEFAULT, SPOTIFY_STREAMS_DEFAULT } from '../../data/spotifyConfig';
import { formatCurrency } from '../../lib/format';
import RangeSlider from '../primitives/RangeSlider.astro';
---
<form class="spotify-calc" data-tool="spotify-royalties">
  <fieldset class="panel-mini">
    <legend>Streams & region</legend>
    <label>Monthly streams
      <RangeSlider id="streams" label="" min={0} max={10000000} step={1000} value={SPOTIFY_STREAMS_DEFAULT} compact />
    </label>
    <label>Region
      <select data-region>
        {SPOTIFY_REGION_PRESETS.map(r => <option value={r.value} selected={r.value === 'us'}>{r.label}</option>)}
      </select>
    </label>
    <label>Creator share (%)
      <RangeSlider id="share" label="" min={0} max={100} step={1} value={SPOTIFY_CREATOR_SHARE_DEFAULT} suffix="%" compact />
    </label>
  </fieldset>

  <p class="rate-line" data-rate></p>

  <div class="result" data-result aria-live="polite">$0.00 / month</div>
  <div class="sub" data-subresult></div>

  <div class="breakdown" data-breakdown>
    <strong>Where your royalties come from</strong>
    <div class="breakdown-grid" data-breakdown-grid></div>
  </div>

  <div class="goal-calc" data-goal>
    <label>Monthly goal ($)
      <input type="number" min="0" data-goal-input value="1000" />
    </label>
    <p data-goal-output>At 70% in the United States you need ~<strong>324,676</strong> streams/month.</p>
  </div>
</form>
<script>
  import { estimateSpotifyRoyalties, spotifyStreamsForGoal } from '../../lib/calculators/spotify';
  import { formatCurrency, formatCurrencyPrecise } from '../../lib/format';
  import { SPOTIFY_REGION_PRESETS } from '../../data/spotifyConfig';

  const form = document.querySelector('[data-tool="spotify-royalties"]') as HTMLFormElement;
  const sliderValue = (id: string) => Number(form.querySelector(`[data-range-slider="${id}"]`)?.dataset.value ?? 0);

  const read = () => ({
    streams: sliderValue('streams'),
    region: (form.querySelector('[data-region]') as HTMLSelectElement)?.value ?? 'global',
    creatorShare: sliderValue('share'),
  });

  const render = () => {
    const r = estimateSpotifyRoyalties(read());
    form.querySelector('[data-result]')!.textContent = `${formatCurrency(r.net, 'USD')} / month`;
    form.querySelector('[data-subresult]')!.textContent = `≈ ${formatCurrency(r.annual, 'USD')} / year · ${formatCurrency(r.per1000, 'USD')}/1,000 streams net`;
    form.querySelector('[data-rate]')!.textContent = `${formatCurrencyPrecise(r.rate, 'USD')}/stream · ${formatCurrency(r.per1000, 'USD')}/1,000 streams (your share)`;

    const streams = sliderValue('streams');
    const grid = form.querySelector('[data-breakdown-grid]') as HTMLElement;
    const rows = [
      { label: 'Streams', display: streams.toLocaleString() },
      { label: 'Gross', display: formatCurrency(r.gross, 'USD') },
      { label: 'Creator share', display: formatCurrency(r.gross - r.net, 'USD') },
      { label: 'Net', display: formatCurrency(r.net, 'USD') },
      { label: 'Per 1k net', display: formatCurrency(r.per1000, 'USD') },
    ];
    grid.innerHTML = rows.map(row => `
      <div class="breakdown-cell">
        <span>${row.label}</span>
        <strong>${row.display}</strong>
      </div>
    `).join('');

    renderGoal();
  };

  const renderGoal = () => {
    const goal = Number((form.querySelector('[data-goal-input]') as HTMLInputElement)?.value ?? 0);
    const region = (form.querySelector('[data-region]') as HTMLSelectElement)?.value ?? 'global';
    const share = sliderValue('share');
    const needed = spotifyStreamsForGoal(goal, region, share);
    const regionLabel = SPOTIFY_REGION_PRESETS.find(p => p.value === region)?.label ?? 'Global average';
    form.querySelector('[data-goal-output]')!.innerHTML = `At ${share}% in ${regionLabel} you need <strong>${needed.toLocaleString()}</strong> streams/month to hit ${formatCurrency(goal, 'USD')}.`;
  };

  form.querySelectorAll('[data-range-slider]').forEach(slider => {
    slider.addEventListener('input', render);
  });
  form.querySelector('[data-region]')?.addEventListener('change', render);
  form.querySelector('[data-goal-input]')?.addEventListener('input', renderGoal);

  render();
</script>
<style>
  .spotify-calc { display: flex; flex-direction: column; gap: var(--spacing-6); }
  .panel-mini { border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-surface-warm); padding: var(--spacing-4); display: grid; gap: var(--spacing-4); }
  legend { font-weight: 800; font-size: var(--text-sm); color: var(--color-fg); padding: 0 var(--spacing-2); }
  label { display: grid; gap: var(--spacing-2); color: var(--color-fg-2); font-size: var(--text-sm); font-weight: 700; }
  select { width: 100%; min-height: 44px; padding: 0 var(--spacing-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-fg); font: inherit; transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard); }
  select:focus { outline: none; border-color: var(--color-accent); box-shadow: var(--shadow-focus-ring); }
  .rate-line { color: var(--color-muted); font-size: var(--text-sm); margin: 0; }
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
  @media (max-width: 860px) { .goal-calc { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 2: Append `spotifyRoyaltiesFaqs` to `src/data/faqs.ts`**

Append at the END of `src/data/faqs.ts` (after the `patreonRevenueFaqs` export added in Task 2). Do not modify existing exports.

```ts
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
```

- [ ] **Step 3: Write `src/pages/spotify-royalties-calculator.astro`**

```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import SpotifyCalculator from '../components/calculators/SpotifyCalculator.astro';
import { spotifyRoyaltiesFaqs } from '../data/faqs';
---
<ToolLayout
  title="Spotify Royalties Calculator"
  description="Estimate Spotify royalty take-home from monthly streams, per-stream rate by region, and your creator share after label/distributor."
  slug="spotify-royalties-calculator"
  crumbs={[{ name: 'Home', url: '/' }, { name: 'Spotify Tools', url: '/spotify-royalties-calculator' }]}
  faqs={spotifyRoyaltiesFaqs}
>
  <SpotifyCalculator />
</ToolLayout>
```

- [ ] **Step 4: Append the Spotify entry to `TOOLS[]` in `src/lib/site.ts`**

Append at the END of the `TOOLS` array (after the `patreon-revenue-calculator` entry added in Task 2, before `] as const;`). Do not reorder existing entries.

```ts
  {
    slug: "spotify-royalties-calculator",
    name: "Spotify Royalties Calculator",
    short: "Spotify",
    desc: "Estimate Spotify royalties by region rate × creator share.",
  },
```

- [ ] **Step 5: Build + test + lint**

Run: `npm run build`
Expected: 45 → 46 pages, green.

Run: `npm test`
Expected: 88/88 passing (no test changes this task).

Run: `npm run lint`
Expected: clean. If prettier flags files YOU touched this task (the 2 new files + 2 modified files), run `npx prettier --write <file>` on those files only, then re-run lint. Do NOT reformat docs or files outside this task's scope.

- [ ] **Step 6: Headless verification**

Confirm `/spotify-royalties-calculator/` appears in `dist/`:

```bash
ls dist/spotify-royalties-calculator/
```

Expected: an `index.html` exists.

Optionally start a preview and curl the H1:

```bash
npm run preview &
# wait a few seconds for the server to start
curl -s http://localhost:4321/spotify-royalties-calculator/ | grep -o '<h1>[^<]*</h1>'
pkill -f "astro preview"
```

Expected: `<h1>Spotify Royalties Calculator</h1>`.

- [ ] **Step 7: Commit**

```bash
git add src/components/calculators/SpotifyCalculator.astro src/pages/spotify-royalties-calculator.astro src/lib/site.ts src/data/faqs.ts
git commit -m "feat(spotify): add Spotify Royalties Calculator page + island + FAQs + registry

Single-panel island (streams + region select + creator share slider) with
rate display and goal calc. Uses formatCurrencyPrecise for sub-\$0.01
per-stream rates. New /spotify-royalties-calculator ToolLayout page,
spotifyRoyaltiesFaqs, and TOOLS[] entry.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-Review (run after writing the plan, before execution)

**1. Spec coverage:** Every spec section maps to a task — `patreonConfig.ts`/`patreon.ts`/patreon tests → Task 1; Patreon island/page/registry/FAQs → Task 2; `spotifyConfig.ts`/`spotify.ts`/spotify tests → Task 3; Spotify island/page/registry/FAQs → Task 4. Pure-function guards, region/plan fallbacks, share clamp, goal functions, SEO-via-ToolLayout, append-only `TOOLS[]`/`faqs.ts`, no-regression list, and sources all covered.

**2. Placeholder scan:** No TBD/TODO; every code step contains the full code. Test counts hand-traced: Task 1 adds 12 tests (65 → 77), Task 3 adds 11 tests (77 → 88). Build page counts: Task 2 44 → 45, Task 4 45 → 46. The `patreonPatronsForGoal(1000, 5, "standard") = 247` and `spotifyStreamsForGoal(1000, "us", 70) = 324676` examples are hand-verified (5 − 0.50 − 0.445 = 4.055 → ceil(246.61) = 247; 0.0044 × 0.70 = 0.00308 → ceil(324675.32) = 324676).

**3. Type consistency:** `PatreonRevenueResult` fields (`gross`, `platformFee`, `processingFee`, `net`, `annual`, `effectiveRate`, `perTier`) match between the interface (Task 1 Step 4), the tests (Task 1 Step 2), and the island (Task 2 Step 1 — reads `r.net`, `r.annual`, `r.effectiveRate`, `r.perTier.tier1/tier2/tier3`, `r.gross`, `r.platformFee`, `r.processingFee`). `SpotifyRoyaltiesResult` fields (`gross`, `net`, `annual`, `per1000`, `rate`) match between the interface (Task 3 Step 4), the tests (Task 3 Step 2), and the island (Task 4 Step 1 — reads `r.net`, `r.annual`, `r.per1000`, `r.rate`, `r.gross`). The Spotify island uses `formatCurrencyPrecise` (not `formatCurrency`) for `r.rate` to avoid rounding $0.0044 to $0.00. `SPOTIFY_REGION_RATES` keys match `SPOTIFY_REGION_PRESETS` values (us/uk/eu/canada/nordic/latin_america/india/global).

**4. Convention consistency:** Test imports append after the existing `ads` import (Task 1) and after the `patreon` import (Task 3); `describe` blocks append at file end. `TOOLS[]` entries append before `] as const;`. FAQ exports append at file end. Islands mirror `KickRevenueCalculator.astro` (slider-read idiom `?? 0`, `data-range-slider` dataset, `data-tool` root, single-accent styles). Pages mirror `kick-revenue-calculator.astro` (ToolLayout with title/description/slug/crumbs/faqs). Task headings are `## Task N` (not `## Task B2-N`) for `task-brief` awk compatibility — B2 context lives in the plan title + prose.

No issues found. Plan is execution-ready.