export type PresalePackage = { usd: number; bix: number; releaseDays: number };
export type PresaleConfig = { enabled: boolean; sponsorPct: number; poolCap: number; packages: PresalePackage[] };

/** Linear mining-style release of locked presale BIX. Display-only: not spendable balance. */
export function presaleReleased(bix: number, releaseDays: number, startedAt: string | number, now: number) {
  const elapsed = Math.max(0, now - new Date(startedAt).getTime());
  const total = Math.max(1, releaseDays) * 86_400_000;
  return Number(bix) * Math.min(1, elapsed / total);
}

export const sponsorBix = (bix: number, pct: number) => Math.round(bix * pct / 100 * 1e6) / 1e6;
