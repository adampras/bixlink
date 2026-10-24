import { describe, expect, it } from 'vitest';
import { presaleReleased, sponsorBix, withPresaleStages, editPresaleStage, activatePresaleStage } from './presale';
import { presaleSettingsSchema } from './presale-settings';

describe('owner presale stages', () => {
  const cfg = { enabled: false, sponsorPct: 10, poolCap: 3150000, packages: [{ usd: 500, bix: 1250, releaseDays: 180 }] };
  it('preserves the current price when initializing Stage 1', () => {
    expect(withPresaleStages(cfg).stages[0]?.price).toBe(0.4);
  });
  it('editing Stage 1 updates its price and package atomically', () => {
    const edited = editPresaleStage(cfg, 0, 0.5);
    expect(edited.stages?.[0]?.price).toBe(0.5);
    expect(edited.packages[0]?.bix).toBe(1000);
    expect(edited.enabled).toBe(false);
  });
  it('activates the latest edited Stage 2 price', () => {
    const next = activatePresaleStage(editPresaleStage(cfg, 1, 0.8), 1);
    expect(next.stages?.[1]?.price).toBe(0.8);
    expect(next.packages[0]?.bix).toBe(625);
  });
  it('persists all stages and owner-controlled closed/open state', () => {
    const edited = editPresaleStage(cfg, 0, 0.5);
    expect(presaleSettingsSchema.parse(edited).enabled).toBe(false);
    expect(presaleSettingsSchema.parse({ ...edited, enabled: true }).enabled).toBe(true);
    expect(presaleSettingsSchema.parse(edited).stages?.map(s => s.price)).toEqual([0.5, 0.65, 0.8]);
  });
  it('rejects a zero stage price', () => {
    expect(presaleSettingsSchema.safeParse(editPresaleStage(cfg, 0, 0)).success).toBe(false);
  });
});

describe('presale', () => {
  it('sponsor receives 10% of package BIX', () => { expect(sponsorBix(17500, 10)).toBe(1750); });
  it('releases half after half the duration', () => {
    const start = Date.UTC(2026, 0, 1);
    expect(presaleReleased(1000, 10, start, start + 5 * 86_400_000)).toBe(500);
  });
  it('never releases more than the package', () => {
    const start = Date.UTC(2026, 0, 1);
    expect(presaleReleased(1000, 10, start, start + 99 * 86_400_000)).toBe(1000);
  });
});

import { bixForUsd } from './presale';
describe('presale price', () => {
  it('$500 at $0.50 per BIX gives 1000 BIX', () => { expect(bixForUsd(500, 0.5)).toBe(1000); });
  it('$10000 at $0.50 per BIX gives 20000 BIX', () => { expect(bixForUsd(10000, 0.5)).toBe(20000); });
});

import { maxCapPct } from './max-cap';
describe('tiered max cap', () => {
  it('packages below $1000 cap at 300%', () => { expect(maxCapPct(500)).toBe(300); });
  it('packages $1000–$20000 cap at 350%', () => { expect(maxCapPct(1000)).toBe(350); expect(maxCapPct(20000)).toBe(350); });
  it('packages above $20000 cap at 400%', () => { expect(maxCapPct(20001)).toBe(400); expect(maxCapPct(100000)).toBe(400); });
});
