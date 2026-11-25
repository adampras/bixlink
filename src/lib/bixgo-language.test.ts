import { describe, expect, it } from 'vitest';
import { bixgoLanguage, BIXGO_LANGUAGES, orderCategory, orderQueue } from './bixgo-language';

describe('BIXGO two-language preference', () => {
  it('offers exactly Indonesian and English', () => { expect([...BIXGO_LANGUAGES]).toEqual(['id', 'en']); });
  it('preserves Indonesian and English choices', () => { expect(bixgoLanguage('id')).toBe('id'); expect(bixgoLanguage('en')).toBe('en'); });
  it('uses English in BIXGO when another ecosystem language is selected', () => { expect(bixgoLanguage('zh')).toBe('en'); });
});
describe('existing order grouping', () => {
  it('keeps pending orders in the new kitchen queue', () => expect(orderQueue('pending')).toBe('new'));
  it('keeps accepted and ready orders in preparation', () => { expect(orderQueue('accepted')).toBe('preparing'); expect(orderQueue('ready')).toBe('preparing'); });
  it('keeps all terminal states in history', () => { for (const status of ['completed', 'rejected', 'cancelled']) expect(orderQueue(status)).toBe('history'); });
  it('separates passenger, food and goods orders', () => { expect(orderCategory('ride')).toBe('people'); expect(orderCategory('car')).toBe('people'); expect(orderCategory('food')).toBe('food'); expect(orderCategory('send')).toBe('goods'); expect(orderCategory('mart')).toBe('goods'); });
});