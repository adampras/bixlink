import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

/** Sign in with email, member code (BIX-XXXXXX) or username. Never returns the resolved email. */
export const signInWithIdentifier = createServerFn({ method: 'POST' })
  .inputValidator((d) => z.object({ identifier: z.string().trim().min(2).max(120), password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const fail = { ok: false as const, error: 'Invalid login credentials' };
    let email = data.identifier.includes('@') ? data.identifier.toLowerCase() : '';
    if (!email) {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const id = data.identifier;
      let userId: string | null = null;
      const { data: rc } = await supabaseAdmin.from('referral_codes').select('user_id').eq('code', id.toUpperCase()).maybeSingle();
      userId = rc?.user_id ?? null;
      if (!userId) {
        const { data: pr } = await supabaseAdmin.from('profiles').select('user_id').ilike('username', id.replace(/[%_]/g, '')).maybeSingle();
        userId = (pr as { user_id?: string } | null)?.user_id ?? null;
      }
      if (!userId) return fail;
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
      email = u?.user?.email ?? '';
      if (!email) return fail;
    }
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient(process.env.SUPABASE_URL!, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (key.startsWith('sb_') && h.get('Authorization') === `Bearer ${key}`) h.delete('Authorization'); h.set('apikey', key); return fetch(input, { ...init, headers: h }); } },
    });
    const { data: s, error } = await client.auth.signInWithPassword({ email, password: data.password });
    if (error || !s.session) return { ok: false as const, error: error?.message ?? fail.error };
    return { ok: true as const, access_token: s.session.access_token, refresh_token: s.session.refresh_token };
  });
