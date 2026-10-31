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

type CapRow = { kind: string; amount_usd: number | string; settled_at?: string | null };
/** Bot capital = settled deposits − settled withdrawals (gross). Unsettled/legacy rows never count. */
export const botCapital = (rows: CapRow[]) => +rows.filter(r => r.settled_at).reduce((s, r) => s + (r.kind === 'deposit' ? 1 : -1) * Number(r.amount_usd), 0).toFixed(2);

/** Display-only daily performance inside the owner's range, deterministic per calendar day. */
export function dailySeries(s: BixtradeSettings, n = 14, end = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(end); d.setUTCDate(d.getUTCDate() - (n - 1 - i));
    const key = d.toISOString().slice(0, 10);
    let h = 2166136261; for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    const f = ((h >>> 0) % 1000) / 1000;
    return { date: key, pct: +(s.minDailyPct + f * (s.maxDailyPct - s.minDailyPct)).toFixed(3) };
  });
}

export type BixtradeFunding = 'real' | 'virtual';
export const BIXTRADE_TAKER_PCT = 0.1;
export const BIXTRADE_CYCLE_MIN = 5;
export const BIXTRADE_MAX_TRADES = 12;

export type ExecDraft = { pair: string; buy_venue: string; sell_venue: string; buy_price: number; sell_price: number; qty: number; notional_usd: number; gross_usd: number; fee_usd: number; net_usd: number; latency_ms: number; executed_at: string };

/** Builds execution records for an elapsed window; total net stays inside the owner's daily % range. */
export function planExecutions(s: BixtradeSettings, capital: number, prices: Record<string, number>, from: Date, to: Date, rnd: () => number = Math.random): ExecDraft[] {
  const mins = (to.getTime() - from.getTime()) / 60000;
  const count = Math.min(BIXTRADE_MAX_TRADES, Math.floor(mins / BIXTRADE_CYCLE_MIN));
  const pairs: string[] = BIXTRADE_PAIRS.filter(p => (prices[p] ?? 0) > 0);
  if (capital <= 0 || count < 1 || !pairs.length) return [];
  const dailyPct = s.minDailyPct + rnd() * (s.maxDailyPct - s.minDailyPct);
  const windowNet = capital * dailyPct / 100 * Math.min(mins, 1440) / 1440;
  const wins = Array.from({ length: count }, () => rnd() * 100 < s.winRate);
  const nWins = wins.filter(Boolean).length || 1;
  const step = (to.getTime() - from.getTime()) / count;
  return wins.map((win, i) => {
    const pair = pairs[Math.floor(rnd() * pairs.length)] ?? pairs[0]!;
    const v = Math.floor(rnd() * BIXTRADE_VENUES.length);
    const notional = +(capital * (0.15 + rnd() * 0.35)).toFixed(2);
    const fee = notional * BIXTRADE_TAKER_PCT / 100 * 2;
    const net = win ? windowNet / nWins : -fee * (0.05 + rnd() * 0.25);
    const gross = net + fee;
    const buy = prices[pair] ?? 1;
    const qty = notional / buy;
    const sell = buy * (1 + gross / notional);
    return { pair: pair.replace('USDT', '/USDT'), buy_venue: BIXTRADE_VENUES[v] ?? 'Binance', sell_venue: BIXTRADE_VENUES[(v + 1 + Math.floor(rnd() * 4)) % BIXTRADE_VENUES.length] ?? 'Bybit', buy_price: +buy.toFixed(8), sell_price: +sell.toFixed(8), qty: +qty.toFixed(8), notional_usd: notional, gross_usd: +gross.toFixed(4), fee_usd: +fee.toFixed(4), net_usd: +net.toFixed(4), latency_ms: 9 + Math.floor(rnd() * 30), executed_at: new Date(from.getTime() + step * (i + 1)).toISOString() };
  });
}
