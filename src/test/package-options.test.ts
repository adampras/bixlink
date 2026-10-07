import { describe, expect, it } from 'vitest';
import { PACKAGE_DURATIONS, initialDuration, packageApy } from '@/lib/package-options';
import { fallbackPackages } from '@/lib/bixlink';

describe('duration packages', () => {
  it('offers all five requested durations', () => {
    expect(PACKAGE_DURATIONS).toEqual([30, 60, 90, 180, 360]);
  });
  it('uses saved APY for the selected duration, including zero', () => {
    const pkg = fallbackPackages[0];
    if (!pkg) throw new Error('Missing package');
    expect(packageApy({ ...pkg, duration_apys: { '60': 0, '360': 23 } }, 60)).toBe(0);
    expect(packageApy({ ...pkg, duration_apys: { '360': 23 } }, 360)).toBe(23);
  });
  it('does not select a retired 540-day duration', () => {
    const pkg = fallbackPackages[7];
    if (!pkg) throw new Error('Missing package');
    expect(initialDuration(pkg)).toBe(30);
  });
});