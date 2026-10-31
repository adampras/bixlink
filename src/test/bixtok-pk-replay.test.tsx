import { describe, expect, it } from 'vitest';
import { pkWinner, SOUNDBOARD, SHOWCASE } from '@/components/BixtokLiveRoom';
import { pickReplayMime, REPLAY_PART_BYTES } from '@/lib/bixtok-replay';
import { countdown } from '@/routes/bixtok';

describe('BIXTOK PK, replay and schedule rules', () => {
  it('PK winner is the higher score and a tie has no winner', () => {
    expect(pkWinner(120, 80)).toBe('a');
    expect(pkWinner(10, 300)).toBe('b');
    expect(pkWinner(50, 50)).toBeNull();
  });
  it('replay parts stay below the 50 MB media limit', () => {
    expect(REPLAY_PART_BYTES).toBeLessThan(50 * 1024 * 1024);
  });
  it('replay prefers webm and falls back to mp4 (iPhone)', () => {
    expect(pickReplayMime(m => m === 'video/mp4')).toBe('video/mp4');
    expect(pickReplayMime(() => true)).toBe('video/webm;codecs=vp8,opus');
    expect(pickReplayMime(() => false)).toBeUndefined();
  });
  it('countdown shows days for far events and starting now when due', () => {
    expect(countdown(0)).toBe('Starting now');
    expect(countdown(2 * 86400_000 + 3 * 3600_000)).toBe('2d 3h 0m');
    expect(countdown(65_000)).toBe('00:01:05');
  });
  it('soundboard has four sounds and showcase links stay inside the app', () => {
    expect(SOUNDBOARD.map(s => s[0])).toEqual(['applause', 'trumpet', 'coin', 'cheer']);
    expect(Object.values(SHOWCASE).every(s => s.to.startsWith('/'))).toBe(true);
  });
});
