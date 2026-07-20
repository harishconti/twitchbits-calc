# Sub-project C1 — Net Income/Tax Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single-page Net Income/Tax Calculator that estimates a creator's take-home pay after income tax and self-employment/social contributions across the US, UK, Canada, and Australia, using a unified jurisdiction config so the pure calculator has zero per-country code branches.

**Architecture:** Data-driven config in `src/data/taxConfig.ts` encodes every jurisdiction's brackets, allowances, and social contributions (with `floor`/`cap`/`baseFactor` primitives handling US SE tax, UK Class 4 two-tier bands, CA CPP, and AU Medicare uniformly). A pure guarded `estimateNetIncome` in `src/lib/calculators/netIncome.ts` consumes that config. A vanilla-JS island renders jurisdiction + US filing-status selects, gross/expenses sliders, an optional flat-tax override, and a breakdown grid. A `ToolLayout` page wraps it with FAQ JSON-LD.

**Tech Stack:** Astro 6 static output, Tailwind 4, vanilla-JS islands, Vitest 3 (`environment: node`), TypeScript. No new dependencies.

## Global Constraints

Copied verbatim from the approved spec (`docs/superpowers/specs/2026-07-20-subproject-c1-design.md`) + repo CLAUDE.md:

- **Zero backend (Rule 1).** No DB, no auth, no API keys, no SSR/edge, no fetch. All math client-side. C1 is pure static.
- **Rates never hardcoded in components (Rule 2).** Every bracket threshold, rate, allowance, cap, and base factor lives in `src/data/taxConfig.ts`. The calculator and island read from config only. A 2027 rebaseline is a data edit.
- **`src/lib/calculators/` is pure (Rule 3).** No DOM, no Astro imports, no side effects. Input guard `g(n) = Number.isFinite(n) && n >= 0 ? n : 0` on every numeric input (NaN/negative/Infinity → 0). All calculator functions have Vitest tests.
- **Single accent color (Rule 4).** `#9146ff` only on focus rings, primary CTAs, active tab, result accent. Everything else slate. No neon gradients.
- **No render-blocking 3rd-party scripts (Rule 5).** Cloudflare Web Analytics only.
- **Performance bar (Rule 6).** Lighthouse ≥ 95, LCP < 1.2s, TBT < 50ms. One new static page; no regression.
- **Structural SEO (Rule 7).** One page = one keyword, exact H1 "Net Income Tax Calculator", one H2 per section, canonical bare-URL (no query params), WebApplication + FAQPage + Breadcrumb JSON-LD via `ToolLayout` (built from `netIncomeFaqs`).
- **Affiliate IDs are config (Rule 8).** `src/data/affiliateLinks.ts` untouched; disclosure page auto-renders.
- **Test convention:** all calculator math tests are appended to the single shared file `tests/calculators.test.ts`. Do NOT create `src/lib/calculators/*.test.ts`.
- **Commit trailer:** every commit ends with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- **Branch:** `build/subproject-c`. Do not push a red build. Do not open a PR (cumulative roadmap).

**Test-count note:** the spec's "89 → ~104" was based on stale ledger counts. The actual `tests/calculators.test.ts` has **71 tests across 10 `describe` blocks** (811 lines, ends at the `spotify royalties calculator` block). C1 adds 14 tests + 1 describe block → **71 → 85 tests, 10 → 11 describe blocks**.

---

## File Structure

### New files (4)

| File | Responsibility |
| ---- | -------------- |
| `src/data/taxConfig.ts` | Single editable source of truth for tax math: `TaxBracket`, `SocialContribution`, `FilingStatus`, `Jurisdiction` interfaces; `JURISDICTIONS` record (US/UK/CA/AU with sourced 2026/2025-26 figures); `JURISDICTION_PRESETS`, `FILING_STATUS_PRESETS`, `TAX_DEFAULTS`. No behavior — data + types only. |
| `src/lib/calculators/netIncome.ts` | Pure `estimateNetIncome(i)` — guards inputs, resolves jurisdiction + filing status, computes social tax, QBI (US), taxable income, income tax (brackets or flat override), total tax, net, effective/marginal rate, and an ordered breakdown array. No DOM/Astro imports. |
| `src/components/calculators/NetIncomeCalculator.astro` | Vanilla-JS island: jurisdiction `<select>`, US filing-status `<select>` (hidden for non-US), gross + expenses `RangeSlider`s with dynamic currency prefix, optional flat-tax-override `<input>`, result + subresult + breakdown grid. Dual frontmatter+inline-script import of `estimateNetIncome`. |
| `src/pages/net-income-tax-calculator.astro` | `ToolLayout` page: exact H1, description, slug, crumbs, `netIncomeFaqs`. Slot renders `<NetIncomeCalculator />`. |

### Modified files (3, append-only)

| File | Change |
| ---- | ------ |
| `src/lib/site.ts` | Append one entry to the `TOOLS` array (after the Spotify entry, before the closing `] as const`). |
| `src/data/faqs.ts` | Append `export const netIncomeFaqs = [ ... ];` at end of file. |
| `tests/calculators.test.ts` | Add one import line after the Spotify import block; append `describe("net income / tax calculator", () => { ... })` at end of file. |

### Untouched (no-regression — do not modify)

All 10 existing calc modules (`bits.ts`, `revenue.ts`, `subs.ts`, `tiktok.ts`, `youtube.ts`, `sponsorship.ts`, `kick.ts`, `ads.ts`, `patreon.ts`, `spotify.ts`), all 10 existing islands, all 10 existing pages, `programmatic.ts`, `programmatic.test.ts`, `affiliateLinks.ts`, `toolContent.ts`, every other config in `src/data/`.

---

## Task 1 (C1-1): Tax config + pure calculator + tests

**Files:**
- Create: `src/data/taxConfig.ts`
- Create: `src/lib/calculators/netIncome.ts`
- Modify: `tests/calculators.test.ts` (add import + append `describe` block)

**Interfaces:**
- Consumes: nothing (config + calc are the foundation).
- Produces:
  - `taxConfig.ts` exports: `JurisdictionCode` (type), `TaxBracket` (interface), `SocialContribution` (interface), `FilingStatus` (interface), `Jurisdiction` (interface), `JURISDICTIONS` (Record), `JURISDICTION_PRESETS`, `FILING_STATUS_PRESETS`, `TAX_DEFAULTS`.
  - `netIncome.ts` exports: `NetIncomeInput` (interface), `NetIncomeResult` (interface), `estimateNetIncome(i: NetIncomeInput): NetIncomeResult`.
- Task C1-2 consumes `JURISDICTIONS`, `JURISDICTION_PRESETS`, `FILING_STATUS_PRESETS`, `TAX_DEFAULTS` from `taxConfig.ts` and `estimateNetIncome` from `netIncome.ts`.

- [ ] **Step 1: Write `src/data/taxConfig.ts`**

Create the file with this exact content (sourced figures in comments; see spec §11 for sources):

```ts
export type JurisdictionCode = "us" | "uk" | "ca" | "au";

export interface TaxBracket {
  min: number; // lower bound of this bracket (taxable income)
  rate: number; // marginal rate as a fraction, e.g. 0.10
}

export interface SocialContribution {
  name: string; // "Social Security (12.4%)", "Class 4 NIC (6%)", etc.
  rate: number; // fraction of base, e.g. 0.124 for SS
  cap?: number; // optional upper bound of the band (SS wage base, YMPE, UK upper limit)
  floor?: number; // optional lower bound of the band (UK Class 4 limits 12,570 / 50,270)
  baseFactor?: number; // optional multiplier on netSE (US 0.9235); defaults to 1
}

export interface FilingStatus {
  code: string; // "single", "mfj", "hoh", "mfs"
  label: string; // "Single", "Married filing jointly", ...
  brackets: TaxBracket[];
  standardDeduction: number;
}

export interface Jurisdiction {
  code: JurisdictionCode;
  label: string; // "United States"
  currency: string; // "USD", "GBP", "CAD", "AUD"
  filingStatuses?: FilingStatus[]; // US uses per-filing-status brackets + standardDeduction
  brackets?: TaxBracket[]; // UK/CA/AU use flat brackets (no filing-status dimension)
  personalAllowance?: number; // UK £12,570; CA BPA $16,452. US uses per-status standardDeduction.
  social: SocialContribution[];
  qbiRate?: number; // US-only: 0.20 applied to (netSE - socialTax/2). Absent for UK/CA/AU.
  overrideLabel?: string; // label for the optional flat-tax input
}

export const JURISDICTIONS: Record<JurisdictionCode, Jurisdiction> = {
  us: {
    code: "us",
    label: "United States",
    currency: "USD",
    filingStatuses: [
      {
        code: "single",
        label: "Single",
        standardDeduction: 16100,
        brackets: [
          { min: 0, rate: 0.1 },
          { min: 12400, rate: 0.12 },
          { min: 50400, rate: 0.22 },
          { min: 105700, rate: 0.24 },
          { min: 201775, rate: 0.32 },
          { min: 256225, rate: 0.35 },
          { min: 640600, rate: 0.37 },
        ],
      },
      {
        code: "mfj",
        label: "Married filing jointly",
        standardDeduction: 32200,
        brackets: [
          { min: 0, rate: 0.1 },
          { min: 24800, rate: 0.12 },
          { min: 100800, rate: 0.22 },
          { min: 211400, rate: 0.24 },
          { min: 403550, rate: 0.32 },
          { min: 512450, rate: 0.35 },
          { min: 768700, rate: 0.37 },
        ],
      },
      {
        code: "hoh",
        label: "Head of household",
        standardDeduction: 24150,
        brackets: [
          { min: 0, rate: 0.1 },
          { min: 17700, rate: 0.12 },
          { min: 67450, rate: 0.22 },
          { min: 105700, rate: 0.24 },
          { min: 201775, rate: 0.32 },
          { min: 256200, rate: 0.35 },
          { min: 640600, rate: 0.37 },
        ],
      },
      {
        code: "mfs",
        label: "Married filing separately",
        standardDeduction: 16100,
        brackets: [
          { min: 0, rate: 0.1 },
          { min: 12400, rate: 0.12 },
          { min: 50400, rate: 0.22 },
          { min: 105700, rate: 0.24 },
          { min: 201775, rate: 0.32 },
          { min: 256226, rate: 0.35 },
          { min: 384350, rate: 0.37 },
        ],
      },
    ],
    // SE tax 15.3% = 12.4% SS (cap at 2026 wage base $184,500) + 2.9% Medicare (uncapped),
    // applied to 92.35% of netSE. Two entries sharing baseFactor 0.9235; only SS carries the cap.
    social: [
      { name: "Social Security (12.4%)", rate: 0.124, cap: 184500, baseFactor: 0.9235 },
      { name: "Medicare (2.9%)", rate: 0.029, baseFactor: 0.9235 },
    ],
    qbiRate: 0.2,
    overrideLabel: "Flat tax rate % (optional, overrides brackets)",
  },
  uk: {
    code: "uk",
    label: "United Kingdom",
    currency: "GBP",
    // England bands (Wales/NI same). Scotland excluded (non-goal).
    brackets: [
      { min: 0, rate: 0.2 }, // basic rate
      { min: 37700, rate: 0.4 }, // higher rate
      { min: 125140, rate: 0.45 }, // additional rate
    ],
    personalAllowance: 12570, // frozen to 2031; £100k taper excluded (non-goal)
    // Class 4 NIC: 6% on profits 12,570–50,270; 2% above 50,270.
    // Two entries: the first band capped at 50,270 with floor 12,570;
    // the second uncapped with floor 50,270.
    social: [
      { name: "Class 4 NIC (6%)", rate: 0.06, floor: 12570, cap: 50270 },
      { name: "Class 4 NIC (2%)", rate: 0.02, floor: 50270 },
    ],
    overrideLabel: "Flat tax rate % (optional, overrides bands)",
  },
  ca: {
    code: "ca",
    label: "Canada",
    currency: "CAD",
    brackets: [
      { min: 0, rate: 0.14 }, // 2026 lowest rate (was 15% in 2024, 14.5% in 2025)
      { min: 58523, rate: 0.205 },
      { min: 117045, rate: 0.26 },
      { min: 181440, rate: 0.29 },
      { min: 258482, rate: 0.33 },
    ],
    personalAllowance: 16452, // 2026 max Basic Personal Amount (modeled as a deduction; see spec §5 simplification note)
    // Self-employed CPP: both halves = 11.9% on pensionable earnings,
    // capped at 2026 YMPE $74,600. YBE ($3,500) and CPP2 (4% on 74,600–85,000)
    // excluded (non-goal) — CPP modeled on full netSE up to YMPE.
    social: [
      { name: "CPP self-employed (11.9%)", rate: 0.119, cap: 74600 },
    ],
    overrideLabel: "Flat tax rate % (optional, overrides brackets)",
  },
  au: {
    code: "au",
    label: "Australia",
    currency: "AUD",
    // 2025-26 resident brackets. The 0% first bracket is the tax-free threshold
    // ($18,200) — no personalAllowance/standardDeduction needed.
    brackets: [
      { min: 0, rate: 0.0 },
      { min: 18200, rate: 0.16 },
      { min: 45000, rate: 0.3 },
      { min: 135000, rate: 0.37 },
      { min: 190000, rate: 0.45 },
    ],
    // Medicare levy 2% of taxable income (no low-income phase-in modeled — non-goal).
    social: [
      { name: "Medicare levy (2%)", rate: 0.02 },
    ],
    overrideLabel: "Flat tax rate % (optional, overrides brackets)",
  },
} as const;

export const JURISDICTION_PRESETS = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
] as const;

export const FILING_STATUS_PRESETS = [
  { value: "single", label: "Single" },
  { value: "mfj", label: "Married filing jointly" },
  { value: "hoh", label: "Head of household" },
  { value: "mfs", label: "Married filing separately" },
] as const;

export const TAX_DEFAULTS = {
  jurisdiction: "us" as JurisdictionCode,
  filingStatus: "single",
  gross: 60000,
  expenses: 5000,
} as const;
```

- [ ] **Step 2: Add the test import to `tests/calculators.test.ts`**

The file's import block currently ends with the Spotify import (lines 34–37):

```ts
import {
  estimateSpotifyRoyalties,
  spotifyStreamsForGoal,
} from "../src/lib/calculators/spotify";
```

Immediately after that block, add:

```ts
import { estimateNetIncome } from "../src/lib/calculators/netIncome";
```

- [ ] **Step 3: Write the failing tests — append the `describe` block at the end of `tests/calculators.test.ts`**

The file currently ends at line 811 with `});` closing the `spotify royalties calculator` block. Append this block after it:

```ts
describe("net income / tax calculator", () => {
  it("US single $60k/$5k: SE tax + QBI + bracket income tax hand-trace", () => {
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "single",
    });
    // netSE 55000; SE base 50792.50; SS 6298.27; Medicare 1472.98; socialTax 7771.25
    expect(r.netSE).toBeCloseTo(55000, 2);
    expect(r.socialTax).toBeCloseTo(7771.25, 2);
    // QBI = 0.20 * (55000 - 7771.25/2) = 0.20 * 51114.37 = 10222.87
    expect(r.qbiDeduction).toBeCloseTo(10222.87, 2);
    // taxable = 55000 - 16100 - 10222.87 = 28677.13
    expect(r.taxableIncome).toBeCloseTo(28677.13, 2);
    // income tax = 0.10*12400 + 0.12*(28677.13-12400) = 1240 + 1953.26 = 3193.26
    expect(r.incomeTax).toBeCloseTo(3193.26, 2);
    expect(r.totalTax).toBeCloseTo(10964.51, 2);
    expect(r.net).toBeCloseTo(44035.49, 2);
    expect(r.effectiveRate).toBeCloseTo(0.1827, 4);
    expect(r.marginalRate).toBeCloseTo(0.12, 2);
    expect(r.currency).toBe("USD");
  });

  it("UK £60k/£5k: Class 4 NIC two bands + England bands hand-trace", () => {
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "uk",
    });
    // Class 4: 0.06*(50270-12570) + 0.02*(55000-50270) = 2262 + 94.60 = 2356.60
    expect(r.socialTax).toBeCloseTo(2356.6, 2);
    // personalAllowance 12570; taxable 42430; IT = 0.20*37700 + 0.40*4730 = 9432
    expect(r.taxableIncome).toBeCloseTo(42430, 2);
    expect(r.incomeTax).toBeCloseTo(9432, 2);
    expect(r.totalTax).toBeCloseTo(11788.6, 2);
    expect(r.net).toBeCloseTo(43211.4, 2);
    expect(r.effectiveRate).toBeCloseTo(0.1965, 4);
    expect(r.marginalRate).toBeCloseTo(0.4, 2);
    expect(r.currency).toBe("GBP");
  });

  it("CA C$60k/C$5k: self-employed CPP 11.9% + 14% first bracket", () => {
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "ca",
    });
    // CPP = 0.119 * min(55000, 74600) = 6545
    expect(r.socialTax).toBeCloseTo(6545, 2);
    // BPA 16452; taxable 38548; IT = 0.14*38548 = 5396.72
    expect(r.taxableIncome).toBeCloseTo(38548, 2);
    expect(r.incomeTax).toBeCloseTo(5396.72, 2);
    expect(r.totalTax).toBeCloseTo(11941.72, 2);
    expect(r.net).toBeCloseTo(43058.28, 2);
    expect(r.effectiveRate).toBeCloseTo(0.199, 4);
    expect(r.marginalRate).toBeCloseTo(0.14, 2);
    expect(r.currency).toBe("CAD");
  });

  it("AU A$60k/A$5k: Medicare 2% + 0%/16%/30% brackets hand-trace", () => {
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "au",
    });
    // Medicare = 0.02 * 55000 = 1100; no allowance; taxable 55000
    expect(r.socialTax).toBeCloseTo(1100, 2);
    expect(r.taxableIncome).toBeCloseTo(55000, 2);
    // IT = 0.16*(45000-18200) + 0.30*(55000-45000) = 4288 + 3000 = 7288
    expect(r.incomeTax).toBeCloseTo(7288, 2);
    expect(r.totalTax).toBeCloseTo(8388, 2);
    expect(r.net).toBeCloseTo(46612, 2);
    expect(r.effectiveRate).toBeCloseTo(0.1398, 4);
    expect(r.marginalRate).toBeCloseTo(0.3, 2);
    expect(r.currency).toBe("AUD");
  });

  it("US MFJ: higher standard deduction lowers tax vs single", () => {
    const single = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "single",
    });
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "mfj",
    });
    // SE tax is filing-status-independent
    expect(r.socialTax).toBeCloseTo(7771.25, 2);
    // MFJ: taxable = 55000 - 32200 - 10222.87 = 12577.13; IT = 0.10*12577.13 = 1257.71
    expect(r.taxableIncome).toBeCloseTo(12577.13, 2);
    expect(r.incomeTax).toBeCloseTo(1257.71, 2);
    expect(r.marginalRate).toBeCloseTo(0.1, 2);
    // married benefit: MFJ net (~45971) > single net (~44035)
    expect(r.net).toBeCloseTo(45971.04, 1);
    expect(r.net).toBeGreaterThan(single.net);
  });

  it("overrideRate replaces the bracket engine with a flat tax", () => {
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "single",
      overrideRate: 15,
    });
    // overrideTax = 0.15 * 28677.13 = 4301.57; incomeTax = overrideTax
    expect(r.overrideTax).toBeCloseTo(4301.57, 2);
    expect(r.incomeTax).toBeCloseTo(4301.57, 2);
    expect(r.totalTax).toBeCloseTo(12072.82, 2);
    expect(r.net).toBeCloseTo(42927.18, 2);
    expect(r.marginalRate).toBeCloseTo(0.15, 2);
  });

  it("guards NaN/negative/Infinity gross and expenses to 0", () => {
    const r = estimateNetIncome({
      gross: NaN,
      expenses: -1000,
      jurisdiction: "us",
    });
    expect(r.gross).toBe(0);
    expect(r.expenses).toBe(0);
    expect(r.netSE).toBe(0);
    expect(r.socialTax).toBe(0);
    expect(r.incomeTax).toBe(0);
    expect(r.net).toBe(0);
  });

  it("falls back to US for an invalid jurisdiction", () => {
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "mars" as any,
    });
    expect(r.currency).toBe("USD");
    expect(r.net).toBeCloseTo(44035.49, 2);
  });

  it("falls back to single for an invalid US filing status", () => {
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "nonexistent" as any,
    });
    expect(r.net).toBeCloseTo(44035.49, 2);
  });

  it("ignores NaN/negative overrideRate and uses brackets", () => {
    const byBrackets = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "single",
    });
    const nanOverride = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "single",
      overrideRate: NaN,
    });
    const negOverride = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "single",
      overrideRate: -5,
    });
    expect(nanOverride.incomeTax).toBeCloseTo(byBrackets.incomeTax, 2);
    expect(nanOverride.overrideTax).toBe(0);
    expect(negOverride.incomeTax).toBeCloseTo(byBrackets.incomeTax, 2);
  });

  it("clamps overrideRate > 100 to 100", () => {
    const r = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "single",
      overrideRate: 150,
    });
    // 100% of taxable 28677.13 = 28677.13
    expect(r.overrideTax).toBeCloseTo(28677.13, 2);
    expect(r.incomeTax).toBeCloseTo(28677.13, 2);
    expect(r.marginalRate).toBeCloseTo(1.0, 2);
  });

  it("net is never negative when expenses exceed gross", () => {
    const r = estimateNetIncome({
      gross: 5000,
      expenses: 60000,
      jurisdiction: "us",
    });
    expect(r.netSE).toBe(0);
    expect(r.net).toBe(0);
  });

  it("resolves currency for each jurisdiction", () => {
    expect(
      estimateNetIncome({ gross: 1000, expenses: 0, jurisdiction: "us" }).currency,
    ).toBe("USD");
    expect(
      estimateNetIncome({ gross: 1000, expenses: 0, jurisdiction: "uk" }).currency,
    ).toBe("GBP");
    expect(
      estimateNetIncome({ gross: 1000, expenses: 0, jurisdiction: "ca" }).currency,
    ).toBe("CAD");
    expect(
      estimateNetIncome({ gross: 1000, expenses: 0, jurisdiction: "au" }).currency,
    ).toBe("AUD");
  });

  it("breakdown has Gross first, Net last, and a QBI row only for the US", () => {
    const us = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "us",
      filingStatus: "single",
    });
    expect(us.breakdown[0].label).toBe("Gross");
    expect(us.breakdown[us.breakdown.length - 1].label).toBe("Net");
    expect(us.breakdown.some((row) => row.label === "QBI deduction")).toBe(true);
    expect(us.breakdown.some((row) => row.label === "Net SE income")).toBe(true);

    const uk = estimateNetIncome({
      gross: 60000,
      expenses: 5000,
      jurisdiction: "uk",
    });
    expect(uk.breakdown.some((row) => row.label === "QBI deduction")).toBe(false);
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test -- --run 2>&1 | tail -20` (or `npx vitest run tests/calculators.test.ts`)
Expected: FAIL. The new `describe("net income / tax calculator")` block fails because `src/lib/calculators/netIncome.ts` does not exist yet (module resolution error / `estimateNetIncome is not a function`). The existing 71 tests still pass.

- [ ] **Step 5: Write `src/lib/calculators/netIncome.ts`**

Create the file with this exact content:

```ts
import {
  JURISDICTIONS,
  type JurisdictionCode,
  type TaxBracket,
} from "../../data/taxConfig";

export interface NetIncomeInput {
  gross: number;
  expenses: number;
  jurisdiction: JurisdictionCode;
  filingStatus?: string; // US only; ignored for UK/CA/AU
  overrideRate?: number; // optional flat tax rate %, 0-100; overrides income-tax brackets
}

export interface NetIncomeResult {
  gross: number;
  expenses: number;
  netSE: number; // gross - expenses, guarded >= 0
  socialTax: number; // sum of all SocialContribution entries
  qbiDeduction: number; // US only; 0 for UK/CA/AU
  taxableIncome: number; // netSE - allowance - qbi, guarded >= 0
  incomeTax: number; // bracket engine OR overrideRate * taxableIncome
  overrideTax: number; // 0 unless overrideRate provided and > 0
  totalTax: number; // socialTax + incomeTax
  net: number; // netSE - totalTax, guarded >= 0
  effectiveRate: number; // totalTax / gross, 0-1 (0 if gross <= 0)
  marginalRate: number; // top bracket rate touched (fraction); 0 if no taxable income
  currency: string; // resolved jurisdiction currency
  breakdown: { label: string; amount: number }[]; // ordered display rows
}

const g = (n: number): number => (Number.isFinite(n) && n >= 0 ? n : 0);

export function estimateNetIncome(i: NetIncomeInput): NetIncomeResult {
  const gross = g(i.gross);
  const expenses = g(i.expenses);
  const netSE = Math.max(0, gross - expenses);

  const j = JURISDICTIONS[i.jurisdiction] ?? JURISDICTIONS.us;

  // Resolve brackets + allowance. US uses per-filing-status; others use flat brackets.
  let brackets: readonly TaxBracket[];
  let allowance: number;
  if (j.filingStatuses) {
    const fs =
      j.filingStatuses.find((f) => f.code === i.filingStatus) ??
      j.filingStatuses[0];
    brackets = fs.brackets;
    allowance = fs.standardDeduction;
  } else {
    brackets = j.brackets ?? [];
    allowance = j.personalAllowance ?? 0;
  }

  // Social tax: each entry is rate * max(0, min(base, cap ?? Inf) - (floor ?? 0)),
  // where base = netSE * (baseFactor ?? 1). One formula covers all four countries.
  const socialEntries: { label: string; amount: number }[] = [];
  let socialTax = 0;
  for (const s of j.social) {
    const base = netSE * (s.baseFactor ?? 1);
    const band = Math.max(0, Math.min(base, s.cap ?? Infinity) - (s.floor ?? 0));
    const amount = s.rate * band;
    socialTax += amount;
    socialEntries.push({ label: s.name, amount });
  }

  // QBI (US only): 20% of (netSE - socialTax/2), no phaseout.
  const qbiDeduction = j.qbiRate
    ? j.qbiRate * Math.max(0, netSE - socialTax / 2)
    : 0;

  const taxableIncome = Math.max(0, netSE - allowance - qbiDeduction);

  // Income tax: flat override OR marginal brackets.
  let incomeTax: number;
  let overrideTax = 0;
  let marginalRate = 0;
  if (Number.isFinite(i.overrideRate) && (i.overrideRate as number) > 0) {
    const rate = Math.min(100, Math.max(0, i.overrideRate as number)) / 100;
    overrideTax = rate * taxableIncome;
    incomeTax = overrideTax;
    marginalRate = rate;
  } else {
    incomeTax = 0;
    const sorted = [...brackets].sort((a, b) => a.min - b.min);
    for (let k = 0; k < sorted.length; k++) {
      const b = sorted[k];
      const top = k + 1 < sorted.length ? sorted[k + 1].min : Infinity;
      if (taxableIncome > b.min) {
        incomeTax += b.rate * (Math.min(taxableIncome, top) - b.min);
        marginalRate = b.rate;
      }
    }
  }

  const totalTax = socialTax + incomeTax;
  const net = Math.max(0, netSE - totalTax);
  const effectiveRate = gross > 0 ? totalTax / gross : 0;

  const breakdown: { label: string; amount: number }[] = [
    { label: "Gross", amount: gross },
    { label: "Expenses", amount: expenses },
    { label: "Net SE income", amount: netSE },
    ...socialEntries,
  ];
  if (qbiDeduction > 0) {
    breakdown.push({ label: "QBI deduction", amount: qbiDeduction });
  }
  breakdown.push(
    { label: "Taxable income", amount: taxableIncome },
    { label: "Income tax", amount: incomeTax },
    { label: "Total tax", amount: totalTax },
    { label: "Net", amount: net },
  );

  return {
    gross,
    expenses,
    netSE,
    socialTax,
    qbiDeduction,
    taxableIncome,
    incomeTax,
    overrideTax,
    totalTax,
    net,
    effectiveRate,
    marginalRate,
    currency: j.currency,
    breakdown,
  };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run tests/calculators.test.ts`
Expected: PASS — all 85 tests green (71 existing + 14 new in the `net income / tax calculator` block). If any hand-traced value is off by more than the `toBeCloseTo` tolerance, re-check the relevant config figure against the spec before adjusting.

- [ ] **Step 7: Run lint to verify the new files are clean**

Run: `npm run lint`
Expected: clean (prettier + eslint pass on `taxConfig.ts`, `netIncome.ts`, and the test additions).

- [ ] **Step 8: Commit**

```bash
git add src/data/taxConfig.ts src/lib/calculators/netIncome.ts tests/calculators.test.ts
git commit -m "$(cat <<'EOF'
feat(net-income): add Net Income/Tax pure calculator + taxConfig

Unified jurisdiction config (US/UK/CA/AU) encodes every country's
brackets, allowances, and social contributions as plain config — US SE
tax (0.9235 base factor + SS wage cap + per-filing-status brackets +
QBI), UK Class 4 NIC two-tier bands (floor/cap), CA self-employed CPP
11.9% + YMPE, AU Medicare 2% + 0% tax-free threshold. estimateNetIncome
has zero per-country code branches. 14 hand-traced tests appended to
tests/calculators.test.ts (suite 71 -> 85).

Sourced 2026/2025-26 figures from IRS, GOV.UK, CRA, ATO.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 (C1-2): Island + page + registry + FAQs

**Files:**
- Create: `src/components/calculators/NetIncomeCalculator.astro`
- Create: `src/pages/net-income-tax-calculator.astro`
- Modify: `src/lib/site.ts` (append one `TOOLS` entry)
- Modify: `src/data/faqs.ts` (append `netIncomeFaqs` export)

**Interfaces:**
- Consumes: `estimateNetIncome` from `src/lib/calculators/netIncome.ts`; `JURISDICTION_PRESETS`, `FILING_STATUS_PRESETS`, `TAX_DEFAULTS` from `src/data/taxConfig.ts`; `formatCurrency` from `src/lib/format.ts`; `RangeSlider` from `src/components/primitives/RangeSlider.astro`; `netIncomeFaqs` from `src/data/faqs.ts`; `ToolLayout` from `src/layouts/ToolLayout.astro`.
- Produces: the live `/net-income-tax-calculator` page + its island + the registry/FAQ entries that make it discoverable. No exports consumed by later tasks (C1 is the last C1 task).

- [ ] **Step 1: Append `netIncomeFaqs` to `src/data/faqs.ts`**

The file ends with the `spotifyRoyaltiesFaqs` array (its closing `];` is the last line). Append this block at the end of the file:

```ts
export const netIncomeFaqs = [
  {
    q: "How is net income calculated for a creator?",
    a: "Net income = gross revenue minus business expenses minus income tax minus self-employment/social tax. This calculator estimates each piece using 2026 brackets for your jurisdiction.",
  },
  {
    q: "What is self-employment tax?",
    a: "In the US, self-employment tax is 15.3% (12.4% Social Security + 2.9% Medicare) applied to 92.35% of your net earnings, separate from income tax. The UK has Class 4 NIC, Canada has CPP (both halves = 11.9%), and Australia has the 2% Medicare levy.",
  },
  {
    q: "Why does take-home vary so much by country?",
    a: "Each country has different brackets, allowances, and social contributions. The same $60,000 gross can leave you with materially different net pay across the US, UK, Canada, and Australia — switch the jurisdiction selector to compare.",
  },
  {
    q: "What is the QBI deduction?",
    a: "US-only: the Qualified Business Income deduction lets many self-employed people deduct 20% of their net business income (after half of SE tax) before income tax is calculated. This calculator applies it without the high-income phaseout.",
  },
  {
    q: "Is this calculator tax advice?",
    a: "No — estimates only. The model is deliberately simplified (no state tax, no itemized deductions, no phaseouts, and Canada's BPA and Australia's LITO are not modeled as credits). For real figures, use your jurisdiction's official tax tool or a CPA.",
  },
];
```

- [ ] **Step 2: Append the `TOOLS` entry to `src/lib/site.ts`**

The `TOOLS` array currently ends with the Spotify entry followed by the closing `] as const;`:

```ts
  {
    slug: "spotify-royalties-calculator",
    name: "Spotify Royalties Calculator",
    short: "Spotify",
    desc: "Estimate Spotify royalties by region rate × creator share.",
  },
] as const;
```

Insert this new entry immediately before the closing `] as const;`:

```ts
  {
    slug: "net-income-tax-calculator",
    name: "Net Income Tax Calculator",
    short: "Net Income",
    desc: "Estimate creator take-home pay after income tax and self-employment tax (US/UK/CA/AU).",
  },
```

- [ ] **Step 3: Write `src/components/calculators/NetIncomeCalculator.astro`**

Create the file with this exact content (modeled on `SpotifyCalculator.astro`; currency prefix on the sliders is mutated on jurisdiction change; the US filing-status `<select>` is hidden for non-US jurisdictions; no goal calc — single forward calculation only):

```astro
---
import { estimateNetIncome } from '../../lib/calculators/netIncome';
import { JURISDICTION_PRESETS, FILING_STATUS_PRESETS, TAX_DEFAULTS } from '../../data/taxConfig';
import RangeSlider from '../primitives/RangeSlider.astro';
---
<form class="net-income-calc" data-tool="net-income-tax">
  <fieldset class="panel-mini">
    <legend>Income & expenses</legend>
    <label>Jurisdiction
      <select data-jurisdiction>
        {JURISDICTION_PRESETS.map(j => <option value={j.value} selected={j.value === TAX_DEFAULTS.jurisdiction}>{j.label}</option>)}
      </select>
    </label>
    <label class="filing-wrap" data-filing-wrap>
      Filing status (US only)
      <select data-filing>
        {FILING_STATUS_PRESETS.map(f => <option value={f.value} selected={f.value === TAX_DEFAULTS.filingStatus}>{f.label}</option>)}
      </select>
    </label>
    <label>Gross income
      <RangeSlider id="gross" label="" min={0} max={500000} step={1000} value={TAX_DEFAULTS.gross} prefix="$" compact />
    </label>
    <label>Business expenses
      <RangeSlider id="expenses" label="" min={0} max={100000} step={500} value={TAX_DEFAULTS.expenses} prefix="$" compact />
    </label>
    <label class="override-row">Flat tax rate % (optional, overrides brackets)
      <input type="number" min={0} max={100} step={0.1} data-override placeholder="blank = brackets" />
    </label>
  </fieldset>

  <p class="disclaimer-line">Estimates only — not tax advice. Simplified model; see the FAQ below.</p>

  <div class="result" data-result aria-live="polite">$0.00 take-home</div>
  <div class="sub" data-subresult></div>

  <div class="breakdown" data-breakdown>
    <strong>Where your money goes</strong>
    <div class="breakdown-grid" data-breakdown-grid></div>
  </div>
</form>
<script>
  import { estimateNetIncome } from '../../lib/calculators/netIncome';
  import { formatCurrency } from '../../lib/format';

  const CURRENCY_SYMBOL: Record<string, string> = { us: '$', uk: '£', ca: 'C$', au: 'A$' };

  const form = document.querySelector('[data-tool="net-income-tax"]') as HTMLFormElement;
  const sliderValue = (id: string) => Number(form.querySelector(`[data-range-slider="${id}"]`)?.dataset.value ?? 0);

  const read = () => {
    const jurisdiction = (form.querySelector('[data-jurisdiction]') as HTMLSelectElement)?.value ?? 'us';
    const filingStatus = (form.querySelector('[data-filing]') as HTMLSelectElement)?.value ?? 'single';
    const rawOverride = Number((form.querySelector('[data-override]') as HTMLInputElement)?.value);
    const overrideRate = Number.isFinite(rawOverride) && rawOverride > 0 ? rawOverride : undefined;
    return {
      gross: sliderValue('gross'),
      expenses: sliderValue('expenses'),
      jurisdiction: jurisdiction as 'us' | 'uk' | 'ca' | 'au',
      filingStatus,
      overrideRate,
    };
  };

  const updateJurisdictionUI = (jurisdiction: string) => {
    const sym = CURRENCY_SYMBOL[jurisdiction] ?? '$';
    form.querySelectorAll<HTMLElement>('[data-range-slider="gross"] .prefix, [data-range-slider="expenses"] .prefix')
      .forEach((el) => { el.textContent = sym; });
    const wrap = form.querySelector<HTMLElement>('[data-filing-wrap]');
    if (wrap) wrap.style.display = jurisdiction === 'us' ? '' : 'none';
  };

  const render = () => {
    const input = read();
    updateJurisdictionUI(input.jurisdiction);
    const r = estimateNetIncome(input);
    form.querySelector('[data-result]')!.textContent = `${formatCurrency(r.net, r.currency)} take-home`;
    form.querySelector('[data-subresult]')!.textContent = `${(r.effectiveRate * 100).toFixed(1)}% total tax · ${(r.marginalRate * 100).toFixed(1)}% marginal bracket`;

    const grid = form.querySelector('[data-breakdown-grid]') as HTMLElement;
    grid.innerHTML = r.breakdown.map((row) => `
      <div class="breakdown-cell">
        <span>${row.label}</span>
        <strong>${formatCurrency(row.amount, r.currency)}</strong>
      </div>
    `).join('');
  };

  form.querySelectorAll('[data-range-slider]').forEach((slider) => {
    slider.addEventListener('input', render);
  });
  form.querySelector('[data-jurisdiction]')?.addEventListener('change', render);
  form.querySelector('[data-filing]')?.addEventListener('change', render);
  form.querySelector('[data-override]')?.addEventListener('input', render);

  render();
</script>
<style>
  .net-income-calc { display: flex; flex-direction: column; gap: var(--spacing-6); }
  .panel-mini { border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-surface-warm); padding: var(--spacing-4); display: grid; gap: var(--spacing-4); }
  legend { font-weight: 800; font-size: var(--text-sm); color: var(--color-fg); padding: 0 var(--spacing-2); }
  label { display: grid; gap: var(--spacing-2); color: var(--color-fg-2); font-size: var(--text-sm); font-weight: 700; }
  select { width: 100%; min-height: 44px; padding: 0 var(--spacing-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-fg); font: inherit; transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard); }
  select:focus { outline: none; border-color: var(--color-accent); box-shadow: var(--shadow-focus-ring); }
  .override-row input { width: 100%; min-height: 44px; padding: 0 var(--spacing-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-fg); font: inherit; }
  .override-row input:focus { outline: none; border-color: var(--color-accent); box-shadow: var(--shadow-focus-ring); }
  .disclaimer-line { color: var(--color-muted); font-size: var(--text-sm); margin: 0; }
  .result { font-family: var(--font-mono); font-size: clamp(28px, 4vw, 48px); font-weight: 700; color: var(--color-accent); line-height: var(--leading-tight); white-space: nowrap; }
  .sub { color: var(--color-muted); font-size: var(--text-sm); }
  .breakdown { display: flex; flex-direction: column; gap: var(--spacing-3); padding: var(--spacing-4); border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-surface-warm); }
  .breakdown strong { font-size: var(--text-sm); color: var(--color-fg); }
  .breakdown-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--spacing-3); }
  .breakdown-cell { display: flex; flex-direction: column; gap: var(--spacing-1); padding: var(--spacing-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); }
  .breakdown-cell span { font-size: var(--text-xs); font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); }
  .breakdown-cell strong { font-family: var(--font-mono); font-size: var(--text-base); color: var(--color-fg); }
</style>
```

- [ ] **Step 4: Write `src/pages/net-income-tax-calculator.astro`**

Create the file with this exact content (`RelatedReads` and `RelatedTools` are auto-rendered by `ToolLayout` with no props, matching the Patreon/Spotify pages):

```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import NetIncomeCalculator from '../components/calculators/NetIncomeCalculator.astro';
import { netIncomeFaqs } from '../data/faqs';
---
<ToolLayout
  title="Net Income Tax Calculator"
  description="Estimate creator take-home pay after income tax and self-employment/social tax across the US, UK, Canada, and Australia."
  slug="net-income-tax-calculator"
  crumbs={[{ name: 'Home', url: '/' }, { name: 'Tax Tools', url: '/net-income-tax-calculator' }]}
  faqs={netIncomeFaqs}
>
  <NetIncomeCalculator />
</ToolLayout>
```

- [ ] **Step 5: Build, test, and lint to verify everything is green**

Run all three:

```bash
npm test
npm run build
npm run lint
```

Expected:
- `npm test` → 85 tests pass (71 existing + 14 new).
- `npm run build` → succeeds; page count goes from **46 → 47** (the new `/net-income-tax-calculator/` page). No Astro errors.
- `npm run lint` → clean (prettier + eslint pass on all four new/modified files).

If the build page count is not 47, check that `src/pages/net-income-tax-calculator.astro` was created exactly as written and that `src/lib/site.ts` has the new `TOOLS` entry (the registry drives nav but not the page count — the page count is driven by the `.astro` file in `src/pages/`).

- [ ] **Step 6: Commit**

```bash
git add src/components/calculators/NetIncomeCalculator.astro src/pages/net-income-tax-calculator.astro src/lib/site.ts src/data/faqs.ts
git commit -m "$(cat <<'EOF'
feat(net-income): add Net Income/Tax Calculator page + island + FAQs + registry

Single-page tool at /net-income-tax-calculator with jurisdiction
select (US/UK/CA/AU), US filing-status select (hidden for non-US),
gross/expenses sliders with dynamic currency prefix, optional flat-tax
override, and a breakdown grid. ToolLayout wraps it with FAQ JSON-LD
(netIncomeFaqs). TOOLS registry gains the 11th entry. Build 46 -> 47
pages; 85/85 tests; lint clean.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Final whole-branch review (opus, after Task C1-2)

After both tasks are committed and green, the controller dispatches a final opus whole-branch review over `ff91763..HEAD` (C1 commits only — A/B1/B2 already passed their own final reviews). Scope: spec compliance against `docs/superpowers/specs/2026-07-20-subproject-c1-design.md`, all 8 CLAUDE.md rules, regression seam (only 4 new files + 3 append-only shared files touched), and the four hand-traced jurisdictions reconciled against the live calculator. Per SDD skill: dispatch ONE fix subagent with the complete findings list if any Critical/Important findings come back; record Minor findings in the progress ledger for triage. No PR after C1 (cumulative roadmap — C2 stacks next).