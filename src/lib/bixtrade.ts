import { z } from 'zod';

export const BIXTRADE_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'] as const;
export const BIXTRADE_VENUES = ['Binance', 'Bybit', 'OKX', 'KuCoin', 'Bitget', 'Coinbase'] as const;

export const bixtradeSettingsSchema = z.object({
  enabled: z.boolean(),
  minDailyPct: z.number().min(0).max(5),
  maxDailyPct: z.number().min(0).max(5),
  winRate: z.number().min(50).max(99),
  minAlloc: z.number().min(10).max(1_000_000),
  maxAlloc: z.number().min(10).max(10_000_000),
  notice: z.string().trim().max(200).optional(),
}).strict()
  .refine(v => v.maxDailyPct >= v.minDailyPct, 'Max daily % must be ≥ min daily %')
  .refine(v => v.maxAlloc >= v.minAlloc, 'Max allocation must be ≥ min allocation');

export type BixtradeSettings = z.infer<typeof bixtradeSettingsSchema>;

export const BIXTRADE_DEFAULTS: BixtradeSettings = { enabled: false, minDailyPct: 0.3, maxDailyPct: 0.8, winRate: 92, minAlloc: 100, maxAlloc: 50_000, notice: '' };

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
