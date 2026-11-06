import { createServerFn } from '@tanstack/react-start';

export type GoldSpot = { usdPerGram: number; usdIdr: number; usdMyr: number; updatedAt: string } | null;
const TROY_OZ_G = 31.1034768;
let cache: { at: number; v: GoldSpot } | null = null;

/** Public spot gold per gram (USD) + USD→IDR/MYR FX. Cached ~6h; returns null on provider failure. */
export const getGoldSpot = createServerFn({ method: 'GET' }).handler(async (): Promise<GoldSpot> => {
  if (cache && Date.now() - cache.at < 6 * 3600_000) return cache.v;
  try {
    const [g, fx] = await Promise.all([
      fetch('https://api.gold-api.com/price/XAU').then(r => r.json() as Promise<{ price?: number; updatedAt?: string }>),
      fetch('https://open.er-api.com/v6/latest/USD').then(r => r.json() as Promise<{ rates?: Record<string, number> }>),
    ]);
    const oz = Number(g.price), idr = Number(fx.rates?.['IDR']), myr = Number(fx.rates?.['MYR']);
    if (!(oz > 0 && idr > 0 && myr > 0)) return cache?.v ?? null;
    const v = { usdPerGram: Math.round((oz / TROY_OZ_G) * 100) / 100, usdIdr: idr, usdMyr: myr, updatedAt: g.updatedAt ?? new Date().toISOString() };
    cache = { at: Date.now(), v };
    return v;
  } catch (e) {
    console.error('gold spot failed', e);
    return cache?.v ?? null;
  }
});
