import { PACKAGE_DURATIONS } from '@/lib/package-options';

/** Flat daily profit: always 0.5%–1.2% per day, in clean 0.05% steps. */
export const DAILY_MIN = 0.5;
export const DAILY_MAX = 1.2;
export const DAILY_STEP = 0.05;

/** Clamp and round a daily % to the flat grid (no long decimals). */
export function cleanDaily(pct: number): number {
  const v = Math.round(Number(pct) / DAILY_STEP) * DAILY_STEP;
  return Math.round(Math.max(DAILY_MIN, Math.min(DAILY_MAX, Number.isFinite(v) ? v : DAILY_MIN)) * 100) / 100;
}
/** Stored value is annual (daily × 365). */
export const dailyToApy = (daily: number) => Math.round(cleanDaily(daily) * 365 * 10000) / 10000;
export const apyToDaily = (apy: number) => cleanDaily(Number(apy) / 365);

/** Duration ladder preset: 30D 0.5% · 60D 0.6% · 90D 0.8% · 180D 1.0% · 360D 1.2%. */
export const LADDER: Record<string, number> = { '30': 0.5, '60': 0.6, '90': 0.8, '180': 1.0, '360': 1.2 };

export function dailyMapToApys(daily: Record<string, number>): Record<string, number> {
  return Object.fromEntries(PACKAGE_DURATIONS.map(d => [String(d), dailyToApy(daily[String(d)] ?? DAILY_MIN)]));
}
export function apysToDailyMap(apys: Record<string, number>): Record<string, number> {
  return Object.fromEntries(PACKAGE_DURATIONS.map(d => [String(d), apyToDaily(apys[String(d)] ?? 0)]));
}
export const ladderApys = () => dailyMapToApys(LADDER);
export const flatApys = (daily: number) => dailyMapToApys(Object.fromEntries(PACKAGE_DURATIONS.map(d => [String(d), daily])));
/** Shift every duration by a small step, staying inside 0.5%–1.2%. */
export function shiftApys(apys: Record<string, number>, delta: number): Record<string, number> {
  const daily = apysToDailyMap(apys);
  return dailyMapToApys(Object.fromEntries(Object.entries(daily).map(([k, v]) => [k, v + delta])));
}
