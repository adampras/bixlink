import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

export const getMyNfts = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from('bix_nft_cards').select('*').eq('user_id', context.userId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const sellNft = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: r, error } = await context.supabase.rpc('bix_nft_sell', { p_card: data.id });
    if (error) throw new Error(error.message);
    return r as { price_usd: number; bix: number };
  });

export const getNftCollection = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const admin = await context.supabase.rpc('is_bix_admin');
  if (!admin.data) throw new Error('Owner access required');
  const { data, error } = await context.supabase.from('bix_nft_cards').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  const ids = [...new Set((data ?? []).map(c => c.user_id))];
  const prof = ids.length ? await context.supabase.from('profiles').select('user_id,username').in('user_id', ids) : { data: [] };
  const names = new Map((prof.data ?? []).map(p => [p.user_id, p.username]));
  return (data ?? []).map(c => ({ ...c, username: names.get(c.user_id) ?? c.user_id.slice(0, 8) }));
});

export const reviewNft = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; approve: boolean }) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc('bix_nft_review', { p_card: data.id, p_approve: data.approve });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
