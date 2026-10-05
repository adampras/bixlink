import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export type GlobalMarket = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
};

export const getHomeMarketData = createServerFn({ method: 'GET' }).handler(async () => {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
  const client = createClient<Database>(process.env['SUPABASE_URL']!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
      headers.set('apikey', key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data: stats, error } = await client.rpc('bix_public_home_stats');
  if (error) throw error;

  let markets: GlobalMarket[] = [];
  let marketUpdatedAt: string | null = null;
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,binancecoin,solana,tether&order=market_cap_desc&sparkline=false&price_change_percentage=24h', { headers: { accept: 'application/json' } });
    if (response.ok) {
      const raw = await response.json() as Array<Record<string, unknown>>;
      markets = raw.map(item => ({
        id: String(item['id']),
        symbol: String(item['symbol']).toUpperCase(),
        name: String(item['name']),
        price: Number(item['current_price']),
        change24h: Number(item['price_change_percentage_24h'] ?? 0),
        marketCap: Number(item['market_cap'] ?? 0),
      }));
      marketUpdatedAt = new Date().toISOString();
    }
  } catch {
    markets = [];
  }
  return { stats, markets, marketUpdatedAt };
});