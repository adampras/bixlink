import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

// Owner 1 only: classify a member as Admin 1 or Admin 2 (Owner 2–5) network and optionally move their sponsor.
async function verifyOwner1(context: { supabase: any }) {
  const { data, error } = await context.supabase.rpc('bix_is_owner1');
  if (error || data !== true) throw new Error('Owner 1 access required');
}

async function resolveMember(admin: any, key: string): Promise<string | null> {
  const k = key.trim();
  if (/^[0-9a-f-]{36}$/i.test(k)) return k;
  const { data: rc } = await admin.from('referral_codes').select('user_id').ilike('code', k.replace(/[%_]/g, '')).maybeSingle();
  if (rc?.user_id) return rc.user_id;
  const { data: p } = await admin.from('profiles').select('user_id').ilike('username', k.replace(/[%_]/g, '')).limit(2);
  return p?.length === 1 ? p[0].user_id : null;
}

async function classify(admin: any, userId: string) {
  const [{ data: refs }, { data: roles }, { data: clones }] = await Promise.all([
    admin.from('referral_codes').select('user_id,referred_by,code'),
    admin.from('user_roles').select('user_id').eq('role', 'reviewer'),
    admin.from('bix_clone_accounts').select('user_id'),
  ]);
  const parent = new Map<string, string | null>(); const codes = new Map<string, string>();
  for (const r of refs ?? []) { parent.set(r.user_id, r.referred_by); codes.set(r.user_id, r.code); }
  const reviewers = (roles ?? []).map((r: any) => r.user_id as string);
  const chain: string[] = []; const seen = new Set<string>(); let cur = parent.get(userId) ?? null;
  while (cur && !seen.has(cur) && chain.length < 200) { seen.add(cur); chain.push(cur); cur = parent.get(cur) ?? null; }
  const idx = reviewers.includes(userId) ? -1 : chain.findIndex(id => reviewers.includes(id));
  const ownerNo = reviewers.includes(userId) ? reviewers.indexOf(userId) + 2 : idx >= 0 ? reviewers.indexOf(chain[idx]!) + 2 : 1;
  const ids = [userId, ...chain.slice(0, 6)];
  const { data: profs } = await admin.from('profiles').select('user_id,username,full_name').in('user_id', ids);
  const name = (id: string) => { const p = (profs ?? []).find((x: any) => x.user_id === id); return p?.username || p?.full_name || id.slice(0, 8); };
  return {
    userId, name: name(userId), code: codes.get(userId) ?? '', network: ownerNo === 1 ? 'Admin 1' : `Admin ${ownerNo}`,
    isClone: (clones ?? []).some((c: any) => c.user_id === userId),
    sponsors: chain.slice(0, 6).map(id => ({ id, name: name(id), code: codes.get(id) ?? '' })),
  };
}

export const trackMemberNetwork = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string }) => z.object({ key: z.string().trim().min(2).max(80) }).parse(d))
  .handler(async ({ context, data }) => {
    await verifyOwner1(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const id = await resolveMember(supabaseAdmin, data.key);
    if (!id) throw new Error('Member not found');
    return classify(supabaseAdmin, id);
  });

export const moveMemberNetwork = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; sponsorKey: string }) => z.object({ userId: z.string().uuid(), sponsorKey: z.string().trim().min(2).max(80) }).parse(d))
  .handler(async ({ context, data }) => {
    await verifyOwner1(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const sponsor = await resolveMember(supabaseAdmin, data.sponsorKey);
    if (!sponsor) throw new Error('New sponsor not found');
    if (sponsor === data.userId) throw new Error('A member cannot sponsor themselves');
    // Cycle guard: the new sponsor must not be inside the member's own downline.
    let cur: string | null = sponsor; const seen = new Set<string>();
    while (cur && !seen.has(cur) && seen.size < 500) {
      if (cur === data.userId) throw new Error('New sponsor is inside this member\'s downline');
      seen.add(cur);
      const { data: row }: { data: { referred_by: string | null } | null } = await supabaseAdmin.from('referral_codes').select('referred_by').eq('user_id', cur).maybeSingle();
      cur = row?.referred_by ?? null;
    }
    const { error } = await supabaseAdmin.from('referral_codes').update({ referred_by: sponsor }).eq('user_id', data.userId);
    if (error) throw new Error(error.message);
    return classify(supabaseAdmin, data.userId);
  });
