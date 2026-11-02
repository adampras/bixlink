import { savePushSubscription, notifyBixPush } from '@/lib/bix-push.functions';

export const VAPID_PUBLIC = 'BHpThAFNIMaoaJ1j-YyVvdOTcghj1BqT9X4y0H3rO3kxn8Gl-A44PIziJTjHM1L9xoVV2qErrD1yWvx1G2bslus';
const b64 = (s: string) => { const p = '='.repeat((4 - s.length % 4) % 4); const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, c => c.charCodeAt(0)); };

/** Registers the messaging worker and stores this device's push subscription. Safe to call repeatedly. */
export async function ensureBixPush() {
  try {
    if (typeof window === 'undefined' || window.self !== window.top) return false;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || Notification.permission !== 'granted') return false;
    const reg = await navigator.serviceWorker.register('/bix-push-sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC) });
    const j = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!j.endpoint || !j.keys?.p256dh || !j.keys.auth) return false;
    await savePushSubscription({ data: { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth } });
    return true;
  } catch { return false; }
}

/** Fire-and-forget closed-app notification to the other member. */
export function pushNotify(type: 'chat' | 'call', id: string | undefined | null) {
  if (!id) return;
  void notifyBixPush({ data: { type, id } }).catch(() => { /* best effort */ });
}
