import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export type GlobalMarket = { id: string; symbol: string; name: string; price: number; change24h: number; marketCap: number; sparkline: number[] };

const ASSETS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', pair: 'BTCUSDT' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', pair: 'ETHUSDT' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', pair: 'BNBUSDT' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', pair: 'SOLUSDT' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', pair: 'DOGEUSDT' },
] as const;

async function getGlobalMarkets(): Promise<GlobalMarket[]> {
  try {
    const symbols = encodeURIComponent(JSON.stringify(ASSETS.map(asset => asset.pair)));
    const [tickerResponse, ...chartResponses] = await Promise.all([
      fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbols}`, { headers: { accept: 'application/json', 'user-agent': 'BIXLINK-Market/1.0' } }),
      ...ASSETS.map(asset => fetch(`https://api.binance.com/api/v3/klines?symbol=${asset.pair}&interval=1h&limit=24`, { headers: { accept: 'application/json', 'user-agent': 'BIXLINK-Market/1.0' } })),
    ]);
    if (!tickerResponse.ok || chartResponses.some(response => !response.ok)) return [];
    const tickers = await tickerResponse.json() as Array<Record<string, string>>;
    const charts = await Promise.all(chartResponses.map(response => response.json() as Promise<Array<Array<number | string>>>));
    return ASSETS.map((asset, index) => {
      const ticker = tickers.find(row => row['symbol'] === asset.pair);
      return { id: asset.id, symbol: asset.symbol, name: asset.name, price: Number(ticker?.['lastPrice'] ?? 0), change24h: Number(ticker?.['priceChangePercent'] ?? 0), marketCap: 0, sparkline: charts[index]?.map(row => Number(row[4])).filter(Number.isFinite) ?? [] };
    }).filter(asset => asset.price > 0);
  } catch (error) {
    console.error('Global market feed unavailable', error);
    return [];
  }
}

export const getHomeMarketData = createServerFn({ method: 'GET' }).handler(async () => {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
  const client = createClient<Database>(process.env['SUPABASE_URL']!, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization'); headers.set('apikey', key); return fetch(input, { ...init, headers }); } } });
  const [{ data: stats, error }, { data: marketSetting }, markets] = await Promise.all([client.rpc('bix_public_home_stats'), client.from('app_settings').select('value').eq('key', 'bix_market').maybeSingle(), getGlobalMarkets()]);
  if (error) throw error;
  const configuredPrice = Number((marketSetting?.value as { priceUsd?: number } | null)?.priceUsd ?? 0.84291);
  const bixPriceUsd = Number.isFinite(configuredPrice) && configuredPrice > 0 ? configuredPrice : 0.84291;
  return { stats, bixPriceUsd, markets, marketUpdatedAt: markets.length ? new Date().toISOString() : null };
});