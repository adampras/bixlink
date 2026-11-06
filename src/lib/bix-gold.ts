import { z } from 'zod';

const pct = z.number().min(0).max(100);
export const bixGoldSchema = z.object({
  enabled: z.boolean(),
  autoPrice: z.boolean(),
  priceUsdPerGram: z.number().positive().max(100_000),
  usdIdr: z.number().positive().max(1_000_000),
  usdMyr: z.number().positive().max(1_000),
  packages: z.array(z.object({ name: z.string().trim().min(1).max(40), grams: z.number().positive().max(10_000), enabled: z.boolean() }).strict()).max(10),
  sponsorPct: pct,
  levels: z.array(pct).max(10),
  yieldPlans: z.array(z.object({ days: z.number().int().min(1).max(3650), monthlyPct: pct, enabled: z.boolean() }).strict()).max(8),
  mintFeeUsd: z.number().min(0).max(100_000),
  insurancePct: pct,
  ranks: z.array(z.object({ name: z.string().trim().min(1).max(40), teamGrams: z.number().min(0).max(10_000_000), reward: z.string().trim().max(80) }).strict()).max(10),
  notes: z.string().trim().max(600),
}).strict();
export type BixGoldSettings = z.infer<typeof bixGoldSchema>;

export const defaultBixGold = (): BixGoldSettings => ({
  enabled: false, autoPrice: true, priceUsdPerGram: 0, usdIdr: 16000, usdMyr: 4.4,
  packages: [['Micro Gold', 0.1], ['Gold 1g', 1], ['Gold Bar 5g', 5], ['Platinum Bar 10g', 10], ['Sovereign Vault 50g', 50]].map(([name, grams]) => ({ name: String(name), grams: Number(grams), enabled: true })),
  sponsorPct: 0, levels: Array(10).fill(0),
  yieldPlans: [30, 90, 180, 360].map(days => ({ days, monthlyPct: 0, enabled: false })),
  mintFeeUsd: 0, insurancePct: 0,
  ranks: [['Gold Starter', 100], ['Gold Leader', 500], ['Gold Director', 1000], ['Gold Ambassador', 5000]].map(([name, teamGrams]) => ({ name: String(name), teamGrams: Number(teamGrams), reward: '' })),
  notes: '',
});

export function readBixGold(v: unknown): BixGoldSettings {
  const base = defaultBixGold();
  const r = bixGoldSchema.partial().safeParse(v);
  if (!r.success) return base;
  const clean = Object.fromEntries(Object.entries(r.data).filter(([, v]) => v !== undefined));
  return { ...base, ...clean } as BixGoldSettings;
}

/** Package price in USD = grams × reference price per gram. */
export const goldPackageUsd = (grams: number, s: Pick<BixGoldSettings, 'priceUsdPerGram'>) => Math.round(grams * s.priceUsdPerGram * 100) / 100;
