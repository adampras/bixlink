import { z } from 'zod';

export const BIXTRADE_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'] as const;
export const BIXTRADE_VENUES = ['Binance', 'Bybit', 'OKX', 'KuCoin', 'Bitget', 'Coinbase'] as const;
export const BIXTRADE_STRATEGIES = [
  { key: 'core', name: 'Conservative Core', pairs: 'BTC · ETH', risk: 'Low' },
  { key: 'active', name: 'Active Quant', pairs: 'BTC · ETH · SOL · BNB', risk: 'Medium' },
  { key: 'triangular', name: 'Flash Triangular', pairs: 'Multi-leg routes', risk: 'High' },
] as const;
export type BixtradeStrategy = typeof BIXTRADE_STRATEGIES[number]['key'];

export const bixtradeSettingsSchema = z.object({
  enabled: z.boolean(),
  minDailyPct: z.number().min(0).max(5),
  maxDailyPct: z.number().min(0).max(5),
  winRate: z.number().min(50).max(99),
  minAlloc: z.number().min(10).max(1_000_000),
  maxAlloc: z.number().min(10).max(10_000_000),
  notice: z.string().trim().max(200).optional(),
  depositOpen: z.boolean(),
  withdrawOpen: z.boolean(),
  minWithdraw: z.number().min(1).max(1_000_000),
  withdrawFeePct: z.number().min(0).max(20),
  lockDays: z.number().int().min(0).max(365),
}).strict()
  .refine(v => v.maxDailyPct >= v.minDailyPct, 'Max daily % must be ≥ min daily %')
  .refine(v => v.maxAlloc >= v.minAlloc, 'Max allocation must be ≥ min allocation');

export type BixtradeSettings = z.infer<typeof bixtradeSettingsSchema>;

export const BIXTRADE_DEFAULTS: BixtradeSettings = { enabled: false, minDailyPct: 0.3, maxDailyPct: 0.8, winRate: 92, minAlloc: 100, maxAlloc: 50_000, notice: '', depositOpen: true, withdrawOpen: true, minWithdraw: 20, withdrawFeePct: 2, lockDays: 7 };

export function readBixtrade(v: unknown): BixtradeSettings {
  const r = bixtradeSettingsSchema.safeParse({ ...BIXTRADE_DEFAULTS, ...(v && typeof v === 'object' ? v : {}) });
  return r.success ? r.data : BIXTRADE_DEFAULTS;
}

/** Display-only projection: allocation × daily % × days, clamped to owner limits. */
export function projectBixtrade(s: BixtradeSettings, amount: number, days: number) {
  const a = Math.min(Math.max(amount, s.minAlloc), s.maxAlloc);
  const d = Math.max(1, Math.min(365, Math.round(days)));
  return { amount: a, low: +(a * s.minDailyPct / 100 * d).toFixed(2), high: +(a * s.maxDailyPct / 100 * d).toFixed(2) };
}

/** Validates a member request against owner rules; returns an error string or null. */
export function checkBixtradeRequest(s: BixtradeSettings, kind: 'deposit' | 'withdraw', amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter a valid amount.';
  if (kind === 'deposit') {
    if (!s.depositOpen) return 'Bot deposits are paused by the owner.';
    if (amount < s.minAlloc || amount > s.maxAlloc) return `Deposit must be ${s.minAlloc}–${s.maxAlloc} USDT.`;
  } else {
    if (!s.withdrawOpen) return 'Bot withdrawals are paused by the owner.';
    if (amount < s.minWithdraw) return `Minimum withdrawal is ${s.minWithdraw} USDT.`;
  }
  return null;
}

export const withdrawNet = (s: BixtradeSettings, amount: number) => +(amount * (1 - s.withdrawFeePct / 100)).toFixed(2);
