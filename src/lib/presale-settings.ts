import { z } from 'zod';

const pkg = z.object({ usd: z.number().positive(), bix: z.number().positive(), releaseDays: z.number().int().min(1) });
export const presaleSettingsSchema = z.object({
  enabled: z.boolean(), sponsorPct: z.number().min(0).max(10), poolCap: z.number().min(0).max(3_150_000),
  packages: z.array(pkg).min(1).max(14),
  strategies: z.object({ enabled: z.boolean(), hybridBixPct: z.number().min(10).max(90), hybridDailyPct: z.number().min(0).max(1), dividendDailyPct: z.number().min(0).max(1), founderBonusApy: z.number().min(0).max(100) }).optional(),
  stages: z.array(z.object({ price: z.number().positive() })).length(3).optional(),
  activeStage: z.number().int().min(0).max(2).optional(),
  sovereign: pkg.extend({ enabled: z.boolean(), slots: z.number().int().min(1).max(21) }).optional(),
});