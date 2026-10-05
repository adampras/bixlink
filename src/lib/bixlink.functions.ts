import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import type { Json } from '@/integrations/supabase/types';

const verifyAdmin = async (context: { supabase: any; userId: string; claims?: any }) => {
  const { data: admin, error } = await context.supabase.rpc('is_bix_admin');
  if (error || !admin) throw new Error('Owner access required');
};

export const getMyData = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [stakes, referral, tree] = await Promise.all([
    context.supabase.from('stakes').select('*').eq('user_id', context.userId).order('created_at', { ascending: false }),
    context.supabase.from('referral_codes').select('*').eq('user_id', context.userId).maybeSingle(),
    context.supabase.rpc('bix_referral_tree'),
  ]);
  if (stakes.error) throw stakes.error;
  if (tree.error) throw tree.error;
  return { stakes: stakes.data ?? [], referral: referral.data, tree: tree.data ?? [] };
});

export const assignReferral = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => z.object({ code: z.string().regex(/^BIX-\d{6}$/i) }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: linked, error } = await context.supabase.rpc('assign_bix_referrer', { p_code: data.code });
    if (error) throw error;
    return { linked: Boolean(linked) };
  });

export const requestStake = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { packageId: string }) => z.object({ packageId: z.string().min(1).max(40) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc('request_bix_stake', { p_package: data.packageId });
    if (error) throw error;
    return { id };
  });

export const createReferral = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: existing } = await context.supabase.from('referral_codes').select('code').eq('user_id', context.userId).maybeSingle();
  if (existing) return existing;
  const code = `BIX-${Math.floor(100000 + Math.random() * 900000)}`;
  const { data, error } = await context.supabase.from('referral_codes').insert({ user_id: context.userId, code }).select('code').single();
  if (error) throw error;
  return data;
});

export const bootstrapOwner = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { getRequestHeader } = await import('@tanstack/react-start/server');
  const token = getRequestHeader('authorization')?.replace(/^Bearer /, '');
  if (!token) return { owner: false };
  const { data: identity, error: identityError } = await context.supabase.auth.getUser(token);
  if (identityError || identity.user?.id !== context.userId || identity.user.email?.toLowerCase() !== 'bixdevpras@gmail.com' || !identity.user.email_confirmed_at) return { owner: false };
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error } = await supabaseAdmin.from('user_roles').upsert({ user_id: context.userId, role: 'admin' }, { onConflict: 'user_id,role' });
  if (error) throw error;
  return { owner: true };
});

export const getAdminData = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyAdmin(context);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const [stakes, packages, settings, sources, referrals] = await Promise.all([
    context.supabase.from('stakes').select('*').order('created_at', { ascending: false }),
    context.supabase.from('packages').select('*').order('price_usd'),
    context.supabase.from('app_settings').select('*'),
    context.supabase.from('income_sources').select('*').order('created_at', { ascending: false }),
    context.supabase.from('referral_codes').select('*'),
  ]);
  for (const result of [stakes, packages, settings, sources, referrals]) if (result.error) throw result.error;
  const { data: members, error: membersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (membersError) throw membersError;
  return { stakes: stakes.data ?? [], packages: packages.data ?? [], settings: settings.data ?? [], sources: sources.data ?? [], referrals: referrals.data ?? [], members: members.users.map(user => ({ id: user.id, email: user.email ?? '', created_at: user.created_at, banned_until: user.banned_until ?? null })) };
});

export const manageMember = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; action: 'ban' | 'unban' }) => z.object({ id: z.string().uuid(), action: z.enum(['ban', 'unban']) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    if (data.id === context.userId) throw new Error('Cannot change your own access');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { ban_duration: data.action === 'ban' ? '876000h' : 'none' });
    if (error) throw error;
    return { ok: true };
  });

export const updateStake = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: 'active' | 'rejected' }) => z.object({ id: z.string().uuid(), status: z.enum(['active','rejected']) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.from('stakes').update({ status: data.status, activated_at: data.status === 'active' ? new Date().toISOString() : null }).eq('id', data.id).eq('status', 'pending');
    if (error) throw error;
    return { ok: true };
  });

export const updatePackage = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; price_usd: number; apy: number; lock_days: number; daily_profit_enabled: boolean }) => z.object({ id: z.string(), price_usd: z.number().positive(), apy: z.number().min(0).max(100), lock_days: z.number().int().positive(), daily_profit_enabled: z.boolean() }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { id, ...values } = data;
    const { error } = await context.supabase.from('packages').update(values).eq('id', id);
    if (error) throw error;
    return { ok: true };
  });

export const updateSetting = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { key: 'booster' | 'referrals'; value: Record<string, unknown> }) => z.object({ key: z.enum(['booster','referrals']), value: z.record(z.unknown()) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.from('app_settings').upsert({ key: data.key, value: data.value as Json });
    if (error) throw error;
    return { ok: true };
  });

export const addIncomeSource = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { category: 'FOREX' | 'CRYPTO' | 'RWA' | 'ADVERTISING'; name: string; amount_usd: number }) => z.object({ category: z.enum(['FOREX','CRYPTO','RWA','ADVERTISING']), name: z.string().min(1).max(100), amount_usd: z.number().min(0) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.from('income_sources').insert(data);
    if (error) throw error;
    return { ok: true };
  });
