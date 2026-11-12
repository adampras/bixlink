// Server-only FCM HTTP v1 sender via the connector gateway (service account never in app code).
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/firebase_messaging';

type Admin = { from: (t: 'bix_native_devices') => any };

/** Sends a high-priority data message to every native device of `userId`; deletes stale tokens. */
export async function sendFcmToUser(admin: Admin, userId: string, data: Record<string, string>, ttlSeconds: number) {
  const lovable = process.env['LOVABLE_API_KEY'];
  const conn = process.env['FIREBASE_MESSAGING_API_KEY'];
  if (!lovable || !conn) return 0;
  const { data: devices } = await admin.from('bix_native_devices').select('token').eq('user_id', userId).limit(10);
  if (!devices?.length) return 0;
  let sent = 0;
  await Promise.all((devices as { token: string }[]).map(async ({ token }) => {
    try {
      const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${lovable}`, 'X-Connection-Api-Key': conn, 'Content-Type': 'application/json' },
        // Notification block lets Android show + ring even when the app is fully closed (data-only is silent there).
        // Calls are data-only so the APK's BixCallService draws the WhatsApp-style Jawab/Tolak banner itself.
        body: JSON.stringify({ message: data['type'] === 'call'
          ? { token, data, android: { priority: 'HIGH', ttl: `${ttlSeconds}s` } }
          : { token, data,
          notification: { title: data['title'] || 'BIX CALL', body: data['body'] || '' },
          android: { priority: 'HIGH', ttl: `${ttlSeconds}s`, notification: {
            channel_id: data['type'] === 'call' ? 'bixcall_ring' : 'bixcall_chat', sound: 'default',
            default_vibrate_timings: true, notification_priority: data['type'] === 'call' ? 'PRIORITY_MAX' : 'PRIORITY_HIGH',
            visibility: 'PUBLIC', tag: data['callId'] ? `call-${data['callId']}` : undefined,
          } } } }),
      });
      if (res.ok) { sent++; return; }
      const body = await res.text();
      if (res.status === 404 || (res.status === 400 && body.includes('UNREGISTERED')) || body.includes('INVALID_ARGUMENT') && body.includes('registration')) {
        await admin.from('bix_native_devices').delete().eq('token', token);
      } else console.error(`FCM send failed [${res.status}]: ${body}`);
    } catch (e) { console.error('FCM send error', e); }
  }));
  return sent;
}
