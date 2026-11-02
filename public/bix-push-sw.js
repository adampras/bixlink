/* BIXLINK messaging worker: shows BIX CALL chat/call notifications while the app is closed. No page caching. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: 'BIX CALL', body: event.data ? event.data.text() : '' }; }
  const ring = d.type === 'call';
  event.waitUntil(self.registration.showNotification(d.title || 'BIX CALL', {
    body: d.body || '', tag: d.tag || 'bixcall', renotify: true,
    icon: '/favicon.png', badge: '/favicon.png',
    requireInteraction: ring, vibrate: ring ? [500, 250, 500, 250, 500, 250, 500] : [120, 60, 120],
    data: { url: d.url || '/call' },
    actions: ring ? [{ action: 'open', title: '📞 Buka panggilan' }] : [{ action: 'open', title: '💬 Balas' }],
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/call', self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if (new URL(c.url).origin === self.location.origin) { await c.focus(); try { await c.navigate(url); } catch { /* ignore */ } return; } }
    await self.clients.openWindow(url);
  })());
});
