import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const sitemap = readFileSync('public/sitemap.xml', 'utf8');
const guide = readFileSync('public/llms.txt', 'utf8');
const robots = readFileSync('public/robots.txt', 'utf8');

describe('Public ecosystem crawler scope', () => {
  it('keeps account-only endpoints out of the sitemap and AI link list', () => {
    const sitemapPaths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].flatMap(m => m[1] ? [new URL(m[1]).pathname] : []);
    const guidePaths = [...guide.matchAll(/^- \[[^\]]+\]\(([^)]+)\)/gm)].map(m => m[1]);
    for (const path of ['/admin', '/auth', '/register', '/call', '/bixtok', '/pay', '/profile', '/wallet']) {
      expect(sitemapPaths).not.toContain(path);
      expect(guidePaths).not.toContain(path);
    }
    expect(sitemapPaths).toContain('/ecosystem');
    expect(guidePaths).toContain('/ecosystem');
  });
  it('allows public AI reading without removing private-surface exclusions', () => {
    for (const agent of ['GPTBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', '*']) {
      const block = robots.split(/\n\s*\n/).find(s => s.startsWith(`User-agent: ${agent}\n`));
      expect(block).toBeDefined();
      expect(block).toContain('Allow: /');
      expect(block).not.toMatch(/^Disallow: \/$/m);
      expect(block).toContain('Disallow: /admin');
      expect(block).toContain('Disallow: /pay');
    }
  });
});