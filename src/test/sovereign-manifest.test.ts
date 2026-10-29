import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('independent wallet home-screen launch', () => {
  const manifest = JSON.parse(readFileSync('public/sovereign.webmanifest', 'utf8'));
  it('preserves the installed wallet identity and launch path', () => {
    expect(manifest.id).toBe('/sovereign-wallet');
    expect(manifest.start_url).toBe('/sovereign-wallet');
    expect(manifest.scope).toBe('/sovereign-wallet');
    expect(manifest.display).toBe('standalone');
  });
});