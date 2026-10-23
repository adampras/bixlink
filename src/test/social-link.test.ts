import { describe, expect, it } from 'vitest';
import { normalizeSocial } from '@/lib/social-link';

describe('normalizeSocial', () => {
  it('adds https to bare domains', () => expect(normalizeSocial('telegram', 't.me/bixlink')).toBe('https://t.me/bixlink'));
  it('turns an X handle into a link', () => expect(normalizeSocial('x', '@bixlink')).toBe('https://x.com/bixlink'));
  it('keeps full links', () => expect(normalizeSocial('x', 'https://x.com/a')).toBe('https://x.com/a'));
});
