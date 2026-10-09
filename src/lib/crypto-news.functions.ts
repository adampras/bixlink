import { createServerFn } from '@tanstack/react-start';

export type TrendingCoin = { id: string; symbol: string; name: string; image: string; price: number; change24h: number };
export type NewsItem = { title: string; link: string; source: string; published: string };
export type CryptoFeed = { coins: TrendingCoin[]; news: NewsItem[]; updatedAt: string };

const TTL = 60 * 60 * 1000;
let cache: { at: number; data: CryptoFeed } | null = null;

const FEEDS = [
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk' },
  { url: 'https://cointelegraph.com/rss', source: 'Cointelegraph' },
];

function decode(s: string) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, '').trim();
}

async function loadNews(): Promise<NewsItem[]> {
  const all = await Promise.all(FEEDS.map(async f => {
    try {
      const r = await fetch(f.url, { headers: { 'User-Agent': 'BIXLINK/1.0' } });
      if (!r.ok) return [];
      const xml = await r.text();
      return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8).map(m => {
        const pick = (tag: string) => decode((m[1] ?? "").match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? '');
        return { title: pick('title'), link: pick('link'), source: f.source, published: new Date(pick('pubDate') || Date.now()).toISOString() };
      }).filter(n => n.title && /^https?:\/\//.test(n.link));
    } catch { return []; }
  }));
  return all.flat().sort((a, b) => b.published.localeCompare(a.published)).slice(0, 8);
}

async function loadCoins(): Promise<TrendingCoin[]> {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=1&price_change_percentage=24h', { headers: { accept: 'application/json' } });
    if (!r.ok) return [];
    const rows = (await r.json()) as Array<{ id: string; symbol: string; name: string; image: string; current_price: number; price_change_percentage_24h: number }>;
    return rows
      .filter(c => !['usdt', 'usdc', 'dai', 'fdusd', 'usde', 'steth', 'wsteth', 'wbtc', 'weth'].includes(String(c.symbol)))
      .map(c => ({ id: String(c.id), symbol: String(c.symbol).toUpperCase(), name: String(c.name), image: String(c.image), price: Number(c.current_price) || 0, change24h: Number(c.price_change_percentage_24h) || 0 }))
      .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
      .slice(0, 8);
  } catch { return []; }
}

export const getCryptoFeed = createServerFn({ method: 'GET' }).handler(async (): Promise<CryptoFeed> => {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  const [coins, news] = await Promise.all([loadCoins(), loadNews()]);
  const data = { coins, news, updatedAt: new Date().toISOString() };
  if (coins.length || news.length) cache = { at: Date.now(), data };
  return cache?.data ?? data;
});
