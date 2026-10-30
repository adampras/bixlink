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

// Fetches a watermark-free MP4 for full TikTok video URLs via a public resolver.
// Only tiktok.com URLs are accepted; on any failure the caller falls back to the official embed.
export const cleanTiktokVideos = createServerFn({ method: 'POST' })
  .inputValidator((d: { urls: string[] }) => ({ urls: (Array.isArray(d?.urls) ? d.urls : []).filter(u => typeof u === 'string' && /^https:\/\/(www\.)?tiktok\.com\/.+\/video\/\d+/.test(u)).slice(0, 12) }))
  .handler(async ({ data }) => {
    const out: Record<string, string> = {};
    for (const u of data.urls) {
      try {
        const r = await fetch(`https://www.tikwm.com/api/?hd=1&url=${encodeURIComponent(u)}`, { headers: { 'user-agent': 'Mozilla/5.0' } });
        const j = await r.json() as { code?: number; data?: { play?: string; hdplay?: string } };
        const play = j?.data?.hdplay || j?.data?.play;
        if (j?.code === 0 && play && /^https:\/\//.test(play)) out[u] = play;
      } catch { /* fallback to embed */ }
    }
    return out;
  });
