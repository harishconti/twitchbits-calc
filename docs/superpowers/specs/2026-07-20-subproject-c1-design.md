# Sub-project C1 — Design Spec

**Date:** 2026-07-20
**Branch:** `build/subproject-c` (branched from `ff91763`, the Sub-project B2 tip; carries A + B1 + B2)
**Execution model:** Subagent-Driven Development (SDD), continuous execution
**Parent roadmap:** Sub-project C of the A–E decomposition (see `docs/superpowers/plans/2026-07-19-twitch-bits-hub.md` and memory `project-sub-roadmap`). C is split into C1 (this spec — Net Income/Tax Calculator) and C2 (CPM modifiers — separate spec/plan/SDD cycle after C1).

## 1. Goal

Add one new single-page calculator tool — the **Net Income / Tax Calculator** — that estimates a creator's take-home pay after income tax and social contributions across four jurisdictions (US, UK, Canada, Australia). It follows the existing data-driven pattern (config in `src/data/*.ts`, pure guarded math in `src/lib/calculators/*.ts`, vanilla-JS island in `src/components/calculators/*.astro`, `ToolLayout` page).

The calculator foregrounds two real creator-economy realities:

1. **Self-employment social tax is a second tax on top of income tax** — US SE tax (15.3% × 92.35% of net earnings), UK Class 4 NIC, Canada CPP (both halves = 11.9%), AU Medicare levy. A creator earning $60k often pays more in social tax than in income tax.
2. **Jurisdiction is the single biggest driver of take-home** — the same $60k gross yields materially different net across US/UK/CA/AU. The jurisdiction `<select>` makes this visible in one click.

This ships as a **single tool page only** — no programmatic-SEO variant pages, no `ToolContent` depth blocks (lighter, matching B1/B2; prog-SEO may retrofit in a later sub-project).

## 2. Non-goals

- Do **not** modify any existing calculator module, island, page, or config (additive only — no regression to the 10 live tools, including A/B1/B2).
- Do **not** add programmatic-SEO routes or `toolContent.ts` blocks for C1.
- Do **not** wire this calculator into the other tools (no live cross-calculation from Twitch/YouTube/etc. revenue into this one). The input model is deliberately decoupled: a single gross + single expenses figure, per the approved scope.
- Do **not** fabricate affiliate/referral IDs. `src/data/affiliateLinks.ts` and the disclosure page are untouched.
- Do **not** open a PR after C1 — stack on `build/subproject-c` for the cumulative roadmap PR.
- Do **not** model the following (deliberate simplifications — kept out to fit an estimator's scope and the unified config model):
  - US: QBI high-income phaseout; additional 0.9% Medicare surtax; itemized deductions; state/local tax; the SE-health-insurance deduction; estimated-tax quarterly penalties.
  - UK: Scotland bands; Class 2 NIC (voluntary); the £100k personal-allowance taper; the £1,000 trading allowance; dividend tax; Making Tax Digital compliance.
  - Canada: provincial brackets + provincial CPP-top-up credits; the Basic Personal Amount as a _credit_ (modeled here as a deduction — see §5 simplification note); EI (voluntary for self-employed); CPP2 second additional 4%; the Year's Basic Exemption $3,500 (CPP modeled on full netSE up to YMPE); the Canada Employment Amount (employees only).
  - Australia: Medicare Levy Surcharge (MLS) income tiers; the low-income levy phase-in threshold (modeled as full 2% above the threshold, no shade-in); the Low Income Tax Offset (LITO) and SAPTO; the 2026-27 legislated 16%→15% second-bracket drop (this spec uses 2025-26 brackets with 16%); private health insurance rebates.
  - All jurisdictions: corporation tax, VAT/GST registration, currency conversion, joint/household income, dependents, pension contributions, student-loan repayments.
- Do **not** model the user's specific personal situation or give tax advice — the page carries a "estimates only, not tax advice" disclaimer.

## 3. Architecture & file plan

### New files (4)

| File                                                   | Purpose                                                                                       |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `src/data/taxConfig.ts`                                | Jurisdiction config (US/UK/CA/AU brackets, filing statuses, social contributions, allowances) |
| `src/lib/calculators/netIncome.ts`                     | Pure `estimateNetIncome`                                                                      |
| `src/components/calculators/NetIncomeCalculator.astro` | Jurisdiction + US filing-status `<select>` + gross/expenses/override inputs + breakdown grid  |
| `src/pages/net-income-tax-calculator.astro`            | ToolLayout page                                                                               |

### Modified files (3, append-only)

- `src/lib/site.ts` — append 1 entry to `TOOLS[]` (`net-income-tax-calculator`)
- `src/data/faqs.ts` — append `netIncomeFaqs` export (feeds visible FAQ + JSON-LD)
- `tests/calculators.test.ts` — append `describe("net income / tax calculator")` block (established convention: all calculator math tests live in this one shared file; suite 89 → ~104)

### Untouched (do not modify — no-regression)

All 10 existing calc modules (`bits.ts`, `revenue.ts`, `subs.ts`, `tiktok.ts`, `youtube.ts`, `sponsorship.ts`, `kick.ts`, `ads.ts`, `patreon.ts`, `spotify.ts`), all 10 existing islands, all 10 existing pages, `programmatic.ts`, `programmatic.test.ts`, `affiliateLinks.ts`, `toolContent.ts`, every other config in `src/data/`.

## 4. Data config

### `src/data/taxConfig.ts` (new)

Sourced figures: US IRS 2026 (Rev. Proc. 2025-32 + OBBBA); UK 2026/27 (GOV.UK); Canada 2026 (CRA, federal index factor 2.0%); Australia 2025-26 (ATO). See §11 Sources.

The model is **unified** — every jurisdiction is encoded as config, never as a per-country code branch. The pure function reads the same shapes for all four. Three config primitives carry every country's quirks:

- `SocialContribution.rate` × `min(base, cap)` where `base = netSE × (baseFactor ?? 1)` and `cap` is optional — encodes US SE tax's 92.35% base factor + SS wage cap, UK Class 4's two-tier bands (two `SocialContribution` entries with different caps), CA CPP's both-halves rate + YMPE cap, AU Medicare's flat 2%.
- `FilingStatus.brackets` (US, per filing status) vs `Jurisdiction.brackets` (UK/CA/AU, flat) — same `TaxBracket { min, rate }` shape, same marginal-bracket engine.
- `standardDeduction` (US, per filing status) / `personalAllowance` (UK, CA) — both subtracted from netSE before income tax. AU has neither (its 0% first bracket is the tax-free threshold).

```ts
export type JurisdictionCode = "us" | "uk" | "ca" | "au";

export interface TaxBracket {
  min: number; // lower bound of this bracket (taxable income)
  rate: number; // marginal rate as a fraction, e.g. 0.10
}

export interface SocialContribution {
  name: string; // "Self-employment tax", "Class 4 NIC (mid)", etc.
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
  // US uses filingStatuses (each with its own brackets + standardDeduction);
  // UK/CA/AU use flat brackets (no filing-status dimension).
  filingStatuses?: FilingStatus[];
  brackets?: TaxBracket[]; // used when filingStatuses is absent
  personalAllowance?: number; // UK £12,570; CA BPA $16,452. US uses per-status standardDeduction instead.
  social: SocialContribution[];
  // US-only: QBI deduction fraction applied to (netSE - socialTax/2).
  qbiRate?: number; // 0.20 for US; absent for UK/CA/AU
  // Optional user-supplied flat override rate (% of taxable income) — replaces
  // the income-tax bracket engine when present. The island exposes this as an
  // optional "flat tax rate %" input for power users.
  overrideLabel?: string; // "Flat tax rate % (optional)"
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
    // SE tax 15.3% = 12.4% SS (cap at wage base) + 2.9% Medicare (uncapped),
    // applied to 92.35% of netSE. Encoded as two SocialContribution entries
    // sharing baseFactor 0.9235; only the SS entry carries the cap.
    social: [
      {
        name: "Social Security (12.4%)",
        rate: 0.124,
        cap: 184500,
        baseFactor: 0.9235,
      },
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
    // Two entries: the first capped at 50,270, the second uncapped starting at 50,270.
    // (base is full netSE; cap is the upper limit of each band — see algorithm note.)
    social: [
      { name: "Class 4 NIC (6%)", rate: 0.06 }, // band handled via cap logic below
      { name: "Class 4 NIC (2%)", rate: 0.02 },
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
    personalAllowance: 16452, // 2026 max Basic Personal Amount
    // Self-employed CPP: both halves = 11.9% on pensionable earnings,
    // capped at YMPE 74,600. YBE ($3,500) and CPP2 (4% on 74,600–85,000)
    // excluded (non-goal) — CPP modeled on full netSE up to YMPE.
    social: [{ name: "CPP self-employed (11.9%)", rate: 0.119, cap: 74600 }],
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
    social: [{ name: "Medicare levy (2%)", rate: 0.02 }],
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

**Algorithm note on UK Class 4 two-tier bands:** the simple `rate × min(base, cap)` shape fits US/CA/AU directly, but UK's Class 4 has _two_ bands over different ranges of the same base. The `floor` field on `SocialContribution` (defined above) handles this without a per-country branch — the UK config encodes Class 4 as two entries:

```ts
social: [
  { name: "Class 4 NIC (6%)", rate: 0.06, floor: 12570, cap: 50270 },
  { name: "Class 4 NIC (2%)", rate: 0.02, floor: 50270 }, // uncapped above
],
```

The contribution for one entry is `rate × max(0, min(base, cap ?? Infinity) − (floor ?? 0))`, where `base = netSE × (baseFactor ?? 1)`. This single formula covers all four countries: US SS (rate 0.124, baseFactor 0.9235, cap 184500, no floor), US Medicare (rate 0.029, baseFactor 0.9235, no cap/floor), CA CPP (rate 0.119, cap 74600, no floor), AU Medicare (rate 0.02, no cap/floor), UK mid band (rate 0.06, floor 12570, cap 50270), UK top band (rate 0.02, floor 50270).

**Design note (CLAUDE.md Rule 2):** every rate, bracket threshold, allowance, and cap lives in `taxConfig.ts`. A 2027 rebaseline is a data edit — no calculator code changes. The island reads `JURISDICTIONS[code].currency` for display, so adding a 5th jurisdiction is a config append + a `JURISDICTION_PRESETS` entry.

## 5. Pure function + tests

Follows CLAUDE.md Rule 3: no DOM, no Astro imports, no side effects, `g(n) = Number.isFinite(n) && n >= 0 ? n : 0` guard on every numeric input.

### `src/lib/calculators/netIncome.ts`

```ts
import { JURISDICTIONS, type JurisdictionCode } from "../../data/taxConfig";

export interface NetIncomeInput {
  gross: number;
  expenses: number;
  jurisdiction: JurisdictionCode;
  filingStatus?: string; // US only; ignored for UK/CA/AU
  overrideRate?: number; // optional flat tax rate %, 0–100; overrides income-tax brackets
}

export interface NetIncomeResult {
  gross: number;
  expenses: number;
  netSE: number; // gross − expenses, guarded ≥ 0
  socialTax: number; // sum of all SocialContribution entries
  qbiDeduction: number; // US only; 0 for UK/CA/AU
  taxableIncome: number; // netSE − allowance − qbi, guarded ≥ 0
  incomeTax: number; // bracket engine OR overrideRate × taxableIncome
  overrideTax: number; // 0 unless overrideRate provided
  totalTax: number; // socialTax + incomeTax (where incomeTax already includes overrideTax)
  net: number; // netSE − totalTax, guarded ≥ 0
  effectiveRate: number; // totalTax / gross, 0–1 (0 if gross ≤ 0)
  marginalRate: number; // top bracket rate touched (fraction); 0 if no taxable income
  currency: string; // resolved jurisdiction currency
  breakdown: { label: string; amount: number }[]; // ordered display rows
}
```

`estimateNetIncome(i)`:

1. `gross = g(i.gross)`, `expenses = g(i.expenses)`, `netSE = max(0, gross − expenses)`.
2. Resolve jurisdiction: `j = JURISDICTIONS[i.jurisdiction] ?? JURISDICTIONS.us` (invalid code → US).
3. Resolve brackets + allowance:
   - US: resolve `filingStatus = j.filingStatuses!.find(f => f.code === i.filingStatus) ?? j.filingStatuses![0]` (invalid/missing → first = single). `brackets = filingStatus.brackets`, `allowance = filingStatus.standardDeduction`.
   - UK/CA/AU: `brackets = j.brackets!`, `allowance = j.personalAllowance ?? 0`.
4. Social tax: for each `s` in `j.social`, `base = netSE × (s.baseFactor ?? 1)`, `band = max(0, min(base, s.cap ?? Infinity) − (s.floor ?? 0))`, accumulate `socialTax += s.rate × band`.
5. QBI (US only): `qbiDeduction = j.qbiRate ? j.qbiRate × max(0, netSE − socialTax / 2) : 0`.
6. `taxableIncome = max(0, netSE − allowance − qbiDeduction)`.
7. Income tax:
   - If `i.overrideRate` is a finite number > 0: `overrideTax = (clamp(overrideRate, 0, 100) / 100) × taxableIncome`, `incomeTax = overrideTax`, `marginalRate = clamp(overrideRate, 0, 100) / 100`.
   - Else: `incomeTax = Σ over brackets of rate × max(0, min(taxableIncome, nextMin) − min)`, where brackets are sorted ascending and `nextMin` is the next bracket's `min` or `Infinity` for the top bracket. `marginalRate =` the rate of the highest bracket whose `min ≤ taxableIncome` (0 if taxableIncome ≤ 0). `overrideTax = 0`.
8. `totalTax = socialTax + incomeTax`. `net = max(0, netSE − totalTax)`. `effectiveRate = gross > 0 ? totalTax / gross : 0`.
9. `breakdown` rows (in display order): Gross, Expenses, Net SE income, [Social contribution name → amount for each entry], [QBI deduction (US only, if > 0)], Taxable income, Income tax, Total tax, Net. Each `{ label, amount }`.

### Hand-traced test expectations (all at gross 60,000 / expenses 5,000 local currency)

**US, single:**

- netSE = 55,000
- SE base = 55,000 × 0.9235 = 50,792.50
- Social Security = 0.124 × min(50,792.50, 184,500) = 6,298.27
- Medicare = 0.029 × 50,792.50 = 1,472.98
- socialTax = 7,771.25
- qbiDeduction = 0.20 × (55,000 − 3,885.63) = 0.20 × 51,114.37 = 10,222.87
- allowance (single standardDeduction) = 16,100
- taxableIncome = 55,000 − 16,100 − 10,222.87 = 28,677.13
- incomeTax = 0.10 × 12,400 + 0.12 × (28,677.13 − 12,400) = 1,240 + 1,953.26 = 3,193.26
- totalTax = 7,771.25 + 3,193.26 = 10,964.51
- net = 55,000 − 10,964.51 = 44,035.49
- effectiveRate ≈ 0.1827 (18.27%)
- marginalRate = 0.12 (12% bracket; taxableIncome 28,677 < 50,400)

**UK:**

- netSE = 55,000
- Class 4 mid = 0.06 × (min(55,000, 50,270) − 12,570) = 0.06 × 37,700 = 2,262
- Class 4 top = 0.02 × (55,000 − 50,270) = 0.02 × 4,730 = 94.60
- socialTax = 2,356.60
- qbiDeduction = 0 (UK)
- personalAllowance = 12,570 (no £100k taper; netSE < 100,000)
- taxableIncome = 55,000 − 12,570 = 42,430
- incomeTax = 0.20 × 37,700 + 0.40 × (42,430 − 37,700) = 7,540 + 1,892 = 9,432
- totalTax = 2,356.60 + 9,432 = 11,788.60
- net = 55,000 − 11,788.60 = 43,211.40
- effectiveRate ≈ 0.1965 (19.65%)
- marginalRate = 0.40 (40% band; taxableIncome 42,430 > 37,700)

**CA:**

- netSE = 55,000
- CPP = 0.119 × min(55,000, 74,600) = 0.119 × 55,000 = 6,545
- socialTax = 6,545
- qbiDeduction = 0 (CA)
- personalAllowance (BPA) = 16,452
- taxableIncome = 55,000 − 16,452 = 38,548
- incomeTax = 0.14 × 38,548 = 5,396.72 (all in first bracket; 38,548 < 58,523)
- totalTax = 6,545 + 5,396.72 = 11,941.72
- net = 55,000 − 11,941.72 = 43,058.28
- effectiveRate ≈ 0.1990 (19.90%)
- marginalRate = 0.14
- **Simplification note:** CA BPA is modeled as a _deduction_ here; in real Canadian tax it is a non-refundable _credit_ (≈ 15% × BPA = $2,467.80 credit, which saves more tax than the 14% × $16,452 = $2,303.28 deduction here). This estimator therefore slightly *overstates* CA tax (understates the BPA benefit) by ~$165 in this case. Documented as a non-goal (§2).

**AU:**

- netSE = 55,000
- Medicare = 0.02 × 55,000 = 1,100
- socialTax = 1,100
- qbiDeduction = 0 (AU)
- allowance = 0 (the 0% first bracket is the threshold, not a deduction)
- taxableIncome = 55,000
- incomeTax = 0 × 18,200 + 0.16 × (45,000 − 18,200) + 0.30 × (55,000 − 45,000) = 0 + 4,288 + 3,000 = 7,288
- totalTax = 1,100 + 7,288 = 8,388
- net = 55,000 − 8,388 = 46,612
- effectiveRate ≈ 0.1398 (13.98%)
- marginalRate = 0.30
- **Simplification note:** LITO (~$325 at this income) is not modeled, so AU tax is slightly overstated. Non-goal (§2).

### Tests (~15 `it` blocks, appended to `tests/calculators.test.ts`)

- **US single $60k/$5k** — assert each line above to 2 decimals (gross, expenses, netSE, socialTax 7,771.25, qbiDeduction 10,222.87, taxableIncome 28,677.13, incomeTax 3,193.26, totalTax 10,964.51, net 44,035.49, effectiveRate ≈ 0.1827, marginalRate 0.12).
- **UK £60k/£5k** — socialTax 2,356.60, incomeTax 9,432, totalTax 11,788.60, net 43,211.40, marginalRate 0.40.
- **CA C$60k/C$5k** — socialTax 6,545, incomeTax 5,396.72, totalTax 11,941.72, net 43,058.28, marginalRate 0.14.
- **AU A$60k/A$5k** — socialTax 1,100, incomeTax 7,288, totalTax 8,388, net 46,612, marginalRate 0.30.
- **US filing-status variation** — same $60k/$5k as MFJ: standardDeduction 32,200, socialTax same 7,771.25 (SE tax is filing-status-independent), qbiDeduction same 10,222.87, taxableIncome = 55,000 − 32,200 − 10,222.87 = 12,577.13, incomeTax = 0.10 × 12,577.13 = 1,257.71 (MFJ 10% bracket runs to 24,800, so all taxable income is in the first bracket), totalTax = 7,771.25 + 1,257.71 = 9,028.96, net = 45,971.04, marginalRate 0.10. Assert net (45,971.04) differs from single (44,035.49) and is higher (married benefit).
- **Override rate** — US single $60k/$5k, overrideRate 15: overrideTax = 0.15 × 28,677.13 = 4,301.57, incomeTax = 4,301.57, totalTax = 7,771.25 + 4,301.57 = 12,072.82, net = 42,927.18, marginalRate 0.15.
- **Guards** — NaN/negative/Infinity on gross and expenses → 0 (netSE 0, all taxes 0, net 0); invalid jurisdiction → US (assert currency "USD"); invalid filingStatus (US) → single; overrideRate NaN/negative → ignored (uses brackets); overrideRate > 100 → clamped to 100; net never negative (high expenses > gross → netSE 0, net 0).
- **Currency echo** — US→"USD", UK→"GBP", CA→"CAD", AU→"AUD".
- **Breakdown** — first row label "Gross", includes "Net SE income" and "Net" rows; US breakdown includes a "QBI deduction" row when qbi > 0; UK/CA/AU breakdown has no QBI row.

Suite total: 89 → ~104 tests.

## 6. Island (vanilla-JS, existing pattern)

### `src/components/calculators/NetIncomeCalculator.astro`

- **Jurisdiction `<select>`** bound to `JURISDICTION_PRESETS` (US default).
- **US filing-status `<select>`** bound to `FILING_STATUS_PRESETS` (Single default). Shown only when jurisdiction = US (toggled via the same `data-` driven show/hide used by existing islands; default hidden for UK/CA/AU). When hidden, its value is ignored by the calculator.
- **Gross** `RangeSlider` (0–500,000, step 1,000, currency-prefix from resolved jurisdiction currency, default 60,000).
- **Expenses** `RangeSlider` (0–100,000, step 500, currency-prefix, default 5,000).
- **Override rate** optional `<input type="number" min="0" max="100" step="0.1">` with the resolved `overrideLabel`; blank → brackets used.
- **Read-only disclaimer line**: "Estimates only — not tax advice. Simplified model; see notes." (static text, not from config — matches the "estimates only, not tax advice" non-goal).
- **Result**: `{net}` (formatted with `formatCurrencyPrecise`-equivalent 2-decimal in the jurisdiction currency); **subresult**: `≈ {effectiveRate}% total tax · {marginalRate}% marginal bracket`.
- **Breakdown grid**: rows from `result.breakdown` — Gross / Expenses / Net SE income / [per-social-contribution rows] / [QBI deduction if US] / Taxable income / Income tax / Total tax / Net. Uses `formatCurrency(usd, currency)` for each amount (2-decimal; the island imports the existing `formatCurrency` helper).
- Inline `<script>` reads sliders via `data-range-slider` dataset (existing pattern), `?? 0` fallback on every read, `render()` on every `input` + jurisdiction `change` + filing-status `change` + override `input`. On jurisdiction `change`, re-resolve the currency prefix on the gross/expenses sliders and toggle the filing-status `<select>` visibility.
- **No goal calc** in C1 (unlike B1/B2 calculators) — a "gross needed for target net" inverse would require bracket inversion and is out of scope for the estimator. Single forward calculation only.

`★ Insight ─────────────────────────────────────`
The dual frontmatter+inline-script import convention this repo uses (`import { estimateNetIncome } from "../../lib/calculators/netIncome"` in frontmatter for SSR types/defaults, then re-imported inside `<script>` for the client bundle) is what keeps these islands vanilla-JS while still type-safe. The pure layer never imports Astro; the island is the only place DOM lives.
`─────────────────────────────────────────────────`

## 7. Page / SEO (CLAUDE.md Rule 7 — structural)

`net-income-tax-calculator.astro` via `ToolLayout`:

- Exact H1: "Net Income Tax Calculator" (one page = one keyword).
- One H2 per section; canonical bare-URL (no query params).
- JSON-LD: WebApplication + FAQPage + Breadcrumb (FAQ content from `netIncomeFaqs` in `faqs.ts`).
- `RelatedReads`: Net Income Tax Calculator ↔ Twitch Revenue Calculator + YouTube Money Calculator + Sponsorship Calculator (the "what's my gross" tools that feed this "what do I keep" tool).
- Append to `TOOLS[]` in `src/lib/site.ts`: `{ slug: "net-income-tax-calculator", name: "Net Income Tax Calculator", short: "Net Income", desc: "Estimate creator take-home pay after income tax and self-employment tax (US/UK/CA/AU)." }`.
- Affiliate config untouched; disclosure page auto-renders from `affiliateLinks.ts` as-is.

## 8. Error handling

- **Pure layer:** `g()` guard on gross/expenses (NaN/negative/Infinity→0); invalid jurisdiction → US; invalid/missing filingStatus (US) → single; `overrideRate` NaN/negative → ignored (brackets used); `overrideRate > 100` clamped to 100; `netSE`, `taxableIncome`, `net` all guarded ≥ 0; `effectiveRate` 0 when gross ≤ 0.
- **Island layer:** `Number(...?.dataset.value ?? 0)` reads; override input parsed with `Number()` and only passed when `Number.isFinite(v) && v > 0`. Matches existing `KickRevenueCalculator.astro` / `SpotifyCalculator.astro` patterns; no unguarded `.value`.
- **Fully static, client-side, no async/fetch/external calls** (Rule 1).

## 9. Testing & verification

- `describe("net income / tax calculator")` appended to `tests/calculators.test.ts`: ~15 pure tests (suite 89 → ~104).
- Build: 46 → 47 pages, green; `npm test` all pass; `npm run lint` clean.
- No changes to `programmatic.test.ts` (no prog-SEO in C1).
- Verify no regression: existing 89 tests unchanged and green; all 10 existing islands/calc modules/configs untouched (the diff touches only 4 new files + 3 append-only shared files).

## 10. SDD task plan

| Task     | Scope                                                                                                             | Model                                                                                                     | Depends on |
| -------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| **C1-1** | `taxConfig.ts` + `netIncome.ts` + append `describe("net income / tax calculator")` to `tests/calculators.test.ts` | sonnet (config is intricate, multi-country hand-tracing + test design — judgment, not pure transcription) | —          |
| **C1-2** | `NetIncomeCalculator.astro` + `net-income-tax-calculator.astro` + `TOOLS[]` entry + `netIncomeFaqs`               | sonnet (multi-file integration, pattern parity with Spotify/Kick islands)                                 | C1-1       |

Per task: implementer subagent with curated brief → task reviewer (spec + quality) → fix loop for Critical/Important → commit with `Co-Authored-By: Claude <noreply@anthropic.com>` trailer. Continuous execution (no check-ins between tasks); stop only on BLOCKED or genuine ambiguity. Artifacts: `.superpowers/sdd/task-N-{brief,report}-c1.md`; ledger: `.superpowers/sdd/progress-c1.md`. No PR after C1. Final whole-branch review (opus) at C1 end covers `ff91763..HEAD` (C1 commits only — A/B1/B2 already passed their own final reviews).

**Model-selection rationale:** C1-1 is config-heavy with four-country hand-tracing and test design — that is judgment, not transcription, so sonnet is the floor (a pure-transcription haiku task risks subtle bracket/allowance errors across four tax systems). C1-2 is standard multi-file integration parity. The final whole-branch review is broad judgment over the cumulative branch → opus.

## 11. Sources

- IRS — _IRS releases tax inflation adjustments for tax year 2026, including amendments from the One Big Beautiful Bill_: https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill
- Tax Foundation — _2026 Tax Brackets and Federal Income Tax Rates_: https://taxfoundation.org/data/all/federal/2026-tax-brackets/
- KPMG — _GMS Flash Alert 2025-226 — United States: Inflation Adjustments for Tax Year 2026_: https://assets.kpmg.com/content/dam/kpmgsites/xx/pdf/2025/11/fa25-226.pdf
- Social Security Administration — _2026 Social Security wage base ($184,500)_: via https://www.ssa.gov/benefits/retirement/planner/maxtax.html (2026 announcement)
- GOV.UK — _Income Tax Personal Allowance and the basic rate limit, and certain NIC thresholds from 6 April 2026 to 5 April 2028_: https://www.gov.uk/government/publications/the-personal-allowance-and-basic-rate-limit-for-income-tax-and-certain-national-insurance-contributions-nics-thresholds-from-6-april-2026-to-5-apr
- Deloitte UK — _Tax rates 2026/27_: https://taxscape.deloitte.com/taxtables/deloitte-uk-tax-rates-2026-27.pdf
- Canada.ca (CRA) — _Tax rates and income brackets — Personal income tax_: https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html
- Canada.ca (ESDC) — _Maximum Benefit Amounts and Related Figures — Canada Pension Plan (2026)_: https://www.canada.ca/en/employment-social-development/programs/pensions/pension/statistics/2026-quarterly-january-march.html
- KPMG Canada — _Federal and Provincial/Territorial Income Tax Rates and Brackets for 2026_: https://assets.kpmg.com/content/dam/kpmg/ca/pdf/2026/01/ca-federal-and-provincial-territorial-income-tax-rates-and-brackets-for-2026.pdf
- Australian Taxation Office — _Tax rates – Australian resident_: https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents/
- Treasury (Australia) — _Budget 2025–26 Fact Sheet — new tax cuts_: https://archive.budget.gov.au/2025-26/factsheets/download/factsheet-new-tax-cuts.pdf
