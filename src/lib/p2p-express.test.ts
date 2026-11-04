import { describe, expect, it } from 'vitest';
import { bestOffer, expressMax } from './p2p-express';

const book = [
  { id: 'a', user_id: 'x', side: 'SELL', price_usd: 0.46, remaining_bix: 500 },
  { id: 'b', user_id: 'me', side: 'SELL', price_usd: 0.40, remaining_bix: 900 },
  { id: 'c', user_id: 'y', side: 'SELL', price_usd: 0.45, remaining_bix: 200 },
  { id: 'd', user_id: 'z', side: 'BUY', price_usd: 0.44, remaining_bix: 300 },
  { id: 'e', user_id: 'w', side: 'BUY', price_usd: 0.42, remaining_bix: 1000 },
];

describe('express P2P', () => {
  it('buying takes the cheapest sell offer that is not mine', () => {
    expect(bestOffer(book, 'BUY', 'me')?.id).toBe('c');
  });
  it('selling takes the highest buy offer', () => {
    expect(bestOffer(book, 'SELL', 'me')?.id).toBe('d');
  });
  it('max is limited by USDT balance when buying', () => {
    expect(expressMax(book[2]!, 'BUY', { bix: 0, usdt: 45 })).toBe(100);
  });
  it('max is limited by offer size when selling', () => {
    expect(expressMax(book[3]!, 'SELL', { bix: 5000, usdt: 0 })).toBe(300);
  });
});
