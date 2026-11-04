export type BookOffer = { id: string; user_id: string; side: string; price_usd: number; remaining_bix: number };

/**
 * Express trade picks ONE best counter-offer (atomic single take via bix_p2p_take).
 * Buying BIX takes the cheapest SELL offer; selling BIX takes the highest BUY offer.
 * The member's own offers are never matched.
 */
export function bestOffer(offers: BookOffer[], want: 'BUY' | 'SELL', me: string): BookOffer | null {
  const counter = offers.filter(o => o.side === (want === 'BUY' ? 'SELL' : 'BUY') && o.user_id !== me && Number(o.remaining_bix) > 0);
  if (!counter.length) return null;
  counter.sort((a, b) => want === 'BUY' ? Number(a.price_usd) - Number(b.price_usd) : Number(b.price_usd) - Number(a.price_usd));
  return counter[0] ?? null;
}

/** Max BIX the member can trade on that offer, limited by offer size and their own balance. */
export function expressMax(offer: BookOffer, want: 'BUY' | 'SELL', bal: { bix: number; usdt: number }): number {
  const cap = want === 'BUY' ? bal.usdt / Number(offer.price_usd) : bal.bix;
  return Math.max(0, Math.floor(Math.min(Number(offer.remaining_bix), cap) * 100) / 100);
}
