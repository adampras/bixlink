import { describe, expect, it } from 'vitest';
import { giftSeenKey, giftTotals, mergeGiftSeen, unseenGifts, type ReceivedGift } from '@/lib/bixtok-received-gifts';

const gift: ReceivedGift = { id: 'gift-1', gift_name: 'The King', currency: 'BIX', amount: 90, gross_amount: 100, created_at: '2026-11-24T07:00:00Z', claimed_at: null, video_id: 'video-1', live_id: null, sender: 'member' };
describe('received gift notifications', () => {
  it('does not replay a gift already acknowledged', () => {
    expect(unseenGifts([gift, { ...gift, id: 'gift-2' }], ['gift-1']).map(g => g.id)).toEqual(['gift-2']);
  });
  it('keeps BIX and BIXP separate and uses the recorded net amount', () => {
    expect(giftTotals([gift, { ...gift, id: 'points', currency: 'BIXP', amount: 4.5, gross_amount: 5 }])).toEqual({ bix: 90, bixp: 4.5 });
  });
  it('acknowledgement never claims a gift or modifies its amount', () => {
    expect(mergeGiftSeen(['old', 'gift-1'], ['gift-1'])).toEqual(['gift-1', 'old']);
    expect(gift.claimed_at).toBeNull();
    expect(gift.amount).toBe(90);
  });
  it('isolates acknowledgements between member accounts', () => {
    expect(giftSeenKey('member-1')).not.toBe(giftSeenKey('member-2'));
  });
});