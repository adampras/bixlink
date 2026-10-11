export type PresaleStrategy = 'hybrid' | 'dividend' | 'founder';
export type StrategySettings = { enabled: boolean; hybridBixPct: number; hybridDailyPct: number; dividendDailyPct: number; founderBonusApy: number };
export const DEFAULT_STRATEGIES: StrategySettings = { enabled: false, hybridBixPct: 50, hybridDailyPct: 0.3, dividendDailyPct: 0.2, founderBonusApy: 20 };

export type StrategyQuote = { bix: number; dailyUsd: number; totalUsd: number; bonusBix: number };
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Mirrors SQL bix_presale_buy_strategy. `fullBix` is the package BIX at the presale price. */
export function strategyQuote(s: PresaleStrategy, usd: number, fullBix: number, days: number, cfg: StrategySettings = DEFAULT_STRATEGIES): StrategyQuote {
  if (s === 'hybrid') { const d = usd * (100 - cfg.hybridBixPct) / 100 * cfg.hybridDailyPct / 100; return { bix: r2(fullBix * cfg.hybridBixPct / 100), dailyUsd: d, totalUsd: r2(d * days), bonusBix: 0 }; }
  if (s === 'dividend') { const d = usd * cfg.dividendDailyPct / 100; return { bix: fullBix, dailyUsd: d, totalUsd: r2(d * days), bonusBix: 0 }; }
  const b = r2(fullBix * cfg.founderBonusApy / 100 * days / 365);
  return { bix: r2(fullBix + b), dailyUsd: 0, totalUsd: 0, bonusBix: b };
}

/** USDT dividend settled so far: whole elapsed days, capped at release days (mirrors bix_presale_dividend). */
export function dividendSettled(dailyUsd: number, releaseDays: number, startedAt: string | number, now: number) {
  const days = Math.floor(Math.max(0, now - new Date(startedAt).getTime()) / 86_400_000);
  return dailyUsd * Math.min(releaseDays, days);
}

export function genesisTier(usd: number) {
  if (usd >= 100_000) return 'Sovereign Singularity';
  if (usd >= 70_000) return 'Quantum Sovereign';
  if (usd >= 50_000) return 'Cosmic Nexus';
  if (usd >= 30_000) return 'Aether Vanguard';
  if (usd >= 25_000) return 'Crown Imperial';
  if (usd >= 20_000) return 'Diamond Velocity';
  if (usd >= 10_000) return 'Obsidian Apex';
  if (usd >= 7_000) return 'Platinum Reactor';
  if (usd >= 5_000) return 'Gold Fusion';
  if (usd >= 1_000) return 'Silver Turbine';
  return 'Bronze Core';
}
