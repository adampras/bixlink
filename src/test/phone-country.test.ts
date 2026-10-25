import { describe, expect, it } from 'vitest';
import { detectCountry, toE164 } from '@/lib/phone-country';

describe('whatsapp number', () => {
  it('detects Indonesia from Makassar timezone', () => expect(detectCountry('Asia/Makassar')).toBe('ID'));
  it('strips leading zero', () => expect(toE164('62', '0812-3456-789')).toBe('+628123456789'));
  it('does not duplicate dial code', () => expect(toE164('62', '+62 812 3456 789')).toBe('+628123456789'));
  it('rejects too short numbers', () => expect(toE164('62', '0812')).toBeNull());
});
