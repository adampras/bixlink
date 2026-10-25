import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { growthSchema, defaultGrowth, type GrowthSnapshot, type RadarMember } from './growth';
import type { Database } from '@/integrations/supabase/types';

export const getPublicGrowth = createServerFn({ method: 'GET' }).handler(async () => {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  const url = process.env['SUPABASE_URL'];
  if (!key || !url) return { eligible: false } as GrowthSnapshot;
  const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
    headers.set('apikey', key);
    return fetch(input, { ...init, headers });
  } } });
  const { data, error } = await client.rpc('bix_growth_snapshot');
  if (error) return { eligible: false } as GrowthSnapshot;
  return data as unknown as GrowthSnapshot;
});
export const getMemberGrowth = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc('bix_growth_snapshot');
  if (error) throw new Error('Activity unavailable.');
  return data as unknown as GrowthSnapshot;
});
export const getRadar = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc('bix_growth_radar');
  if (error) throw new Error('Radar unavailable.');
  return data as unknown as RadarMember[];
});
async function verifyOwner(context: { supabase: any; userId: string }) {
  const [{ data: owner, error }, { data: identity }] = await Promise.all([context.supabase.rpc('is_bix_admin'), context.supabase.auth.getUser()]);
  if (error || !owner || identity.user?.id !== context.userId || identity.user?.email?.toLowerCase() !== 'bixdevpras@gmail.com' || !identity.user.email_confirmed_at) throw new Error('Owner 1 access required');
}
export const getGrowthAdmin = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyOwner(context);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { growthReport } = await import('./growth.server');
  const report = await growthReport(supabaseAdmin);
  const { data: scope, error } = await context.supabase.rpc('bix_growth_scope_report');
  if (error) throw new Error('Network exclusion could not be verified.');
  return { ...report, scope: scope as unknown as { owner2_excluded: boolean; owner1_excluded: boolean; excluded_members: number } };
});
export const saveGrowth = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => growthSchema.parse(input)).handler(async ({ context, data }) => {
  await verifyOwner(context);
  if (data.flash_enabled && (!data.flash_ends_at || Date.parse(data.flash_ends_at) <= Date.now())) throw new Error('Choose a future event end time.');
  const { data: saved, error } = await context.supabase.from('bix_growth_control').upsert({ ...data, id: 1, freeze_reason: data.frozen ? 'Owner 1 manual pause' : null, updated_at: new Date().toISOString() }).select('*').single();
  if (error) throw new Error('Could not save growth controls.');
  return { ...defaultGrowth, ...saved };
});