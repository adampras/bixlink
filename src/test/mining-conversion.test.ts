import { describe, expect, it } from 'vitest';
import { conversionQuote, miningConversionSchema } from '@/lib/mining-conversion';
import { splashDuration } from '@/lib/splash-settings';
describe('Mining conversion rules', () => {
 it('caps lifetime conversion at 100 BIX per account', () => {
  expect(conversionQuote(1000, 1, 99, 0)).toBe(1);
  expect(conversionQuote(1000, 1, 100, 0)).toBe(0);
 });
 it('caps the Marketing & Community pool at 1,000,000 BIX', () => {
  expect(conversionQuote(1000, 1, 0, 999_999)).toBe(1);
  expect(conversionQuote(1000, 1, 0, 1_000_000)).toBe(0);
 });
 it('requires an owner rate before opening', () => {
  expect(miningConversionSchema.safeParse({ enabled: true, vbixPerBix: null }).success).toBe(false);
  expect(conversionQuote(100, null, 0, 0)).toBe(0);
  expect(miningConversionSchema.safeParse({ enabled: false, vbixPerBix: null }).success).toBe(true);
 });
 it('uses configured rate without overspending vBIX', () => {
  expect(conversionQuote(10, 4, 0, 0)).toBe(2.5);
  expect(conversionQuote(1, 3, 0, 0)).toBe(0.333333);
 });
 it('uses owner splash seconds with a half-second fallback', () => {
  expect(splashDuration({ durationSeconds: 3 })).toBe(3000);
  expect(splashDuration(undefined)).toBe(500);
 });
});
