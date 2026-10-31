import { z } from 'zod';

/** BIXGO super-app catalog. Presentation-only fare simulator: no booking, payment or driver dispatch happens. */
export const BIXGO_SERVICES = [
  { key: 'ride', name: 'BIXRide', note: 'Motorbike ride' },
  { key: 'car', name: 'BIXCar', note: 'Car ride' },
  { key: 'food', name: 'BIXFood', note: 'Food delivery' },
  { key: 'send', name: 'BIXSend', note: 'Instant courier' },
  { key: 'mart', name: 'BIXMart', note: 'Daily groceries' },
] as const;
export type BixgoService = typeof BIXGO_SERVICES[number]['key'];

const svc = z.object({ enabled: z.boolean(), baseIdr: z.number().min(0).max(1_000_000), perKmIdr: z.number().min(0).max(1_000_000) }).strict();
export const bixgoSettingsSchema = z.object({
  enabled: z.boolean(),
  notice: z.string().trim().max(240),
  commissionPct: z.number().min(0).max(50),
  bixDiscountPct: z.number().min(0).max(50),
  usdtIdr: z.number().positive().max(1_000_000),
  services: z.object({ ride: svc, car: svc, food: svc, send: svc, mart: svc }).strict(),
}).strict();
export type BixgoSettings = z.infer<typeof bixgoSettingsSchema>;

export const BIXGO_DEFAULTS: BixgoSettings = {
  enabled: false, notice: '', commissionPct: 15, bixDiscountPct: 10, usdtIdr: 16_000,
  services: {
    ride: { enabled: true, baseIdr: 8_000, perKmIdr: 2_500 },
    car: { enabled: true, baseIdr: 15_000, perKmIdr: 4_500 },
    food: { enabled: true, baseIdr: 9_000, perKmIdr: 2_000 },
    send: { enabled: true, baseIdr: 10_000, perKmIdr: 2_500 },
    mart: { enabled: true, baseIdr: 9_000, perKmIdr: 2_000 },
  },
};

export function readBixgo(v: unknown): BixgoSettings {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<BixgoSettings>;
  const merged = { ...BIXGO_DEFAULTS, ...o, services: { ...BIXGO_DEFAULTS.services, ...(o.services ?? {}) } };
  const r = bixgoSettingsSchema.safeParse(merged);
  return r.success ? r.data : BIXGO_DEFAULTS;
}

/** Estimated fare: base + per-km; BIX payment shows discount; commission is the ecosystem share of the fare. */
export function bixgoFare(s: BixgoSettings, service: BixgoService, km: number, payBix = false) {
  const c = s.services[service];
  const d = Math.max(0, km);
  const idr = Math.round(c.baseIdr + c.perKmIdr * d);
  const payIdr = payBix ? Math.round(idr * (1 - s.bixDiscountPct / 100)) : idr;
  return { idr, payIdr, usdt: +(payIdr / s.usdtIdr).toFixed(2), commissionIdr: Math.round(payIdr * s.commissionPct / 100), etaMin: Math.max(3, Math.round(d * (service === 'car' ? 3 : 2.4) + 4)) };
}
