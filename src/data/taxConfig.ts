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
