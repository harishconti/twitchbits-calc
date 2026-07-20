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
    const band = Math.max(
      0,
      Math.min(base, s.cap ?? Infinity) - (s.floor ?? 0),
    );
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
