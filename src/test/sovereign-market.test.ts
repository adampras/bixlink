import { describe, expect, it } from 'vitest';
import { marketScope, readMarketSnapshot } from '@/lib/sovereign-market';
describe('Sovereign market boundaries', () => {
  it('limits the ecosystem to BIX, USDT and BNB', () => { expect(['BIX', 'USDT', 'BNB', 'BTC'].filter(s => marketScope(s, 'ecosystem', []))).toEqual(['BIX', 'USDT', 'BNB']); });
  it('only shows selected watchlist symbols', () => { expect(marketScope('BTC', 'watchlist', ['BNB'])).toBe(false); expect(marketScope('BNB', 'watchlist', ['BNB'])).toBe(true); });
  it('keeps snapshot time and rejects malformed cache', () => { expect(readMarketSnapshot('{bad')).toBeNull(); expect(readMarketSnapshot('{"savedAt":123,"data":[4]}')).toEqual({ savedAt: 123, data: [4] }); });
});