export type ReceivedGift = {
  id: string; gift_name: string; currency: string; amount: number; gross_amount: number;
  created_at: string; claimed_at: string | null; video_id: string | null; live_id: string | null;
  sender: string;
};

/** Notification acknowledgements never change claimed_at or wallet balances. */
export function unseenGifts(rows: ReceivedGift[], seen: readonly string[]): ReceivedGift[] {
  const ids = new Set(seen);
  return rows.filter(row => !ids.has(row.id));
}

export function giftTotals(rows: ReceivedGift[]): { bix: number; bixp: number } {
  return rows.reduce((total, row) => {
    if (row.currency === 'BIX') total.bix += Number(row.amount);
    if (row.currency === 'BIXP') total.bixp += Number(row.amount);
    return total;
  }, { bix: 0, bixp: 0 });
}

export function mergeGiftSeen(previous: readonly string[], ids: readonly string[]): string[] {
  return [...new Set([...ids, ...previous])].slice(0, 2000);
}

export const giftSeenKey = (userId: string) => `bixtok-gift-seen-v1:${userId}`;

export function readGiftSeen(userId: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(giftSeenKey(userId)) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch { return []; }
}