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

/** LiveKit token for a BIX group meeting room; requires an open room and the caller's voice (or video) tier. */
export const getBixRoomToken = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => {
    if (!input || typeof input.code !== 'string' || !/^[A-Z0-9]{6}$/.test(input.code)) throw new Error('Invalid room code');
    return { code: input.code };
  })
  .handler(async ({ data, context }) => {
    const url = process.env['LIVEKIT_URL'];
    const key = process.env['LIVEKIT_API_KEY'];
    const secret = process.env['LIVEKIT_API_SECRET'];
    if (!url || !key || !secret) throw new Error('Call server not ready');
    // Room code is the join secret: look it up server-side after auth (rooms are not listable by everyone).
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: room } = await supabaseAdmin.from('bix_call_rooms').select('id, host_id, title, video, status').eq('code', data.code).maybeSingle();
    if (!room || room.status !== 'open') throw new Error('Room not found or already closed');
    const { data: tier } = await context.supabase.rpc('bix_comm_me' as never);
    const t = tier as { voice?: boolean; video?: boolean } | null;
    if (!t?.voice) throw new Error('Group calls require CALLER tier ($30 active staking)');
    const { data: prof } = await context.supabase.from('profiles').select('username').eq('user_id', context.userId).maybeSingle();
    const { AccessToken } = await import('livekit-server-sdk');
    const at = new AccessToken(key, secret, { identity: context.userId, name: prof?.username ?? 'Member', ttl: '3h' });
    at.addGrant({ room: `bixroom-${room.id}`, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
    return { url, token: await at.toJwt(), title: room.title, video: room.video && !!t.video, isHost: room.host_id === context.userId, id: room.id };
  });
