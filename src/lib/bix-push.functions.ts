import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const UUID = /^[0-9a-f-]{36}$/i;

/** Saves this device's push subscription for the signed-in member (moves it if the device changed account). */
export const savePushSubscription = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { endpoint: string; p256dh: string; auth: string }) => {
    if (!i || typeof i.endpoint !== 'string' || !i.endpoint.startsWith('https://') || i.endpoint.length > 1000) throw new Error('Invalid subscription');
    if (typeof i.p256dh !== 'string' || typeof i.auth !== 'string' || i.p256dh.length > 200 || i.auth.length > 100) throw new Error('Invalid subscription');
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await supabaseAdmin.from('bix_push_subscriptions').upsert({ endpoint: data.endpoint, user_id: context.userId, p256dh: data.p256dh, auth: data.auth }, { onConflict: 'endpoint' });
    return { ok: true };
  });

/** Sends a closed-app push to the other participant of a chat message or call the caller just created. */
export const notifyBixPush = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { type: 'chat' | 'call'; id: string }) => {
    if (!i || (i.type !== 'chat' && i.type !== 'call') || typeof i.id !== 'string' || !UUID.test(i.id)) throw new Error('Invalid');
    return i;
  })
  .handler(async ({ data, context }) => {
    const jwk = process.env['VAPID_PRIVATE_JWK'];
    if (!jwk) return { sent: 0 };
    let to = ''; let payload: Record<string, string>;
    if (data.type === 'chat') {
      const { data: m } = await context.supabase.from('bix_messages').select('sender_id, recipient_id, body, kind, created_at').eq('id', data.id).maybeSingle();
      if (!m || m.sender_id !== context.userId || Date.now() - new Date(m.created_at).getTime() > 120000) return { sent: 0 };
      to = m.recipient_id; payload = { type: 'chat', body: m.body.slice(0, 140), tag: `chat-${m.sender_id}`, url: `/call?chat=${m.sender_id}` };
    } else {
      const { data: c } = await context.supabase.from('bix_calls').select('caller_id, callee_id, kind, status, created_at').eq('id', data.id).maybeSingle();
      if (!c || c.caller_id !== context.userId || c.status !== 'ringing' || Date.now() - new Date(c.created_at).getTime() > 60000) return { sent: 0 };
      to = c.callee_id; payload = { type: 'call', body: c.kind === 'video' ? '📹 Incoming video call — tap to answer' : '📞 Incoming voice call — tap to answer', tag: `call-${data.id}`, url: '/call' };
    }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: prof } = await supabaseAdmin.from('profiles').select('username, full_name').eq('user_id', context.userId).maybeSingle();
    const who = `@${prof?.username || prof?.full_name || 'Member'}`;
    payload['title'] = data.type === 'call' ? `BIX CALL · ${who}` : `BIX CHAT · ${who}`;
    if (data.type === 'chat') payload['url'] += `&n=${encodeURIComponent(prof?.username || 'Member')}`;
    const { data: subs } = await supabaseAdmin.from('bix_push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', to).limit(10);
    if (!subs?.length) return { sent: 0 };
    const { buildPushHTTPRequest } = await import('@pushforge/builder');
    let sent = 0;
    await Promise.all(subs.map(async s => {
      try {
        const req = await buildPushHTTPRequest({ privateJWK: jwk, subscription: { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, message: { payload, adminContact: 'mailto:support@bixlink.com', options: { ttl: data.type === 'call' ? 45 : 86400, urgency: 'high' } } });
        const r = await fetch(req.endpoint, { method: 'POST', headers: req.headers, body: req.body });
        if (r.status === 404 || r.status === 410) await supabaseAdmin.from('bix_push_subscriptions').delete().eq('endpoint', s.endpoint);
        else if (r.ok) sent++;
      } catch (e) { console.error('push failed', e); }
    }));
    return { sent };
  });
