import { createServerFn } from '@tanstack/react-start';

const SHORT_HOSTS = new Set(['vt.tiktok.com', 'vm.tiktok.com', 'www.tiktok.com', 'tiktok.com']);

// Resolves TikTok short links (vt./vm.tiktok.com, tiktok.com/t/...) to the full /video/<id> URL.
// Hosts are allowlisted so this cannot be used to fetch arbitrary URLs.
export const resolveBixtokLinks = createServerFn({ method: 'POST' })
  .inputValidator((d: { urls: string[] }) => ({ urls: (Array.isArray(d?.urls) ? d.urls : []).filter(u => typeof u === 'string').slice(0, 30) }))
  .handler(async ({ data }) => {
    const out: Record<string, string> = {};
    await Promise.all(data.urls.map(async (u) => {
      try {
        const x = new URL(u);
        if (x.protocol !== 'https:' || !SHORT_HOSTS.has(x.hostname)) return;
        if (/\/video\/\d+/.test(x.pathname)) return;
        const r = await fetch(u, { method: 'HEAD', redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0' } });
        const loc = r.headers.get('location');
        if (loc && /tiktok\.com\/.*\/(video|photo)\/\d+/.test(loc)) out[u] = loc;
      } catch { /* ignore */ }
    }));
    return out;
  });
