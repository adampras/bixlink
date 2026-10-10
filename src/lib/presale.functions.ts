import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { PresaleConfig } from './presale';

export type PresaleOrder = { id: string; package_usd: number; bix_amount: number; release_days: number; status: string; created_at: string; strategy?: string; dividend_daily_usd?: number; bonus_bix?: number; serial?: number };
export type PresaleStatus = { config: PresaleConfig; poolUsed: number; sovereignClaimed?: number; serverNow: string; balanceUsd: number; dividendEarned?: number; orders: PresaleOrder[]; sponsorRewards: { id: string; bix: number; release_days: number; status: string; created_at: string }[] };

export const getPresaleStatus = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc('bix_presale_status');
    if (error) throw new Error(error.message);
    return data as unknown as PresaleStatus;
  });

export const buyPresale = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ usd: z.number().positive(), strategy: z.enum(['standard', 'hybrid', 'dividend', 'founder']).default('standard') }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: r, error } = await context.supabase.rpc('bix_presale_buy_strategy', { p_usd: data.usd, p_strategy: data.strategy });
    if (error) throw new Error(error.message);
    return r as unknown as { id: string; bix: number; serial: number; dailyUsd: number };
  });

const pkg = z.object({ usd: z.number().positive(), bix: z.number().positive(), releaseDays: z.number().int().min(1) });
const strategies = z.object({ enabled: z.boolean(), hybridBixPct: z.number().min(10).max(90), hybridDailyPct: z.number().min(0).max(1), dividendDailyPct: z.number().min(0).max(1), founderBonusApy: z.number().min(0).max(100) });
export const savePresale = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ enabled: z.boolean(), sponsorPct: z.number().min(0).max(10), poolCap: z.number().min(0).max(10_500_000), packages: z.array(pkg).min(1).max(8), strategies: strategies.optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: r, error } = await context.supabase.rpc('bix_presale_save', { p_config: data });
    if (error) throw new Error(error.message);
    return r as unknown as PresaleConfig;
  });
