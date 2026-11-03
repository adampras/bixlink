import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createManualAccount } from '@/lib/manual-registration';
import { passwordValid, PASSWORD_HINT } from '@/lib/password-rule';

export const registerManualAccount = createServerFn({ method: 'POST' })
  .inputValidator(input => z.object({
    email: z.string().trim().email().max(254),
    password: z.string().max(200).refine(passwordValid, PASSWORD_HINT),
    fullName: z.string().trim().min(2).max(80),
    username: z.string().regex(/^[a-z0-9_.]{3,24}$/),
    whatsapp: z.string().regex(/^\+[1-9]\d{6,14}$/),
    country: z.string().regex(/^[A-Z]{2}$/),
  }).strict().parse(input))
  .handler(async ({ data }) => {
    const { getRequest } = await import('@tanstack/react-start/server');
    const origin = new URL(getRequest().url).origin;
    const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
    const client = createClient(process.env['SUPABASE_URL']!, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data: available, error } = await client.rpc('bix_username_available', { p_username: data.username });
    if (error || !available) throw new Error('That username is unavailable.');
    return createManualAccount(
      () => client.auth.signUp({ email: data.email, password: data.password, options: {
        emailRedirectTo: `${origin}/auth?verified=1`,
        data: { full_name: data.fullName, username: data.username, whatsapp: data.whatsapp, whatsapp_country: data.country },
      } }),
      () => client.auth.signOut({ scope: 'local' }),
    );
  });