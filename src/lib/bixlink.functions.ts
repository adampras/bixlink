import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import type { Json } from '@/integrations/supabase/types';
import { PRESENTATION_THEMES } from '@/lib/presentation-theme';
import { canonicalJson } from '@/lib/json-content';
import { movementInputSchema, resolveMovement, simulatedQuote, type MovementInput } from '@/lib/internal-market';
import { canReviewerEditSetting } from '@/lib/reviewer-policy';
import { miningVisibilitySchema } from '@/lib/mining-visibility';
import { miningConversionSchema } from '@/lib/mining-conversion';
import { splashSettingsSchema } from '@/lib/splash-settings';
import { BOOSTER_VIDEOS } from '@/lib/booster-visual';

const verifyAdmin = async (context: { supabase: any; userId: string; claims?: any }) => {
  const { data: admin, error } = await context.supabase.rpc('is_bix_admin');
  if (error || !admin) throw new Error('Owner access required');
};

async function settingAccess(context: { supabase: any; userId: string }, key: string) {
  const { data: admin, error } = await context.supabase.rpc('is_bix_admin');
  if (error) throw error;
  if (admin) return 'owner' as const;
  if (!canReviewerEditSetting(key)) throw new Error('Owner access required');
  const role = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId).eq('role', 'reviewer').maybeSingle();
  if (role.error || !role.data) throw new Error('Owner access required');
  return 'reviewer' as const;
}

export const getMyData = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [stakes, referral, tree, admin, bixMetrics, bonuses, usdtBonuses] = await Promise.all([
    context.supabase.from('stakes').select('*').eq('user_id', context.userId).order('created_at', { ascending: false }),
    context.supabase.from('referral_codes').select('*').eq('user_id', context.userId).maybeSingle(),
    context.supabase.rpc('bix_referral_tree_metrics'), context.supabase.rpc('is_bix_admin'),
     context.supabase.rpc('bix_network_bix_metrics'),
     context.supabase.from('bix_referral_bonuses').select('*').eq('referrer_id', context.userId).order('created_at', { ascending: false }),
     context.supabase.from('bix_usdt_network_bonuses').select('id,kind,level,bonus_date,base_usd,rate_pct,total_usd,usdt_amount,bix_amount,member_id,created_at').eq('user_id', context.userId).order('created_at', { ascending: false }).limit(500),
  ]);
  if (stakes.error) throw stakes.error;
  if (tree.error) throw tree.error;
  if (bixMetrics.error) throw bixMetrics.error;
  if (bonuses.error) throw bonuses.error;
  if (usdtBonuses.error) throw usdtBonuses.error;
  return { stakes: stakes.data ?? [], referral: referral.data, tree: tree.data ?? [], bixMetrics: bixMetrics.data, bonuses: bonuses.data ?? [], usdtBonuses: usdtBonuses.data ?? [], isAdmin: Boolean(admin.data) };
});

export const assignReferral = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => z.object({ code: z.string().regex(/^BIX-\d{6}$/i) }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: linked, error } = await context.supabase.rpc('assign_bix_referrer', { p_code: data.code });
    if (error) throw error;
    return { linked: Boolean(linked) };
  });

export const requestStake = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { packageId: string; days: number; mode?: 'usdt' | 'hybrid' }) => z.object({ packageId: z.string().min(1).max(40), days: z.number().int().refine(d => [30, 60, 90, 180, 360].includes(d)), mode: z.enum(['usdt', 'hybrid']).default('usdt') }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc('request_bix_duration_stake_mode', { p_package: data.packageId, p_days: data.days, p_mode: data.mode });
    if (error) throw new Error(error.message);
    const record = await context.supabase.from('stakes').select('id,status').eq('id', id).eq('user_id', context.userId).single();
    // The mutation has already succeeded; never invite a duplicate submission if readback is delayed.
    return { id: String(id), status: record.data?.status ?? 'pending' };
  });

export const setStakeCompound = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { stakeId: string; on: boolean }) => z.object({ stakeId: z.string().uuid(), on: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('bix_set_stake_compound', { p_stake: data.stakeId, p_on: data.on });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unstakeStake = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { stakeId: string }) => z.object({ stakeId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc('bix_unstake', { p_stake: data.stakeId });
    if (error) throw new Error(error.message);
    return res as { penalty_pct: number; refund_usd: number; nft?: boolean };
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
  const members: { id: string; email: string; created_at: string; banned_until: string | null; access: 'active' | 'inactive' | 'banned' }[] = [];
  for (let page = 1; page <= 100; page++) {
    const { data: batch, error: membersError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (membersError) throw membersError;
    members.push(...batch.users.map(user => ({ id: user.id, email: user.email ?? '', created_at: user.created_at, banned_until: user.banned_until ?? null, access: (user.banned_until && new Date(user.banned_until) > new Date() ? (user.app_metadata?.['access_status'] === 'inactive' ? 'inactive' : 'banned') : 'active') as 'active' | 'inactive' | 'banned' })));
    if (batch.users.length < 1000) break;
  }
  return { stakes: stakes.data ?? [], packages: packages.data ?? [], settings: settings.data ?? [], sources: sources.data ?? [], referrals: referrals.data ?? [], members };
});

export const getAdminReport = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyAdmin(context);
  const [stakes, bixStakes, refBonuses, usdtBonuses, vbix] = await Promise.all([
    context.supabase.from('stakes').select('amount_usd,status,created_at'),
    context.supabase.from('bix_stakes').select('amount_bix,status,created_at'),
    context.supabase.from('bix_referral_bonuses').select('amount_bix,status,created_at'),
    context.supabase.from('bix_usdt_network_bonuses').select('total_usd,usdt_amount,bix_amount,created_at'),
    context.supabase.from('bix_vbix_ledger').select('amount_vbix,created_at'),
  ]);
  for (const result of [stakes, bixStakes, refBonuses, usdtBonuses, vbix]) if (result.error) throw result.error;
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const sum = <T extends { created_at: string }>(rows: T[], pick: (row: T) => number, since?: Date) =>
    rows.filter(row => !since || new Date(row.created_at) >= since).reduce((total, row) => total + pick(row), 0);
  const stakeRows = stakes.data ?? [];
  const bixRows = bixStakes.data ?? [];
  const refRows = refBonuses.data ?? [];
  const usdtRows = usdtBonuses.data ?? [];
  const bucket = <T extends { created_at: string }>(rows: T[], pick: (row: T) => number) => ({
    day: sum(rows, pick, dayStart),
    month: sum(rows, pick, monthStart),
    total: sum(rows, pick),
  });
  return {
    stakingUsd: bucket(stakeRows, row => Number(row.amount_usd)),
    stakingCount: bucket(stakeRows, () => 1),
    stakingBix: bucket(bixRows, row => Number(row.amount_bix)),
    referralBix: bucket(refRows, row => Number(row.amount_bix)),
    networkUsdt: bucket(usdtRows, row => Number(row.total_usd)),
    networkBix: bucket(usdtRows, row => Number(row.bix_amount)),
    miningBix: bucket((vbix.data ?? []) as { amount_vbix: number; created_at: string }[], row => Number(row.amount_vbix)),
    miningNote: 'Dalam vBIX (mining + bonus jaringan). Konversi ke BIX belum dibuka.',
  };
});

export const getOwnerBixVault = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyAdmin(context);
  const { data, error } = await context.supabase.rpc('bix_owner_vault');
  if (error) throw new Error(error.message);
  return data as unknown as { balance_bix: number; generated_at: string; updated_at: string };
});

export const manageMember = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; action: 'ban' | 'unban' | 'deactivate' }) => z.object({ id: z.string().uuid(), action: z.enum(['ban', 'unban', 'deactivate']) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    if (data.id === context.userId) throw new Error('Cannot change your own access');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { ban_duration: data.action === 'unban' ? 'none' : '876000h', app_metadata: { access_status: data.action === 'unban' ? 'active' : data.action === 'ban' ? 'banned' : 'inactive' } });
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
  .inputValidator((data: { id: string; price_usd: number; apy: number; lock_days: number; daily_profit_enabled: boolean }) => z.object({ id: z.string(), price_usd: z.number().positive(), apy: z.number().min(0).max(25), lock_days: z.number().int().positive(), daily_profit_enabled: z.boolean() }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { id, ...values } = data;
    const { error } = await context.supabase.from('packages').update(values).eq('id', id);
    if (error) throw error;
    return { ok: true };
  });

export const clonePackage = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { sourceId: string; price_usd: number; apy: number; lock_days: number }) => z.object({ sourceId: z.string().min(1).max(40), price_usd: z.number().positive().max(10_000_000), apy: z.number().min(0).max(25), lock_days: z.number().int().min(1).max(3650) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const base = data.sourceId.split('-')[0] ?? data.sourceId;
    const { data: rows, error: listError } = await context.supabase.from('packages').select('id').like('id', `${base}-%`);
    if (listError) throw listError;
    const used = new Set((rows ?? []).map(r => r.id));
    let n = 2; while (used.has(`${base}-${n}`)) n++;
    const id = `${base}-${n}`;
    const { error } = await context.supabase.from('packages').insert({ id, price_usd: data.price_usd, apy: data.apy, lock_days: data.lock_days, daily_profit_enabled: true, enabled: true, clone_of: base });
    if (error) throw error;
    return { id };
  });

export const setPackageEnabled = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; enabled: boolean }) => z.object({ id: z.string().min(1).max(40), enabled: z.boolean() }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { data: saved, error } = await context.supabase.from('packages').update({ enabled: data.enabled }).eq('id', data.id).select('enabled').single();
    if (error || saved?.enabled !== data.enabled) throw error ?? new Error('Could not confirm package status');
    return { ok: true };
  });

export const updateSetting = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { key: 'booster' | 'booster_visual' | 'referrals' | 'wallet' | 'swap' | 'bix_market' | 'bix_pay' | 'landing_content' | 'usdt_transfer' | 'unstake' | 'readiness' | 'bix_token' | 'booster_withdraw' | 'mining' | 'mining_visibility' | 'mining_conversion' | 'splash' | 'member_shop' | 'vip_tiers'; value: Record<string, unknown> }) => {
    const parsed = z.object({ key: z.enum(['booster','booster_visual','referrals','wallet','swap','bix_market','bix_pay','landing_content','usdt_transfer','unstake','readiness','bix_token','booster_withdraw','mining','mining_visibility','mining_conversion','splash','member_shop','vip_tiers']), value: z.record(z.string(), z.unknown()) }).parse(data);
    if (parsed.key === 'vip_tiers') parsed.value = z.object({ tiers: z.array(z.object({ level: z.number().int().min(1).max(10), targetUsd: z.number().positive().max(1_000_000_000), rewardBix: z.number().positive().max(10_000_000) }).strict()).min(1).max(10).refine(t => new Set(t.map(x => x.level)).size === t.length, 'Each VIP level must be unique') }).strict().parse(parsed.value);
    if (parsed.key === 'mining_conversion') parsed.value = miningConversionSchema.parse(parsed.value);
    if (parsed.key === 'splash') parsed.value = splashSettingsSchema.parse(parsed.value);
    if (parsed.key === 'mining_visibility') parsed.value = miningVisibilitySchema.parse(parsed.value);
    if (parsed.key === 'mining') parsed.value = z.object({ enabled: z.boolean(), ratePerDay: z.number().positive().max(100), mode: z.enum(['day','second']), stakeBoostPct: z.number().min(0).max(100) }).strict().parse(parsed.value);
    if (parsed.key === 'member_shop') parsed.value = z.object({ enabled: z.boolean(), tiers: z.array(z.object({ min: z.number().min(0).max(10_000_000), slots: z.number().int().min(0).max(1000) })).max(10), overrides: z.record(z.string().uuid(), z.number().int().min(0).max(1000)).optional(), autoApprove: z.boolean().optional(), autoMaxPrice: z.number().min(1).max(1_000_000).optional() }).strict().parse(parsed.value);
    if (parsed.key === 'booster_withdraw') parsed.value = z.object({ bix: z.boolean(), usdt: z.boolean() }).strict().parse(parsed.value);
    if (parsed.key === 'booster_visual') parsed.value = z.object({ visual: z.enum(BOOSTER_VIDEOS), stakeLayout: z.enum(['quantum3d', 'matrix', 'auric', 'capsule', 'carousel', 'spotlight', 'accordion']).optional() }).strict().parse(parsed.value);
    if (parsed.key === 'booster') parsed.value = z.object({ enabled: z.boolean(), rate: z.number().min(0).max(45), maxApy: z.number().min(8).max(45).optional() }).strict().parse(parsed.value);
    if (parsed.key === 'readiness') parsed.value = z.object({ legalEnabled: z.boolean(), kycEnabled: z.boolean(), readinessEnabled: z.boolean(), marketEnabled: z.boolean(), homeOverviewEnabled: z.boolean().optional(), footerEnabled: z.boolean().optional(), footerTitle: z.string().trim().max(80).optional(), footerBody: z.string().trim().max(320).optional(), footerContact: z.string().trim().max(120).optional(), presentationTheme: z.enum(PRESENTATION_THEMES).optional(), walletColors: z.array(z.enum(['auric','violet','emerald','sapphire','ruby'])).max(5).optional(), animGlow: z.boolean().optional(), animShimmer: z.boolean().optional(), animFloat: z.boolean().optional(), liveActivityEnabled: z.boolean().optional(), heroAnimEnabled: z.boolean().optional(), touchEffectsEnabled: z.boolean().optional(), loanEnabled: z.boolean().optional(), presaleStageEnabled: z.boolean().optional(), consortiumVaultEnabled: z.boolean().optional(), web3WalletEnabled: z.boolean().optional(), sovereignWalletEnabled: z.boolean().optional(), walletTheme: z.enum(['gold','matcha']).optional(), walletCard: z.boolean().optional(), walletCardColor: z.enum(['onyx','gold','sapphire','emerald','ruby']).optional(), walletCardModel: z.enum(['metal','elite']).optional(), dockHub: z.record(z.string().max(24), z.boolean()).optional(), modules: z.object({ p2p: z.boolean(), arena: z.boolean(), nft: z.boolean(), register: z.boolean(), trade: z.boolean() }).partial().strict().optional(), socials: z.object({ telegram: z.string().trim().max(200), x: z.string().trim().max(200), youtube: z.string().trim().max(200), discord: z.string().trim().max(200), instagram: z.string().trim().max(200) }).partial().refine(o => Object.values(o).every(v => !v || /^https:\/\//.test(v)), 'Links must start with https://').optional(), hub: z.object({ enabled: z.boolean().optional(), items: z.array(z.object({ title: z.string().trim().min(1).max(40), tag: z.string().trim().max(16), body: z.string().trim().max(60), color: z.enum(['gold','emerald','cyan','violet','crimson']), image: z.enum(['launch','stake','p2p','arena','market','nft']), href: z.string().trim().max(200).refine(v => /^\/[a-z0-9\-\/]*$/i.test(v) || /^https:\/\//.test(v), 'Link must be an app path or https://'), enabled: z.boolean().optional() }).strict()).max(8).optional() }).strict().optional() }).strict().parse(parsed.value);
    if (parsed.key === 'unstake') z.object({ tiers: z.array(z.object({ days: z.number().int().min(1).max(3650), pct: z.number().min(0).max(100) })).min(1).max(10) }).parse(parsed.value);
    if (parsed.key === 'bix_token') z.object({ chainId: z.union([z.literal(56), z.literal(97)]), address: z.string().regex(/^0x[a-fA-F0-9]{40}$/), txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/), deployer: z.string().regex(/^0x[a-fA-F0-9]{40}$/), supply: z.number().int().positive().max(1_000_000_000_000), deployedAt: z.string().max(40) }).strict().parse(parsed.value);
    if (parsed.key === 'bix_market') z.object({ priceUsd: z.number().positive().max(1_000_000) }).parse(parsed.value);
    if (parsed.key === 'referrals') z.object({ direct: z.number().min(0).max(100), levels: z.array(z.number().min(0).max(100)).length(5), rewardPlus: z.number().min(0).max(100), minimumDirect: z.number().int().min(1), splitUsdt: z.number().min(0).max(100), splitBix: z.number().min(0).max(100), bixDirectPct: z.number().min(0).max(100).optional(), bixDirectEnabled: z.boolean().optional() }).refine(v => v.splitUsdt + v.splitBix === 100, 'USDT and BIX split must total 100%').parse(parsed.value);
    if (parsed.key === 'landing_content') {
      const img = z.string().regex(/^images\/[a-f0-9-]+\.(jpg|jpeg|png|webp)$/);
      const item = z.object({ title: z.string().trim().min(1).max(60), description: z.string().trim().max(240), image: img.optional(), enabled: z.boolean().optional(), quarter: z.string().max(40).optional(), detail: z.string().max(5000).optional(), detailImage: img.optional(), size: z.enum(['sm','md','lg']).optional(), pageWidth: z.enum(['narrow','normal','wide']).optional(), pageOpen: z.boolean().optional(), percent: z.number().min(0).max(100).optional() }).strict();
      const popup = z.object({ title: z.string().trim().min(1).max(60), description: z.string().trim().max(240), image: img.optional(), enabled: z.boolean().optional(), placement: z.enum(['home','presale','wallet','dashboard']), ctaLabel: z.string().trim().max(24).optional(), url: z.string().trim().max(300).regex(/^(https:\/\/|\/(?!\/))/, 'Link must start with https:// or /').optional() }).strict();
      parsed.value = z.object({ ecosystem: z.array(item).max(12), income: z.array(item).max(12), spaces: z.array(item).max(12).optional(), roadmap: z.array(item).max(12).optional(), narrative: z.array(item).max(12).optional(), tokenomics: z.array(item).max(12).optional(), tokenomicsEnabled: z.boolean().optional(), narrativeTitle: z.string().trim().max(60).optional(), narrativeIntro: z.string().trim().max(240).optional(), narrativeEnabled: z.boolean().optional(), hero3dEnabled: z.boolean().optional(), heroImage: img.optional(), sponsor: z.record(z.string(), z.unknown()).optional(), popups: z.array(popup).max(8).optional() }).strict().parse(parsed.value);
    }
    return parsed;
  })
  .handler(async ({ context, data }) => {
    const access = await settingAccess(context, data.key);
    if (data.key === 'bix_market') {
      const { data: current, error: readError } = await context.supabase.from('app_settings').select('value').eq('key', 'bix_market').maybeSingle();
      if (readError) throw readError;
      const prev = (current?.value && typeof current.value === 'object' && !Array.isArray(current.value) ? current.value : {}) as Record<string, unknown>;
      const price = Number(data.value['priceUsd']);
      const mv = resolveMovement(prev['movement']);
      const now = Date.now();
      // Re-anchor the display simulation around the new reference so the market card follows the saved price.
      const movement = mv ? { ...mv, lower: Number((price * .9).toFixed(6)), upper: Number((price * 1.1).toFixed(6)), base: price, startedAt: now, pausedAt: mv.enabled ? null : now } : undefined;
      data.value = { ...prev, priceUsd: price, ...(movement ? { movement } : {}) };
    }
    const { error } = access === 'reviewer'
      ? await context.supabase.rpc('bix_reviewer_update_setting', { p_key: data.key, p_value: data.value as Json })
      : await context.supabase.from('app_settings').upsert({ key: data.key, value: data.value as Json });
    if (error) throw error;
    const { data: saved, error: readError } = await context.supabase.from('app_settings').select('value').eq('key', data.key).single();
    const savedOk = data.key === 'bix_market'
      ? Math.abs(Number((saved?.value as Record<string, unknown> | null)?.['priceUsd']) - Number(data.value['priceUsd'])) < 1e-9
      : saved && canonicalJson(saved.value) === canonicalJson(data.value);
    if (readError || !saved || !savedOk) throw new Error('Could not confirm saved settings');
    return { ok: true };
  });

export const updatePresentationTheme = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { theme: typeof PRESENTATION_THEMES[number] }) => z.object({ theme: z.enum(PRESENTATION_THEMES) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { data: current, error: readError } = await context.supabase.from('app_settings').select('value').eq('key', 'readiness').maybeSingle();
    if (readError) throw readError;
    const value = { ...(current?.value && typeof current.value === 'object' && !Array.isArray(current.value) ? current.value : {}), presentationTheme: data.theme };
    const { error } = await context.supabase.from('app_settings').upsert({ key: 'readiness', value: value as Json });
    if (error) throw error;
    const { data: saved, error: verifyError } = await context.supabase.from('app_settings').select('value').eq('key', 'readiness').single();
    if (verifyError || (saved?.value as Record<string, unknown> | undefined)?.['presentationTheme'] !== data.theme) throw new Error('Could not confirm the saved theme.');
    return { theme: data.theme };
  });

export const updateInternalMovement = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: MovementInput) => movementInputSchema.parse(input))
  .handler(async ({ context, data }) => {
    const access = await settingAccess(context, 'bix_market');
    const { data: row, error } = await context.supabase.from('app_settings').select('value').eq('key', 'bix_market').single();
    if (error) throw error;
    const current = row.value as Record<string, Json | undefined>;
    const old = resolveMovement(current['movement']);
    const now = Date.now();
    const same = old && old.lower === data.lower && old.upper === data.upper && old.intervalSeconds === data.intervalSeconds && old.intensity === data.intensity && old.bias === data.bias;
    const base = old ? simulatedQuote(old, now) : Number(current['priceUsd']);
    if (!Number.isFinite(base) || base <= 0) throw new Error('Set a valid ledger reference first.');
    const movement = same ? { ...old, ...data, startedAt: data.enabled && !old.enabled ? now - ((old.pausedAt ?? now) - old.startedAt) : old.startedAt, pausedAt: data.enabled ? null : old.enabled ? now : old.pausedAt } : { ...data, base: Math.min(data.upper, Math.max(data.lower, base)), startedAt: now, pausedAt: data.enabled ? null : now };
    const value = { ...current, movement };
    const { error: writeError } = access === 'reviewer'
      ? await context.supabase.rpc('bix_reviewer_update_setting', { p_key: 'bix_market', p_value: value as Json })
      : await context.supabase.from('app_settings').update({ value: value as Json }).eq('key', 'bix_market');
    if (writeError) throw writeError;
    const { data: saved, error: verifyError } = await context.supabase.from('app_settings').select('value').eq('key', 'bix_market').single();
    if (verifyError || canonicalJson((saved?.value as Record<string, unknown> | null)?.['movement']) !== canonicalJson(movement)) throw new Error('Could not confirm movement settings.');
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

export const getMyWallet = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [txs, balances, swaps] = await Promise.all([
    context.supabase.from('wallet_transactions').select('*').eq('user_id', context.userId).order('created_at', { ascending: false }),
    context.supabase.rpc('bix_asset_balances', { p_user: context.userId }).single(),
    context.supabase.from('swap_requests').select('*').eq('user_id', context.userId).order('created_at', { ascending: false }),
  ]);
  if (txs.error) throw txs.error;
  if (balances.error) throw balances.error;
  if (swaps.error) throw swaps.error;
  return { transactions: txs.data ?? [], swaps: swaps.data ?? [], balance: Number(balances.data?.usdt_balance ?? 0), usdtBalance: Number(balances.data?.usdt_balance ?? 0), bixBalance: Number(balances.data?.bix_balance ?? 0) };
});

export const requestSwap = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { direction: 'USDT_TO_BIX' | 'BIX_TO_USDT'; amount: number }) => z.object({ direction: z.enum(['USDT_TO_BIX','BIX_TO_USDT']), amount: z.number().positive().max(100000000) }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc('request_bix_swap', { p_direction: data.direction, p_amount: data.amount });
    if (error) throw new Error(error.message);
    return { id };
  });

export const requestDeposit = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { amount: number; txHash: string }) => z.object({ amount: z.number().min(1).max(1000000), txHash: z.string().trim().min(8).max(200) }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc('request_bix_deposit', { p_amount: data.amount, p_tx_hash: data.txHash });
    if (error) throw new Error(error.message);
    try { const { supabaseAdmin: na } = await import('@/integrations/supabase/client.server'); const { dispatchWalletAlerts } = await import('@/lib/notify.server'); await dispatchWalletAlerts(na); } catch (e) { console.error('notify', e); }
    return { id };
  });

export const requestWithdraw = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { amount: number; address: string }) => z.object({ amount: z.number().min(10).max(10000), address: z.string().trim().min(20).max(120) }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc('request_bix_withdraw', { p_amount: data.amount, p_address: data.address });
    if (error) throw new Error(error.message);
    try { const { supabaseAdmin: na } = await import('@/integrations/supabase/client.server'); const { dispatchWalletAlerts } = await import('@/lib/notify.server'); await dispatchWalletAlerts(na); } catch (e) { console.error('notify', e); }
    return { id };
  });

export const getAdminWallet = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyAdmin(context);
  const [transactions, swaps] = await Promise.all([
    context.supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }),
    context.supabase.from('swap_requests').select('*').order('created_at', { ascending: false }),
  ]);
  if (transactions.error) throw transactions.error;
  if (swaps.error) throw swaps.error;
  return { transactions: transactions.data ?? [], swaps: swaps.data ?? [] };
});

export const reviewWalletTx = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: 'approved' | 'rejected' }) => z.object({ id: z.string().uuid(), status: z.enum(['approved', 'rejected']) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.from('wallet_transactions').update({ status: data.status, reviewed_at: new Date().toISOString() }).eq('id', data.id).eq('status', 'pending');
    if (error) throw error;
    // Stop auto-detection for a reported deposit once the owner decided it.
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await supabaseAdmin.from('deposit_intents').update({ status: 'reviewed' }).eq('claim_tx_id', data.id).eq('status', 'pending');
    try { const { supabaseAdmin: na } = await import('@/integrations/supabase/client.server'); const { dispatchWalletAlerts } = await import('@/lib/notify.server'); await dispatchWalletAlerts(na); } catch (e) { console.error('notify', e); }
    return { ok: true };
  });

export const reviewSwap = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: 'approved' | 'rejected' }) => z.object({ id: z.string().uuid(), status: z.enum(['approved', 'rejected']) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.from('swap_requests').update({ status: data.status, reviewed_at: new Date().toISOString() }).eq('id', data.id).eq('status', 'pending');
    if (error) throw error;
    return { ok: true };
  });

export const addReward = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; amount: number; note: string }) => z.object({ userId: z.string().uuid(), amount: z.number().positive().max(1000000), note: z.string().trim().min(1).max(120) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.from('wallet_transactions').insert({ user_id: data.userId, type: 'reward', amount_usd: data.amount, fee_usd: 0, net_usd: data.amount, status: 'approved', note: data.note, reviewed_at: new Date().toISOString() });
    if (error) throw error;
    return { ok: true };
  });

export const getBixPay = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [me, list, bal] = await Promise.all([
    context.supabase.from('referral_codes').select('code').eq('user_id', context.userId).maybeSingle(),
    context.supabase.from('bix_transfers').select('*').or(`sender_id.eq.${context.userId},recipient_id.eq.${context.userId}`).order('created_at', { ascending: false }).limit(100),
    context.supabase.rpc('bix_asset_balances', { p_user: context.userId }).single(),
  ]);
  if (list.error) throw list.error;
  return { code: me.data?.code ?? null, bixBalance: Number(bal.data?.bix_balance ?? 0), transfers: (list.data ?? []).map(t => ({ ...t, outgoing: t.sender_id === context.userId })) };
});

export const lookupBixPay = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => z.object({ code: z.string().trim().regex(/^BIX-\d{6}$/i) }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: ok, error } = await context.supabase.rpc('bix_pay_lookup', { p_code: data.code });
    if (error) throw new Error(error.message);
    return { valid: Boolean(ok) };
  });

export const sendBixPay = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string; amount: number; note?: string }) => z.object({ code: z.string().trim().regex(/^BIX-\d{6}$/i), amount: z.number().positive().max(100000), note: z.string().max(120).optional() }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc('bix_pay_send', { p_code: data.code, p_amount: data.amount, p_note: data.note ?? '' });
    if (error) throw new Error(error.message);
    return { id };
  });

export const getAdminTransfers = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyAdmin(context);
  const { data, error } = await context.supabase.from('bix_transfers').select('*').order('created_at', { ascending: false }).limit(300);
  if (error) throw error;
  return data ?? [];
});

export const reverseTransfer = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.from('bix_transfers').update({ status: 'reversed', reversed_at: new Date().toISOString() }).eq('id', data.id).eq('status', 'completed');
    if (error) throw error;
    return { ok: true };
  });

export const ensureProfile = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await context.supabase.rpc('ensure_bix_profile');
  const { data } = await context.supabase.from('profiles').select('full_name, username').eq('user_id', context.userId).maybeSingle();
  return data;
});

export const getAdminClones = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyAdmin(context);
  const [clones, allocs, codes, profiles] = await Promise.all([
    context.supabase.from('bix_clone_accounts').select('*').order('created_at'),
    context.supabase.from('bix_allocations').select('*').order('created_at', { ascending: false }),
    context.supabase.from('referral_codes').select('user_id, code'),
    context.supabase.from('profiles').select('user_id, full_name, username'),
  ]);
  for (const r of [clones, allocs, codes, profiles]) if (r.error) throw r.error;
  return (clones.data ?? []).map(c => ({
    ...c,
    code: codes.data?.find(x => x.user_id === c.user_id)?.code ?? '—',
    username: profiles.data?.find(x => x.user_id === c.user_id)?.username ?? '',
    allocated: (allocs.data ?? []).filter(a => a.user_id === c.user_id).reduce((s, a) => s + Number(a.amount_bix), 0),
  }));
});

export const createClones = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { count: number; amount: number }) => z.object({ count: z.number().int().min(1).max(50), amount: z.number().min(0).max(10_000_000) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { count: existing } = await supabaseAdmin.from('bix_clone_accounts').select('user_id', { count: 'exact', head: true });
    let n = existing ?? 0; let made = 0;
    for (let i = 0; i < data.count; i++) {
      n++;
      const tag = String(n).padStart(3, '0');
      const email = `clone${tag}.${Date.now().toString(36)}@bixlink.internal`;
      const password = crypto.randomUUID() + 'Aa1!';
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `BIX Clone ${tag}`, username: `clone${tag}`, clone: true } });
      if (error || !created.user) throw error ?? new Error('Could not create clone');
      const id = created.user.id;
      const code = `BIX-${Math.floor(100000 + Math.random() * 900000)}`;
      const results = await Promise.all([
        supabaseAdmin.from('bix_clone_accounts').insert({ user_id: id, email, label: `BIX Clone ${tag}`, created_by: context.userId }),
        supabaseAdmin.from('referral_codes').insert({ user_id: id, code, referred_by: context.userId }),
        supabaseAdmin.from('profiles').insert({ user_id: id, full_name: `BIX Clone ${tag}`, username: `clone${tag}_${id.slice(0, 4)}` }),
        data.amount > 0 ? supabaseAdmin.from('bix_allocations').insert({ user_id: id, amount_bix: data.amount, note: 'Clone account initial allocation', created_by: context.userId }) : Promise.resolve({ error: null }),
      ]);
      for (const r of results) if (r.error) throw r.error;
      made++;
    }
    return { created: made };
  });

export const allocateBix = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; amount: number; note: string }) => z.object({ userId: z.string().uuid(), amount: z.number().positive().max(10_000_000), note: z.string().trim().min(1).max(120) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: clone } = await supabaseAdmin.from('bix_clone_accounts').select('user_id').eq('user_id', data.userId).maybeSingle();
    if (!clone) throw new Error('Allocations are limited to clone accounts');
    const { error } = await supabaseAdmin.from('bix_allocations').insert({ user_id: data.userId, amount_bix: data.amount, note: data.note, created_by: context.userId });
    if (error) throw error;
    return { ok: true };
  });

type LeaderStatus = { status: string | null; virtual_usd: number; require_turnover: boolean; multiple: number; own_stake: number; turnover: number; target: number; qualified: boolean; kind?: 'loan' | 'virtual' | null; base?: number; escrow_usd?: number };

export const getMyLeader = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc('bix_leader_status', { p_user: context.userId });
  if (error) throw error;
  return data as unknown as LeaderStatus;
});

export const getConditionalLeaderAccess = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc('bix_in_owner1_network');
  if (error) return { allowed: false };
  return { allowed: data === true };
});

export const checkLoanDevice = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { fp: string; label: string; bind: boolean }) => z.object({ fp: z.string().regex(/^[a-f0-9]{64}$/), label: z.string().max(80), bind: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getRequestHeader } = await import('@tanstack/react-start/server');
    const ip = (getRequestHeader('cf-connecting-ip') || getRequestHeader('x-forwarded-for')?.split(',')[0] || '').trim();
    const ua = getRequestHeader('user-agent') ?? '';
    const { data: r, error } = await context.supabase.rpc('bix_loan_device_check', { p_fp: data.fp, p_label: data.label, p_ip: ip, p_ua: ua, p_bind: data.bind });
    if (error) throw new Error(error.message);
    return r as unknown as { bound: boolean; match: boolean; taken?: boolean; label?: string };
  });

export const resetLoanDevice = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('bix_loan_device_reset', { p_user: data.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const claimConditionalLeader = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { packageId: string; days: number }) => z.object({ packageId: z.string().min(1).max(40), days: z.number().int().refine(d => [30, 60, 90, 180, 360].includes(d)) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: r, error } = await context.supabase.rpc('bix_claim_conditional_leader', { p_package: data.packageId, p_days: data.days });
    if (error) throw new Error(error.message);
    const res = r as unknown as { stake_id: string; package: string; value_usd: number; target_usd: number; days: number; sponsor_id?: string | null };
    try {
      const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
      const { sendAll, readToggles } = await import('@/lib/notify.server');
      const { loanQuotaText } = await import('@/lib/telegram-bot.server');
      const [{ data: me }, { data: sp }] = await Promise.all([
        admin.from('referral_codes').select('code').eq('user_id', context.userId).maybeSingle(),
        res.sponsor_id ? admin.from('referral_codes').select('code').eq('user_id', res.sponsor_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const fmt = (n: number) => `$${Number(n).toLocaleString('en-US')}`;
      const html = [`<b>📢 KLAIM AKUN PINJAMAN (LOAN)</b>`, `👤 Member: ${me?.code ?? '-'}`, `📦 Paket: ${fmt(res.value_usd)} (Target 5×: ${fmt(res.target_usd)})`, `🤝 Sponsor: ${sp?.code ?? '-'}`, res.sponsor_id ? await loanQuotaText(admin, res.sponsor_id) : ''].filter(Boolean).join('\n');
      await sendAll(html, await readToggles(admin));
    } catch (e) { console.error('loan notify', e); }
    return res;
  });

export const getMyLoanQuota = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: rc } = await context.supabase.from('referral_codes').select('referred_by').eq('user_id', context.userId).maybeSingle();
  const { data: mine } = await context.supabase.rpc('bix_loan_quota', { p_sponsor: context.userId });
  return { mine: mine as unknown as { sponsor_is_loan: boolean; quota: { price: number; max: number; used: number }[] }, sponsorId: rc?.referred_by ?? null };
});

export const applyLeader = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { error } = await context.supabase.rpc('apply_bix_leader');
  if (error) throw new Error(error.message);
  return { ok: true };
});

export const getAdminLeaders = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyAdmin(context);
  const [leaders, profiles, pool] = await Promise.all([
    context.supabase.from('bix_leaders').select('*').order('created_at'),
    context.supabase.from('profiles').select('user_id, full_name, username'),
    context.supabase.from('app_settings').select('value').eq('key', 'leader_pool').maybeSingle(),
  ]);
  if (leaders.error) throw leaders.error;
  const rows = await Promise.all((leaders.data ?? []).map(async l => {
    const { data: s } = await context.supabase.rpc('bix_leader_status', { p_user: l.user_id });
    const p = profiles.data?.find(x => x.user_id === l.user_id);
    return { ...l, full_name: p?.full_name ?? '', username: p?.username ?? '', stats: s as unknown as LeaderStatus };
  }));
  return { leaders: rows, poolUsd: Number((pool.data?.value as { poolUsd?: number } | null)?.poolUsd ?? 1000000) };
});

export const reviewLeader = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; status: 'approved' | 'rejected'; virtualUsd: number; requireTurnover: boolean }) => z.object({ userId: z.string().uuid(), status: z.enum(['approved', 'rejected']), virtualUsd: z.number().min(0).max(1_000_000), requireTurnover: z.boolean() }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.rpc('admin_review_bix_leader', { p_user: data.userId, p_status: data.status, p_virtual: data.virtualUsd, p_require: data.requireTurnover });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createSponsoredLeader = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string; seedUsd: number; requireTurnover: boolean; scope: 'local' | 'global' }) => z.object({ code: z.string().trim().min(2).max(40), seedUsd: z.union([z.literal(100), z.literal(500), z.literal(1000), z.literal(5000), z.literal(10000)]), requireTurnover: z.boolean(), scope: z.enum(['local', 'global']) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.rpc('admin_create_bix_leader', { p_code: data.code, p_virtual: data.seedUsd, p_require: data.requireTurnover, p_scope: data.scope });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const verifyOwner1 = async (context: { supabase: any }) => {
  const { data, error } = await context.supabase.rpc('bix_is_owner1');
  if (error || data !== true) throw new Error('Owner 1 access required');
};

export const updateDockHub = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { dockHub: Record<string, boolean> }) => z.object({ dockHub: z.record(z.string().max(24), z.boolean()) }).strict().parse(data))
  .handler(async ({ context, data }) => {
    await verifyOwner1(context);
    const { data: current, error: readError } = await context.supabase.from('app_settings').select('value').eq('key', 'readiness').maybeSingle();
    if (readError) throw readError;
    const value = { ...(current?.value && typeof current.value === 'object' && !Array.isArray(current.value) ? current.value : {}), dockHub: data.dockHub };
    const { error } = await context.supabase.from('app_settings').upsert({ key: 'readiness', value: value as Json });
    if (error) throw error;
    const { data: saved } = await context.supabase.from('app_settings').select('value').eq('key', 'readiness').single();
    if (canonicalJson((saved?.value as Record<string, unknown> | undefined)?.['dockHub']) !== canonicalJson(data.dockHub)) throw new Error('Could not confirm saved HUB menu.');
    return { ok: true };
  });

/** Owner 1 roster: members who have not taken a sponsored-leader or loan package yet. */
export const getLeaderCandidates = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyOwner1(context);
  const [leaders, profiles] = await Promise.all([
    context.supabase.from('bix_leaders').select('user_id'),
    context.supabase.from('profiles').select('user_id, full_name, username, created_at').order('created_at', { ascending: false }).limit(300),
  ]);
  if (profiles.error) throw profiles.error;
  const taken = new Set((leaders.data ?? []).map(l => l.user_id));
  return { members: (profiles.data ?? []).filter(p => !taken.has(p.user_id)).map(p => ({ user_id: p.user_id, username: p.username ?? '', full_name: p.full_name ?? '' })) };
});
