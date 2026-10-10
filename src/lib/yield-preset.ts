import { PACKAGE_DURATIONS } from '@/lib/package-options';

/** Standard daily profit grid: tier i (0–7) and duration j (30D…360D). Range 0.50%–0.97% per day. */
export function standardDailyPct(tierIndex: number, durationIndex: number): number {
  const i = Math.max(0, Math.min(7, tierIndex));
  const j = Math.max(0, Math.min(PACKAGE_DURATIONS.length - 1, durationIndex));
  return Math.round((0.5 + i * 0.05 + j * 0.03) * 100) / 100;
}

/** Stored APY is annual (daily × 365); server caps it at 360. */
export function standardApys(tierIndex: number): Record<string, number> {
  return Object.fromEntries(PACKAGE_DURATIONS.map((d, j) => [String(d), Math.min(360, Math.round(standardDailyPct(tierIndex, j) * 365 * 10000) / 10000)]));
}
