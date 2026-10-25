import { describe, expect, it } from 'vitest';
import { detectCountry, toE164, orderCountries, filterCountries } from '@/lib/phone-country';

describe('whatsapp number', () => {
  it('detects Indonesia from Makassar timezone', () => expect(detectCountry('Asia/Makassar')).toBe('ID'));
  it('strips leading zero', () => expect(toE164('62', '0812-3456-789')).toBe('+628123456789'));
  it('does not duplicate dial code', () => expect(toE164('62', '+62 812 3456 789')).toBe('+628123456789'));
  it('rejects too short numbers', () => expect(toE164('62', '0812')).toBeNull());
  it('orders default, China, Singapore first', () => expect(orderCountries('ID').slice(0, 3).map(c => c.iso)).toEqual(['ID', 'CN', 'SG']));
  it('searches by country name', () => expect(filterCountries(orderCountries('ID'), 'mala').map(c => c.iso)).toEqual(['MY']));
});
