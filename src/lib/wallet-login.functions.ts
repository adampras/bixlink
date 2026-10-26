import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { verifyMessage } from 'viem';
import { createClient } from '@supabase/supabase-js';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { WALLET_CHALLENGE_TTL_MS, normalizeWalletAddress, walletProofMessage } from './wallet-login';

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
async function issue(address: string, purpose: 'link' | 'login', userId: string | null) {
  const admin = await enabled();
  const normalized = normalizeWalletAddress(address);
  const { count, error: rateError } = await admin.from('bix_wallet_challenges').select('id', { count: 'exact', head: true }).eq('address', normalized).gte('created_at', new Date(Date.now() - WALLET_CHALLENGE_TTL_MS).toISOString());
  if (rateError || (count ?? 0) >= 5) throw new Error('Please wait five minutes before requesting another wallet signature.');
  const id = crypto.randomUUID();
  const expires = new Date(Date.now() + WALLET_CHALLENGE_TTL_MS).toISOString();
  const site = origin();
  const message = walletProofMessage(site, address, id, purpose, expires);
  const { error } = await admin.from('bix_wallet_challenges').insert({ id, address: normalized, purpose, user_id: userId, origin: site, message, expires_at: expires });
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
  return { admin, address: challenge.address };
}
export const createWalletLoginChallenge = createServerFn({ method: 'POST' }).inputValidator(d => addressSchema.parse(d)).handler(({ data }) => issue(data.address, 'login', null));
export const createWalletLinkChallenge = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(d => addressSchema.parse(d)).handler(async ({ data, context }) => {
  const { data: identity, error } = await context.supabase.auth.getUser();
  if (error || !identity.user?.email_confirmed_at) throw new Error('Verify your email before linking a wallet.');
  return issue(data.address, 'link', context.userId);
});
export const linkVerifiedWallet = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(d => proofSchema.parse(d)).handler(async ({ data, context }) => {
  const { data: identity, error: identityError } = await context.supabase.auth.getUser();
  if (identityError || !identity.user?.email_confirmed_at) throw new Error('Verify your email before linking a wallet.');
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
  const { admin, address } = await consume(data.id, data.signature, 'login', null);
  const { data: mapping, error } = await admin.from('bix_wallet_identities').select('user_id').eq('address', address).maybeSingle();
  if (error || !mapping) throw new Error('Sign in with email first, then link this wallet in Wallet.');
  const { data: identity, error: identityError } = await admin.auth.admin.getUserById(mapping.user_id);
  const user = identity.user;
  if (identityError || !user?.email || !user.email_confirmed_at || (user.banned_until && new Date(user.banned_until).getTime() > Date.now())) throw new Error('This account is not eligible for wallet sign-in.');
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.email });
  if (linkError || !link.properties?.hashed_token) throw new Error('Could not start your member session.');
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('Wallet sign-in is temporarily unavailable.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (h.get('Authorization') === `Bearer ${key}` && key.startsWith('sb_')) h.delete('Authorization'); h.set('apikey', key); return fetch(input, { ...init, headers: h }); } } });
  const { data: signed, error: signError } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' });
  if (signError || !signed.session || signed.user?.id !== mapping.user_id) throw new Error('Could not start your member session.');
  return { access_token: signed.session.access_token, refresh_token: signed.session.refresh_token };
});