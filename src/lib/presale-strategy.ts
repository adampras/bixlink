export type PresaleStrategy = 'hybrid' | 'dividend' | 'founder';
export const DIVIDEND_DAILY_PCT = 0.2;
export const FOUNDER_BONUS_APY = 20;

export type StrategyQuote = { bix: number; stakingUsd: number; dividendUsd: number; bonusBix: number; devCashPct: number };

/** Display-only preview of what a strategy offers. Never credits balances. */
export function strategyQuote(s: PresaleStrategy, usd: number, price: number, days: number): StrategyQuote {
  const full = price > 0 ? usd / price : 0;
  const r = (n: number) => Math.round(n * 100) / 100;
  if (s === 'hybrid') return { bix: r(full / 2), stakingUsd: r(usd / 2), dividendUsd: 0, bonusBix: 0, devCashPct: 50 };
  if (s === 'dividend') { const d = r(usd * DIVIDEND_DAILY_PCT / 100 * days); return { bix: r(full), stakingUsd: 0, dividendUsd: d, bonusBix: 0, devCashPct: Math.max(0, Math.round((1 - d / usd) * 100)) }; }
  return { bix: r(full), stakingUsd: 0, dividendUsd: 0, bonusBix: r(full * FOUNDER_BONUS_APY / 100 * days / 365), devCashPct: 100 };
}

export function genesisTier(usd: number) {
  if (usd >= 100_000) return 'Sovereign Singularity';
  if (usd >= 10_000) return 'Obsidian Apex';
  if (usd >= 5_000) return 'Gold Fusion';
  if (usd >= 1_000) return 'Silver Turbine';
  return 'Bronze Core';
}
