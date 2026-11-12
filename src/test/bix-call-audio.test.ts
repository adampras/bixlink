import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let state: AudioContextState;
let resume: ReturnType<typeof vi.fn>;
let createOscillator: ReturnType<typeof vi.fn>;
let stop: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); localStorage.clear(); state = 'suspended';
  resume = vi.fn(async () => { state = 'running'; });
  stop = vi.fn();
  createOscillator = vi.fn(() => ({ frequency: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop, onended: null }));
  vi.stubGlobal('AudioContext', class {
    get state() { return state; }
    currentTime = 0; destination = {}; onstatechange = null; resume = resume;
    createGain = () => ({ connect: vi.fn(), disconnect: vi.fn(), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } });
    createOscillator = createOscillator;
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('BIX CALL audio', () => {
  it('waits for successful audio resume before scheduling dialpad oscillators', async () => {
    let finish: (() => void) | undefined;
    resume.mockImplementation(() => new Promise<void>(resolve => { finish = () => { state = 'running'; resolve(); }; }));
    const { playDtmf } = await import('../lib/bix-tones');
    playDtmf('5');
    expect(createOscillator).not.toHaveBeenCalled();
    finish?.(); await vi.advanceTimersByTimeAsync(0);
    expect(createOscillator).toHaveBeenCalledTimes(2);
  });
  it('keeps gesture unlocking available after an initial autoplay rejection', async () => {
    resume.mockRejectedValueOnce(new Error('NotAllowedError'));
    const { installCallAudioUnlock, isCallAudioReady } = await import('../lib/bix-tones');
    const cleanup = installCallAudioUnlock();
    window.dispatchEvent(new Event('pointerdown')); await vi.advanceTimersByTimeAsync(0);
    expect(isCallAudioReady()).toBe(false);
    window.dispatchEvent(new Event('pointerdown')); await vi.advanceTimersByTimeAsync(0);
    expect(isCallAudioReady()).toBe(true);
    cleanup(); window.dispatchEvent(new Event('pointerdown'));
    expect(resume).toHaveBeenCalledTimes(2);
  });
  it('does not play a deferred ringtone after a call has stopped', async () => {
    const pending: (() => void)[] = [];
    resume.mockImplementation(() => new Promise<void>(resolve => { pending.push(() => { state = 'running'; resolve(); }); }));
    const { startRingback } = await import('../lib/bix-tones');
    const end = startRingback(); end();
    pending.forEach(finish => finish());
    await vi.advanceTimersByTimeAsync(4000);
    expect(createOscillator).not.toHaveBeenCalled();
  });
  it('retries a blocked ringback on a later gesture and stops it when cancelled', async () => {
    resume.mockRejectedValueOnce(new Error('NotAllowedError'));
    const { installCallAudioUnlock, startRingback } = await import('../lib/bix-tones');
    const cleanup = installCallAudioUnlock();
    const end = startRingback(); await vi.advanceTimersByTimeAsync(0);
    expect(createOscillator).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('pointerdown')); await vi.advanceTimersByTimeAsync(4000);
    expect(createOscillator).toHaveBeenCalledTimes(1);
    end(); await vi.advanceTimersByTimeAsync(8000);
    expect(createOscillator).toHaveBeenCalledTimes(1);
    cleanup();
  });
  it('stops already scheduled ringtone notes immediately', async () => {
    const { startRingtone } = await import('../lib/bix-tones');
    const end = startRingtone(); await vi.advanceTimersByTimeAsync(0);
    expect(createOscillator).toHaveBeenCalledTimes(10);
    stop.mockClear(); end();
    expect(stop).toHaveBeenCalledTimes(10);
  });
  it('honors silent volume and clamps device volume to a safe range', async () => {
    const { setRingVolume, getRingVolume, startRingtone } = await import('../lib/bix-tones');
    setRingVolume(0); const end = startRingtone(); await vi.advanceTimersByTimeAsync(0);
    expect(createOscillator).not.toHaveBeenCalled(); end();
    setRingVolume(2); expect(getRingVolume()).toBe(1);
    setRingVolume(-1); expect(getRingVolume()).toBe(0);
  });
});