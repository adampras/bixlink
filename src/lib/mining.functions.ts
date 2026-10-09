import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export type MiningStatus = {
  started: boolean; settledAt: string | null; serverNow: string; enabled: boolean;
  ratePerDay: number; boosted: boolean; miningVbix: number; networkVbix: number;
};

const call = async (supabase: any, fn: 'bix_mining_status' | 'bix_mining_start' | 'bix_mining_settle') => {
  const { data, error } = await supabase.rpc(fn);
  if (error) throw new Error(error.message);
  return data as MiningStatus;
};

export const getMiningStatus = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => call(context.supabase, 'bix_mining_status'));
export const startMining = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => call(context.supabase, 'bix_mining_start'));
export const settleMining = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => call(context.supabase, 'bix_mining_settle'));
