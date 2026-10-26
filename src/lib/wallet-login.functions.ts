import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { verifyMessage } from 'viem';
import { createClient } from '@supabase/supabase-js';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { WALLET_CHALLENGE_TTL_MS, normalizeWalletAddress, walletProofMessage, walletAccountIdentity, hasVerifiedEmail, isWalletOnlyAccount } from './wallet-login';

const addressSchema = z.object({ address: z.string().regex(/^0x[0-9a-fA-F]{40}$/) });
const proofSchema = z.object({ id: z.string().uuid(), signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/) });
function origin() {
  const request = getRequest();
  const value = request.headers.get('origin');
  if (!value || !/^https?:\/\//.test(value)) throw new Error('Open BIXLINK directly to sign in with your wallet.');
  const allowed = new Set(['https://bixlink.com', 'https://www.bixlink.com', 'https://bixlink.lovable.app', new URL(request.url).origin]);
  if (!allowed.has(value)) throw new Error('Wallet sign-in origin is not allowed.');
  return value;
}
async function enabled() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data, error } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'readiness').maybeSingle();
  if (error || !(data?.value as { web3WalletEnabled?: boolean } | null)?.web3WalletEnabled) throw new Error('Web3 wallet access is currently closed by Admin.');
  return supabaseAdmin;
}
async function issue(address: string, purpose: 'link' | 'login', userId: string | null, referralCode?: string) {
  const admin = await enabled();
  const normalized = normalizeWalletAddress(address);
  const { count, error: rateError } = await admin.from('bix_wallet_challenges').select('id', { count: 'exact', head: true }).eq('address', normalized).gte('created_at', new Date(Date.now() - WALLET_CHALLENGE_TTL_MS).toISOString());
  if (rateError || (count ?? 0) >= 5) throw new Error('Please wait five minutes before requesting another wallet signature.');
  const id = crypto.randomUUID();
  const expires = new Date(Date.now() + WALLET_CHALLENGE_TTL_MS).toISOString();
  const site = origin();
  const message = walletProofMessage(site, address, id, purpose, expires);
  const { error } = await admin.from('bix_wallet_challenges').insert({ id, address: normalized, purpose, user_id: userId, origin: site, message, expires_at: expires, referral_code: referralCode ?? null });
  if (error) throw new Error('Could not prepare wallet verification.');
  return { id, message };
}
async function consume(id: string, signature: string, purpose: 'link' | 'login', userId: string | null) {
  const admin = await enabled();
  const { data, error } = await admin.rpc('bix_consume_wallet_challenge', { p_id: id, p_purpose: purpose, p_origin: origin(), ...(userId ? { p_user_id: userId } : {}) });
  const challenge = data?.[0];
  if (error || !challenge) throw new Error('Wallet signature expired or was already used. Please try again.');
  const valid = await verifyMessage({ address: normalizeWalletAddress(challenge.address), message: challenge.message, signature: signature as `0x${string}` });
  if (!valid) throw new Error('Wallet signature could not be verified.');
  return { admin, address: challenge.address, referralCode: challenge.referral_code };
}
export const createWalletLoginChallenge = createServerFn({ method: 'POST' }).inputValidator(d => addressSchema.extend({ referralCode: z.string().regex(/^BIX-\d{6}$/i).optional() }).parse(d)).handler(({ data }) => issue(data.address, 'login', null, data.referralCode));
export const createWalletLinkChallenge = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(d => addressSchema.parse(d)).handler(async ({ data, context }) => {
  const { data: identity, error } = await context.supabase.auth.getUser();
  if (error || !hasVerifiedEmail(identity.user)) throw new Error('Verify your email before linking a wallet.');
  return issue(data.address, 'link', context.userId);
});
export const linkVerifiedWallet = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(d => proofSchema.parse(d)).handler(async ({ data, context }) => {
  const { data: identity, error: identityError } = await context.supabase.auth.getUser();
  if (identityError || !hasVerifiedEmail(identity.user)) throw new Error('Verify your email before linking a wallet.');
  const { admin, address } = await consume(data.id, data.signature, 'link', context.userId);
  const { data: existing, error: readError } = await admin.from('bix_wallet_identities').select('user_id').eq('address', address).maybeSingle();
  if (readError || (existing && existing.user_id !== context.userId)) throw new Error('This wallet cannot be linked to this account.');
  if (!existing) {
    const { error } = await admin.from('bix_wallet_identities').insert({ address, user_id: context.userId, chain_id: 56 });
    if (error) throw new Error('This wallet could not be linked.');
  }
  return { address };
});
export const signInWithVerifiedWallet = createServerFn({ method: 'POST' }).inputValidator(d => proofSchema.parse(d)).handler(async ({ data }) => {
  const { admin, address, referralCode } = await consume(data.id, data.signature, 'login', null);
  const { data: mapping, error } = await admin.from('bix_wallet_identities').select('user_id').eq('address', address).maybeSingle();
  if (error) throw new Error('Wallet sign-in is temporarily unavailable.');
  let userId = mapping?.user_id;
  if (!userId) {
    const { data: settings, error: settingsError } = await admin.from('app_settings').select('key,value').in('key', ['readiness', 'site_control']);
    const readiness = settings?.find(s => s.key === 'readiness')?.value as { modules?: { register?: boolean } } | undefined;
    const control = settings?.find(s => s.key === 'site_control')?.value as { maintenance?: boolean } | undefined;
    if (settingsError || readiness?.modules?.register === false || control?.maintenance) throw new Error('New account registration is currently closed by Admin.');
    const account = walletAccountIdentity(address);
    const { data: existingId, error: lookupError } = await admin.rpc('bix_find_user_by_email', { p_email: account.email });
    if (lookupError) throw new Error('Could not prepare your wallet account.');
    userId = existingId ?? undefined;
    if (!userId) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({ email: account.email, email_confirm: true, user_metadata: { username: account.username, full_name: account.username }, app_metadata: { wallet_address: address, account_type: 'wallet' } });
      userId = created.user?.id;
      if (createError || !userId) {
        // Concurrent requests may have created the deterministic identity first.
        const { data: racedId, error: raceError } = await admin.rpc('bix_find_user_by_email', { p_email: account.email });
        if (raceError || !racedId) throw new Error('Could not create your wallet account. Please try again.');
        userId = racedId;
      }
    }
    const { error: provisionError } = await admin.rpc('bix_provision_wallet_member', { p_user: userId, p_address: address, ...(referralCode ? { p_referral: referralCode } : {}) });
    if (provisionError) throw new Error('Could not finish your wallet profile. Please try again.');
  }
  if (!userId) throw new Error('Could not open your wallet account.');
  const { data: identity, error: identityError } = await admin.auth.admin.getUserById(userId);
  const user = identity.user;
  const walletIdentity = isWalletOnlyAccount(user) && user?.app_metadata?.['wallet_address'] === address;
  if (identityError || !user?.email || (!walletIdentity && !hasVerifiedEmail(user)) || (user.banned_until && new Date(user.banned_until).getTime() > Date.now())) throw new Error('This account is not eligible for wallet sign-in.');
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.email });
  if (linkError || !link.properties?.hashed_token) throw new Error('Could not start your member session.');
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('Wallet sign-in is temporarily unavailable.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (h.get('Authorization') === `Bearer ${key}` && key.startsWith('sb_')) h.delete('Authorization'); h.set('apikey', key); return fetch(input, { ...init, headers: h }); } } });
  const { data: signed, error: signError } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' });
  if (signError || !signed.session || signed.user?.id !== userId) throw new Error('Could not start your member session.');
  return { access_token: signed.session.access_token, refresh_token: signed.session.refresh_token };
});

export const saveWalletProfile = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(d => z.object({ fullName: z.string().trim().max(80), whatsapp: z.string().trim().regex(/^$|^\+[1-9]\d{6,14}$/, 'Use an international WhatsApp number, for example +628123456789.') }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: identity, error } = await context.supabase.auth.getUser();
    if (error || !isWalletOnlyAccount(identity.user)) throw new Error('Wallet account required.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const updates = { ...(data.fullName ? { full_name: data.fullName } : {}), ...(data.whatsapp ? { whatsapp: data.whatsapp } : {}) };
    if (Object.keys(updates).length) {
      const { error: saveError } = await supabaseAdmin.from('profiles').update(updates).eq('user_id', context.userId);
      if (saveError) throw new Error('Could not save your profile.');
    }
    return { ok: true };
  });