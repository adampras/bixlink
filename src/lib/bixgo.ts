import { REGION_CITIES } from './bixgo-regions';
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

/** City franchise: split of the platform commission (must total 100%). Display/accounting reference only. */
export const franchiseSchema = z.object({
  id: z.string().trim().min(1).max(40),
  city: z.string().trim().min(1).max(60),
  partner: z.string().trim().max(80),
  enabled: z.boolean(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusKm: z.number().min(1).max(200),
  franchisePct: z.number().min(0).max(100),
  platformPct: z.number().min(0).max(100),
  poolPct: z.number().min(0).max(100),
}).strict().refine(f => Math.round((f.franchisePct + f.platformPct + f.poolPct) * 100) === 10_000, 'Franchise + central + pool split must equal 100%');
export type BixgoFranchise = z.infer<typeof franchiseSchema>;

export const bixgoSettingsSchema = z.object({
  enabled: z.boolean(),
  notice: z.string().trim().max(240),
  commissionPct: z.number().min(0).max(50),
  bixDiscountPct: z.number().min(0).max(50),
  usdtIdr: z.number().positive().max(1_000_000),
  services: z.object({ ride: svc, car: svc, food: svc, send: svc, mart: svc }).strict(),
  franchises: z.array(franchiseSchema).max(400).optional(),
  ppob: z.object({ enabled: z.boolean(), live: z.boolean(), marginIdr: z.number().min(0).max(100_000) }).strict().optional(),
  /** Per-city fare multiplier and minimum fare (IDR), owner-managed. */
  cityPricing: z.record(z.string().max(40), z.object({ mult: z.number().min(0.1).max(10), minIdr: z.number().min(0).max(10_000_000) }).strict()).optional(),
}).strict();

export const DEFAULT_CITY_PRICING: Record<string, { mult: number; minIdr: number }> = Object.fromEntries(
  REGION_CITIES.map(c => [c.id, { mult: c.mult, minIdr: Math.round(10_000 * c.mult / 1000) * 1000 }]),
);

/** Apply the city multiplier and minimum fare to an IDR amount. */
export function cityFare(s: BixgoSettings, city: string, idr: number) {
  const p = (s.cityPricing ?? DEFAULT_CITY_PRICING)[city];
  return p ? Math.max(p.minIdr, Math.round(idr * p.mult)) : idr;
}
export type BixgoSettings = z.infer<typeof bixgoSettingsSchema>;

export const DEFAULT_FRANCHISES: BixgoFranchise[] = REGION_CITIES.map(c => ({
  id: c.id, city: c.city, partner: '', enabled: true, lat: c.lat, lng: c.lng, radiusKm: 30, franchisePct: 46.67, platformPct: 33.33, poolPct: 20,
}));

export const BIXGO_DEFAULTS: BixgoSettings = {
  enabled: false, notice: '', commissionPct: 15, bixDiscountPct: 10, usdtIdr: 16_000,
  services: {
    ride: { enabled: true, baseIdr: 10_000, perKmIdr: 2_800 },
    car: { enabled: true, baseIdr: 18_000, perKmIdr: 5_500 },
    food: { enabled: true, baseIdr: 9_000, perKmIdr: 2_000 },
    send: { enabled: true, baseIdr: 10_000, perKmIdr: 2_500 },
    mart: { enabled: true, baseIdr: 9_000, perKmIdr: 2_000 },
  },
  franchises: DEFAULT_FRANCHISES,
  ppob: { enabled: false, live: false, marginIdr: 1_000 },
  cityPricing: DEFAULT_CITY_PRICING,
};

export function readBixgo(v: unknown): BixgoSettings {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<BixgoSettings>;
  const merged = { ...BIXGO_DEFAULTS, ...o, services: { ...BIXGO_DEFAULTS.services, ...(o.services ?? {}) }, ppob: { ...BIXGO_DEFAULTS.ppob!, ...(o.ppob ?? {}) } };
  const have = new Set((merged.franchises ?? []).map(f => f.id));
  merged.franchises = [...(merged.franchises ?? []), ...DEFAULT_FRANCHISES.filter(f => !have.has(f.id))];
  merged.cityPricing = { ...DEFAULT_CITY_PRICING, ...(o.cityPricing ?? {}) };
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

/** Great-circle distance in km (haversine). */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, r = (x: number) => x * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nearest enabled franchise covering a point, or null. */
export function franchiseFor(s: BixgoSettings, p: { lat: number; lng: number }) {
  let best: { f: BixgoFranchise; km: number } | null = null;
  for (const f of s.franchises ?? []) {
    if (!f.enabled) continue;
    const km = haversineKm(p, f);
    if (km <= f.radiusKm && (!best || km < best.km)) best = { f, km };
  }
  return best?.f ?? null;
}

/** Split a commission amount among franchise / platform / pool (IDR, rounded; remainder to platform). */
export function splitCommission(f: BixgoFranchise | null, commissionIdr: number) {
  if (!f) return { franchise: 0, platform: commissionIdr, pool: 0 };
  const franchise = Math.round(commissionIdr * f.franchisePct / 100);
  const pool = Math.round(commissionIdr * f.poolPct / 100);
  return { franchise, pool, platform: commissionIdr - franchise - pool };
}
