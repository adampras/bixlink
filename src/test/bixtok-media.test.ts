import { describe, expect, it, vi, afterEach } from 'vitest';
import { classifyMediaError, openLiveMedia } from '@/lib/bixtok-media';

const err = (name: string) => Object.assign(new Error(name), { name });
afterEach(() => vi.unstubAllGlobals());

describe('BIXTOK LIVE camera opener', () => {
  it('tells blocked permission apart from a busy camera', () => {
    expect(classifyMediaError(err('NotAllowedError'))).toBe('blocked');
    expect(classifyMediaError(err('NotReadableError'))).toBe('busy');
  });

  it('keeps the host voice when the camera cannot open', async () => {
    const audioOnly = { getTracks: () => [] } as unknown as MediaStream;
    const gum = vi.fn(async (c: MediaStreamConstraints) => { if (c.video) throw err('NotFoundError'); return audioOnly; });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: gum } });
    const r = await openLiveMedia('user');
    expect(r.stream).toBe(audioOnly);
    expect(r.error).toBe('nocamera');
  });
});
