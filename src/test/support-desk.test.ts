import { describe, expect, it } from 'vitest';
import { foxChatVisible, needsOperator, waLink } from '@/lib/support-desk';

describe('support desk', () => {
  it('FOX AI shows only on landing and home', () => {
    expect(foxChatVisible('/')).toBe(true);
    expect(foxChatVisible('/dashboard')).toBe(true);
    expect(foxChatVisible('/bixgo')).toBe(false);
    expect(foxChatVisible('/wallet')).toBe(false);
  });
  it('deposit and withdrawal issues escalate to an operator', () => {
    expect(needsOperator('deposit saya belum masuk')).toBe(true);
    expect(needsOperator('penarikan gagal')).toBe(true);
    expect(needsOperator('apa itu BIXGO?')).toBe(false);
  });
  it('local WA numbers become international', () => {
    expect(waLink('0812-345', 'hi')).toBe('https://wa.me/62812345?text=hi');
  });
});
