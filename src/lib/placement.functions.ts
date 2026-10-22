import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

/** Leader registers a new member placed directly under the leader or one of the leader's own downlines (Model A). */
export const registerPlacedMember = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { placementId: string; email: string; password: string; fullName: string; username: string }) => z.object({
    placementId: z.string().uuid(),
    email: z.string().trim().email().max(160),
    password: z.string().min(8).max(200).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
    fullName: z.string().trim().min(2).max(80),
    username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,24}$/),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    // Verify placement is the caller or inside the caller's downline (walk up sponsors, cycle-safe).
    let cur: string | null = data.placementId; const seen = new Set<string>(); let ok = false;
    while (cur && !seen.has(cur) && seen.size < 200) {
      if (cur === context.userId) { ok = true; break; }
      seen.add(cur);
      const { data: row }: { data: { referred_by: string | null } | null } = await supabaseAdmin.from('referral_codes').select('referred_by').eq('user_id', cur).maybeSingle();
      cur = (row?.referred_by as string | null) ?? null;
    }
    if (!ok) throw new Error('Posisi penempatan harus berada di jaringan Anda');
    const { data: free } = await supabaseAdmin.rpc('bix_username_available', { p_username: data.username });
    if (!free) throw new Error('Username sudah dipakai');
    const { data: u, error } = await supabaseAdmin.auth.admin.createUser({ email: data.email.toLowerCase(), password: data.password, email_confirm: true, user_metadata: { full_name: data.fullName, username: data.username } });
    if (error) throw new Error(error.message);
    const newId = u.user?.id;
    if (newId) await supabaseAdmin.from('referral_codes').update({ referred_by: data.placementId }).eq('user_id', newId).is('referred_by', null);
    return { ok: true };
  });
