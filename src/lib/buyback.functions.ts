import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { buybackAmountSchema } from '@/lib/transaction-limits';

async function canReview(supabase: any) {
  const [a, r] = await Promise.all([supabase.rpc('is_bix_admin'), supabase.rpc('bix_reviewer_can', { p_section: 'market' })]);
  return Boolean(a.data) || Boolean(r.data);
}

export const getBuyback = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { supabase, userId } = context;
  const [bal, mine, owner] = await Promise.all([
    supabase.rpc('bix_asset_balances', { p_user: userId }).single(),
    supabase.from('swap_requests').select('id,amount_in,amount_out,status,created_at,reviewed_at').eq('user_id', userId).eq('channel', 'buyback').order('created_at', { ascending: false }).limit(20),
    canReview(supabase),
  ]);
  let queue: any[] = [];
  if (owner) {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: rows } = await supabaseAdmin.from('swap_requests').select('id,user_id,amount_in,amount_out,status,created_at').eq('channel', 'buyback').order('created_at', { ascending: false }).limit(100);
    const ids = (rows ?? []).map(r => r.id); const users = [...new Set((rows ?? []).map(r => r.user_id))];
    const [det, prof, codes] = await Promise.all([
      ids.length ? supabaseAdmin.from('bix_buyback_details').select('*').in('swap_id', ids) : Promise.resolve({ data: [] as any[] }),
      users.length ? supabaseAdmin.from('profiles').select('user_id,username').in('user_id', users) : Promise.resolve({ data: [] as any[] }),
      users.length ? supabaseAdmin.from('referral_codes').select('user_id,code').in('user_id', users) : Promise.resolve({ data: [] as any[] }),
    ]);
    queue = (rows ?? []).map(r => ({ ...r, detail: det.data?.find((d: any) => d.swap_id === r.id) ?? null, username: prof.data?.find((p: any) => p.user_id === r.user_id)?.username ?? '-', code: codes.data?.find((c: any) => c.user_id === r.user_id)?.code ?? '-' }));
  }
  return { bixBalance: Number((bal.data as any)?.bix_balance ?? 0), mine: mine.data ?? [], owner, queue };
});

export const requestBuyback = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { amount: number; method: 'email' | 'telegram' | 'whatsapp'; contact: string }) => z.object({ amount: buybackAmountSchema, method: z.enum(['email', 'telegram', 'whatsapp']), contact: z.string().trim().min(3).max(120) }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc('bix_buyback_request', { p_amount: data.amount, p_method: data.method, p_contact: data.contact });
    if (error) throw new Error(error.message);
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const { sendAll, readToggles } = await import('@/lib/notify.server');
      const { data: p } = await supabaseAdmin.from('profiles').select('username').eq('user_id', context.userId).maybeSingle();
      const { data: d } = await supabaseAdmin.from('bix_buyback_details').select('source').eq('swap_id', id as string).maybeSingle();
      const s = (d?.source ?? {}) as Record<string, unknown>;
      const esc = (v: unknown) => String(v ?? '').replace(/[&<>]/g, '');
      await sendAll([
        '<b>⚡ PENJUALAN BIX · DEV BUYBACK $0.25</b>',
        `Member: <b>${esc(p?.username ?? '-')}</b>`,
        `Jumlah: <b>${data.amount} BIX</b> → $${(data.amount * 0.25).toFixed(2)} USDT`,
        `Konfirmasi via ${data.method}: <code>${esc(data.contact)}</code>`,
        `Sumber: profit staking ${Number(s['staking_profit'] ?? 0).toFixed(2)} · bonus ${Number(s['network_bonus'] ?? 0).toFixed(2)} · alokasi ${Number(s['allocation'] ?? 0).toFixed(2)} · transfer masuk ${Number(s['transfer_in'] ?? 0).toFixed(2)}${s['is_clone'] ? ' · ⚠️ CLONE' : ''}`,
        'Review: https://bixlink.com/buyback',
      ].join('\n'), await readToggles(supabaseAdmin));
    } catch (e) { console.error('buyback-notify', e); }
    return { id };
  });

export const reviewBuyback = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; approve: boolean; note?: string }) => z.object({ id: z.string().uuid(), approve: z.boolean(), note: z.string().max(200).optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc('bix_buyback_review', { p_id: data.id, p_approve: data.approve, p_note: data.note ?? '' });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
