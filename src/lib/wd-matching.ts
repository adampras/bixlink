export type WdMatchingConfig = { enabled: boolean; feePct: number; matchPct: number; minStakeUsd: number };
export const DEFAULT_WD_MATCHING: WdMatchingConfig = { enabled: false, feePct: 5, matchPct: 3, minStakeUsd: 100 };
export function normalizeWdMatching(v: unknown): WdMatchingConfig {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const n = (k: keyof WdMatchingConfig) => Number.isFinite(Number(o[k])) ? Number(o[k]) : DEFAULT_WD_MATCHING[k] as number;
  return { enabled: o['enabled'] === true, feePct: n('feePct'), matchPct: n('matchPct'), minStakeUsd: n('minStakeUsd') };
}
export function wdMatchingError(c: WdMatchingConfig): string | null {
  if (c.feePct < 0.5 || c.feePct > 20) return 'Fee WD harus 0,5%–20%';
  if (c.matchPct < 0 || c.matchPct > c.feePct) return 'Matching harus 0% sampai sebesar fee WD';
  if (c.minStakeUsd < 0 || c.minStakeUsd > 100000) return 'Minimum staking aktif tidak valid';
  return null;
}
/** Split of one withdrawal: fee charged, upline royalty, platform share. */
export function wdSplit(amount: number, c: WdMatchingConfig) {
  const fee = Math.round(amount * c.feePct) / 100;
  const match = Math.round(amount * c.matchPct) / 100;
  return { fee, match, platform: Math.round((fee - match) * 100) / 100, net: Math.round((amount - fee) * 100) / 100 };
}
