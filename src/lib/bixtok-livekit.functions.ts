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
    let guest = false;
    if (!isHost) {
      const { data: req } = await context.supabase.from('bixtok_stage_requests').select('status').eq('live_id', live.id).eq('user_id', context.userId).maybeSingle();
      guest = req?.status === 'approved';
    }
    const { AccessToken } = await import('livekit-server-sdk');
    const at = new AccessToken(key, secret, { identity: context.userId, ttl: '4h' });
    at.addGrant({ room: `bixtok-${live.id}`, roomJoin: true, canPublish: isHost || guest, canSubscribe: true, canPublishData: false });
    return { ok: true as const, url, token: await at.toJwt(), host: isHost, guest };
  });

/** Creates (or reuses) a LiveKit RTMP ingress so the LIVE host can broadcast from OBS / PRISM Live Studio. Host only. */
export const getBixtokStudioIngress = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { liveId: string; reset?: boolean }) => {
    if (!input || typeof input.liveId !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.liveId)) throw new Error('Invalid live');
    return { liveId: input.liveId, reset: !!input.reset };
  })
  .handler(async ({ data, context }) => {
    const url = process.env['LIVEKIT_URL'];
    const key = process.env['LIVEKIT_API_KEY'];
    const secret = process.env['LIVEKIT_API_SECRET'];
    if (!url || !key || !secret) return { ok: false as const, error: 'Broadcast service is not configured.' };
    const { data: live } = await context.supabase.from('bixtok_lives').select('id, host_id, status').eq('id', data.liveId).maybeSingle();
    if (!live || live.status !== 'live') throw new Error('LIVE not active');
    if (live.host_id !== context.userId) throw new Error('Only the host can get a stream key');
    const { IngressClient, IngressInput } = await import('livekit-server-sdk');
    const client = new IngressClient(url.replace(/^wss?:/, 'https:'), key, secret);
    const room = `bixtok-${live.id}`;
    try {
      const existing = await client.listIngress({ roomName: room });
      const mine = existing.filter(i => i.participantIdentity === `obs-${context.userId}`);
      if (data.reset) for (const i of mine) await client.deleteIngress(i.ingressId).catch(() => {});
      let ing = data.reset ? undefined : mine[0];
      if (!ing) ing = await client.createIngress(IngressInput.RTMP_INPUT, { name: room, roomName: room, participantIdentity: `obs-${context.userId}`, participantName: 'Studio' });
      return { ok: true as const, server: ing.url ?? '', streamKey: ing.streamKey ?? '' };
    } catch (e) {
      console.error('ingress', e);
      return { ok: false as const, error: 'Stream Key is not available yet. The RTMP feature must be enabled in the broadcast service package.' };
    }
  });
