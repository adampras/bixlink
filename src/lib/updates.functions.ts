import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { Database } from '@/integrations/supabase/types';
import { getHomeMarketData } from '@/lib/market.functions';

export const getMarketUpdates = createServerFn({ method: 'GET' }).handler(async () => {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
  const client = createClient<Database>(process.env['SUPABASE_URL']!, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization'); headers.set('apikey', key); return fetch(input, { ...init, headers }); } } });
  const flag = await client.rpc('bix_feature_enabled', { p_feature: 'marketEnabled' });
  if (flag.error) throw new Error('Could not load market availability.');
  if (!flag.data) return { enabled: false, markets: [], announcements: [], marketUpdatedAt: null, bixPriceUsd: 0 };
  const [market, posts] = await Promise.all([getHomeMarketData(), client.from('bix_announcements').select('id,title,body,category,published_at').not('published_at', 'is', null).lte('published_at', new Date().toISOString()).order('published_at', { ascending: false }).limit(50)]);
  if (posts.error) throw new Error('Could not load announcements.');
  return { enabled: true, markets: market.markets, announcements: posts.data ?? [], marketUpdatedAt: market.marketUpdatedAt, bixPriceUsd: market.bixPriceUsd };
});

export const getOwnerAnnouncements = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const role = await context.supabase.rpc('is_bix_admin');
  if (role.error || !role.data) throw new Error('Owner access required.');
  const result = await context.supabase.from('bix_announcements').select('*').order('created_at', { ascending: false });
  if (result.error) throw new Error(result.error.message);
  return result.data ?? [];
});

export const saveAnnouncement = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; title: string; body: string; category: string; published: boolean }) => z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(1).max(120), body: z.string().trim().min(1).max(5000), category: z.enum(['PRODUCT', 'ANNOUNCEMENT', 'MAINTENANCE']), published: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    const role = await context.supabase.rpc('is_bix_admin');
    if (role.error || !role.data) throw new Error('Owner access required.');
    const values = { title: data.title, body: data.body, category: data.category, published_at: data.published ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
    const result = data.id ? await context.supabase.from('bix_announcements').update(values).eq('id', data.id).select('id').single() : await context.supabase.from('bix_announcements').insert(values).select('id').single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });