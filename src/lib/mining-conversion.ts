import { z } from 'zod';

export const MINING_ACCOUNT_CAP = 100;
export const MINING_POOL_CAP = 1_000_000;
export const miningConversionSchema = z.object({
  enabled: z.boolean(),
  vbixPerBix: z.number().finite().positive().max(1_000_000_000).nullable(),
}).strict().refine(value => !value.enabled || value.vbixPerBix !== null, 'Tentukan nilai BIXP per BIX sebelum membuka konversi.');

export function conversionQuote(vbix: number, rate: number | null, converted: number, poolUsed: number) {
  if (!rate || !Number.isFinite(rate) || rate <= 0) return 0;
  const amount = Math.max(0, Math.min(vbix / rate, MINING_ACCOUNT_CAP - converted, MINING_POOL_CAP - poolUsed));
  return Math.floor(amount * 1_000_000) / 1_000_000;
}