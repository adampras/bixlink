import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

/** Issues a LiveKit token for a 1-on-1 BIX CALL; only the two participants of a live call may join. */
export const getBixCallToken = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { callId: string }) => {
    if (!input || typeof input.callId !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.callId)) throw new Error('Invalid call');
    return { callId: input.callId };
  })
  .handler(async ({ data, context }) => {
    const url = process.env['LIVEKIT_URL'];
    const key = process.env['LIVEKIT_API_KEY'];
    const secret = process.env['LIVEKIT_API_SECRET'];
    if (!url || !key || !secret) return { ok: false as const };
    const { data: call } = await context.supabase.from('bix_calls').select('id, caller_id, callee_id, status').eq('id', data.callId).maybeSingle();
    if (!call || (call.caller_id !== context.userId && call.callee_id !== context.userId)) throw new Error('Call not found');
    if (call.status !== 'ringing' && call.status !== 'accepted') throw new Error('Call ended');
    const { AccessToken } = await import('livekit-server-sdk');
    const at = new AccessToken(key, secret, { identity: context.userId, ttl: '2h' });
    at.addGrant({ room: `bixcall-${call.id}`, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: false });
    return { ok: true as const, url, token: await at.toJwt() };
  });
