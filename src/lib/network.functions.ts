import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

export const getBixBonusReviews = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: owner, error: roleError } = await context.supabase.rpc('is_bix_admin');
  if (roleError || !owner) throw new Error('Owner access required');
  const { data, error } = await context.supabase.from('bix_referral_bonuses').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
});
export const reviewBixBonus = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; approve: boolean }) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc('bix_review_referral_bonus', { p_bonus: data.id, p_approve: data.approve });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const stakeNativeBix = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
 .inputValidator((input: { amount: number; days: number }) => z.object({ amount: z.number().finite().min(10), days: z.number().refine(d => [30,90,180,360,540].includes(d)) }).parse(input))
 .handler(async ({ context, data }) => {
  const { data: id, error } = await context.supabase.rpc('bix_stake_bix', { p_amount: data.amount, p_days: data.days });
  if (error) throw new Error(error.message);
  return { id };
 });
export const unstakeNativeBix = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
 .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
 .handler(async ({ context, data }) => {
  const { data: penalty, error } = await context.supabase.rpc('bix_unstake_bix', { p_stake: data.id });
  if (error) throw new Error(error.message);
  return { penalty: Number(penalty) };
 });
