import type { StrategySettings } from './presale-strategy';

export type PresalePackage = { usd: number; bix: number; releaseDays: number };
export type PresaleConfig = { enabled: boolean; sponsorPct: number; poolCap: number; packages: PresalePackage[]; strategies?: StrategySettings; sovereign?: SovereignConfig };
export type SovereignConfig = { enabled: boolean; usd: number; bix: number; releaseDays: number; slots: number };

/** Linear mining-style release of locked presale BIX. Display-only: not spendable balance. */
export function presaleReleased(bix: number, releaseDays: number, startedAt: string | number, now: number) {
  const elapsed = Math.max(0, now - new Date(startedAt).getTime());
  const total = Math.max(1, releaseDays) * 86_400_000;
  return Number(bix) * Math.min(1, elapsed / total);
}

export const sponsorBix = (bix: number, pct: number) => Math.round(bix * pct / 100 * 1e6) / 1e6;

/** BIX a package receives at the owner presale price (USD per BIX). */
export const bixForUsd = (usd: number, price: number) => price > 0 ? Math.round(usd / price * 100) / 100 : 0;

/** Presale price derived from the first package. */
export const presalePrice = (packages: PresalePackage[]) => {
  const p = packages[0];
  return p && p.bix > 0 ? Math.round(p.usd / p.bix * 1e6) / 1e6 : 0.5;
};
