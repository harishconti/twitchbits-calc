import { describe, it, expect } from 'vitest';
import { formatNumber, formatCurrency, parseAmount } from '../src/lib/format';

describe('format', () => {
  it('groups thousands with commas', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1234567)).toBe('1,234,567');
  });
  it('formats USD with 2 decimals', () => {
    expect(formatCurrency(10, 'USD')).toBe('$10.00');
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50');
  });
  it('formats GBP and EUR with symbol + code', () => {
    expect(formatCurrency(10, 'GBP')).toBe('£10.00');
    expect(formatCurrency(10, 'EUR')).toBe('€10.00');
  });
  it('parses human amounts incl. commas', () => {
    expect(parseAmount('1,000')).toBe(1000);
    expect(parseAmount('12.5')).toBe(12.5);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('abc')).toBe(0);
  });
});