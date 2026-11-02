import { describe, expect, it } from 'vitest';
import { rankForYou } from '@/lib/bixtok-foryou';

const v = (id: string, creator: string, likes: number, caption = '') => ({ id, creator_id: creator, caption, likes });

describe('For You ranking', () => {
  it('puts creators the member interacts with ahead of equally popular posts', () => {
    const out = rankForYou([v('a', 'x', 10), v('b', 'y', 10)], { creators: { y: 10 }, tags: {}, seen: {} }, new Set());
    expect(out.map(x => x.id)).toEqual(['b', 'a']);
  });
  it('pushes recently watched posts below unseen ones', () => {
    const now = Date.now();
    const out = rankForYou([v('a', 'x', 100), v('b', 'y', 1)], { creators: {}, tags: {}, seen: { a: now - 1000 } }, new Set(), now);
    expect(out.map(x => x.id)).toEqual(['b', 'a']);
  });
});
