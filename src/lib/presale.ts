import type { StrategySettings } from './presale-strategy';

export type PresalePackage = { usd: number; bix: number; releaseDays: number };
export type PresaleStage = { price: number; startsAt?: string | null; endsAt?: string | null };
export type PresaleConfig = { enabled: boolean; sponsorPct: number; poolCap: number; packages: PresalePackage[]; strategies?: StrategySettings; sovereign?: SovereignConfig; stages?: PresaleStage[]; activeStage?: number };
export type SovereignConfig = { enabled: boolean; usd: number; bix: number; releaseDays: number; slots: number };

/** Schedule state of a stage. 'open' = no schedule set (manual control only). */
export function stagePhase(stage: PresaleStage | undefined, now: number): 'open' | 'upcoming' | 'live' | 'ended' {
  if (!stage || (!stage.startsAt && !stage.endsAt)) return 'open';
  if (stage.startsAt && now < Date.parse(stage.startsAt)) return 'upcoming';
  if (stage.endsAt && now >= Date.parse(stage.endsAt)) return 'ended';
  return 'live';
}

export function withPresaleStages(config: PresaleConfig): PresaleConfig & { stages: PresaleStage[]; activeStage: number } {
  const activeStage = config.activeStage ?? 0;
  const stages = [0.5, 0.65, 0.8].map((price, i) => ({ ...config.stages?.[i], price: config.stages?.[i]?.price ?? (i === activeStage ? presalePrice(config.packages) : price) }));
  return { ...config, activeStage, stages };
}

export function editPresaleStage(config: PresaleConfig, index: number, price: number): PresaleConfig {
  const next = withPresaleStages(config);
  return { ...next, stages: next.stages?.map((stage, i) => i === index ? { ...stage, price } : stage), packages: next.activeStage === index && price > 0 ? next.packages.map(p => ({ ...p, bix: bixForUsd(p.usd, price) })) : next.packages };
}

export function setPresaleStageWindow(config: PresaleConfig, index: number, key: 'startsAt' | 'endsAt', iso: string | null): PresaleConfig {
  const next = withPresaleStages(config);
  return { ...next, stages: next.stages.map((stage, i) => i === index ? { ...stage, [key]: iso } : stage) };
}

export function activatePresaleStage(config: PresaleConfig, index: number): PresaleConfig {
  const next = withPresaleStages(config);
  const price = next.stages?.[index]?.price;
  if (!price || price <= 0) return config;
  return { ...next, activeStage: index, packages: next.packages.map(p => ({ ...p, bix: bixForUsd(p.usd, price) })) };
}

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
