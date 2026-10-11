import { PACKAGE_DURATIONS } from '@/lib/package-options';

/** Standard daily profit grid: tier i (0–7) and duration j (30D…360D). Range 0.50%–0.97% per day. */
export function standardDailyPct(tierIndex: number, durationIndex: number, tierCount = 8): number {
  const i = Math.max(0, Math.min(tierCount - 1, tierIndex));
  const j = Math.max(0, Math.min(PACKAGE_DURATIONS.length - 1, durationIndex));
  return Math.round((0.5 + i / Math.max(1, tierCount - 1) * 0.35 + j * 0.03) * 100) / 100;
}

/** Stored APY is annual (daily × 365); server caps it at 360. */
export function standardApys(tierIndex: number, tierCount = 8): Record<string, number> {
  return Object.fromEntries(PACKAGE_DURATIONS.map((d, j) => [String(d), Math.min(360, Math.round(standardDailyPct(tierIndex, j, tierCount) * 365 * 10000) / 10000)]));
}

/** Daily fluctuation: standard rate ± up to 0.08%, deterministic per UTC day, clamped to 0.50%–0.98%. */
export function fluctuatedDailyPct(tierIndex: number, durationIndex: number, dayKey: string, tierCount = 8): number {
  let h = 2166136261;
  for (const c of `${dayKey}:${tierIndex}:${durationIndex}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const jitter = ((h >>> 0) % 17 - 8) / 100;
  return Math.round(Math.max(0.5, Math.min(0.98, standardDailyPct(tierIndex, durationIndex, tierCount) + jitter)) * 100) / 100;
}
export function fluctuatedApys(tierIndex: number, dayKey: string, tierCount = 8): Record<string, number> {
  return Object.fromEntries(PACKAGE_DURATIONS.map((d, j) => [String(d), Math.min(360, Math.round(fluctuatedDailyPct(tierIndex, j, dayKey, tierCount) * 365 * 10000) / 10000)]));
}
