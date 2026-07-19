import { describe, it, expect } from 'vitest';
import {
  BITS_AMOUNTS, TIKTOK_AMOUNTS, YOUTUBE_VIEWS, BITS_CURRENCY_REGIONS,
} from './programmatic';

const isPosInt = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n > 0 && Number.isFinite(n);

describe('programmatic generation arrays', () => {
  it('every bits amount is a positive finite integer', () => {
    expect(BITS_AMOUNTS.every(isPosInt)).toBe(true);
  });
  it('every tiktok amount is a positive finite integer', () => {
    expect(TIKTOK_AMOUNTS.every(isPosInt)).toBe(true);
  });
  it('every youtube views value is a positive finite integer', () => {
    expect(YOUTUBE_VIEWS.every(isPosInt)).toBe(true);
  });
  it('currency regions exclude us (canonical standalone page owns /twitch-bits-to-usd)', () => {
    expect(BITS_CURRENCY_REGIONS).not.toContain('us');
    expect(BITS_CURRENCY_REGIONS.length).toBeGreaterThan(0);
  });
  it('includes the old manual bits amounts so slugs are preserved', () => {
    expect(BITS_AMOUNTS).toContain(100);
    expect(BITS_AMOUNTS).toContain(250);
    expect(BITS_AMOUNTS).toContain(500);
    expect(BITS_AMOUNTS).toContain(1000);
    expect(BITS_AMOUNTS).toContain(5000);
    expect(BITS_AMOUNTS).toContain(10000);
    expect(BITS_AMOUNTS).toContain(50000);
  });
});