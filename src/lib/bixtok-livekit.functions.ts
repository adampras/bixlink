import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

/** Issues a LiveKit room token for a BIXTOK LIVE: only the host may publish; viewers subscribe only. */
export const getBixtokLiveToken = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { liveId: string }) => {
    if (!input || typeof input.liveId !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.liveId)) throw new Error('Invalid live');
    return { liveId: input.liveId };
  })
  .handler(async ({ data, context }) => {
    const url = process.env['LIVEKIT_URL'];
    const key = process.env['LIVEKIT_API_KEY'];
    const secret = process.env['LIVEKIT_API_SECRET'];
    if (!url || !key || !secret) return { ok: false as const };
    const { data: live } = await context.supabase.from('bixtok_lives').select('id, host_id, status').eq('id', data.liveId).maybeSingle();
    if (!live || live.status !== 'live') throw new Error('LIVE not active');
    const isHost = live.host_id === context.userId;
    const { AccessToken } = await import('livekit-server-sdk');
    const at = new AccessToken(key, secret, { identity: context.userId, ttl: '4h' });
    at.addGrant({ room: `bixtok-${live.id}`, roomJoin: true, canPublish: isHost, canSubscribe: true, canPublishData: false });
    return { ok: true as const, url, token: await at.toJwt(), host: isHost };
  });
