import { describe, expect, it } from 'vitest';
import { boosterMaximum, nativeBixApy } from '@/lib/booster-apy';
describe('Native BIX owner maximum', () => {
  it('reaches 45 only at the highest volume and duration', () => {
    expect(nativeBixApy(10000,540)).toBe(45);
    expect(nativeBixApy(10,30)).toBe(8);
    expect(nativeBixApy(100,90)).toBe(16.71);
  });
  it('keeps original tiers at a maximum of 25', () => {
    expect(nativeBixApy(100,90,25)).toBe(12);
    expect(nativeBixApy(10000,540,25)).toBe(25);
  });
  it('clamps owner values to supported limits', () => {
    expect(boosterMaximum(100)).toBe(45);
    expect(boosterMaximum(0)).toBe(8);
  });
});