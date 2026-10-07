import type { Package } from '@/lib/bixlink';

export const PACKAGE_DURATIONS = [30, 60, 90, 180, 360] as const;
export function packageApy(pkg: Package, days: number): number {
  return Number(pkg.duration_apys?.[String(days)] ?? pkg.apy);
}
export function initialDuration(pkg: Package): number {
  return PACKAGE_DURATIONS.includes(pkg.lock_days as typeof PACKAGE_DURATIONS[number]) ? pkg.lock_days : 30;
}