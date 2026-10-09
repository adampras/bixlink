import { createServerFn } from '@tanstack/react-start';

type Sentiment = { value: number; label: string; updatedAt: string } | null;
let cache: { at: number; data: Sentiment } | null = null;

// Public Crypto Fear & Greed Index (alternative.me), no API key, cached 60 minutes.
export const getMarketSentiment = createServerFn({ method: 'GET' }).handler(async (): Promise<Sentiment> => {
  if (cache && Date.now() - cache.at < 3_600_000) return cache.data;
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', { headers: { accept: 'application/json' } });
    if (!res.ok) return cache?.data ?? null;
    const json = await res.json() as { data?: Array<{ value: string; value_classification: string; timestamp: string }> };
    const row = json.data?.[0];
    const data: Sentiment = row ? { value: Number(row.value), label: row.value_classification, updatedAt: new Date(Number(row.timestamp) * 1000).toISOString() } : null;
    cache = { at: Date.now(), data };
    return data;
  } catch {
    return cache?.data ?? null;
  }
});
