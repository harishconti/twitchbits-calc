import { CURRENCIES } from '../data/currencies';

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) n = 0;
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatCurrency(usd: number, currency: string): string {
  if (!Number.isFinite(usd)) usd = 0;
  const c = CURRENCIES[currency] ?? CURRENCIES.USD;
  const value = usd.toLocaleString('en-US', { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals });
  return `${c.symbol}${value}`;
}

export function parseAmount(input: string): number {
  const cleaned = input.replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}