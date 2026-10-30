import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BixtokTikTokPlayer, BIXTOK_SOUND_EVENT } from '../components/BixtokTikTokPlayer';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('BIXTOK TikTok sound', () => {
  it('unmutes and plays the embedded video immediately on a sound gesture', () => {
    const { getByTitle } = render(<BixtokTikTokPlayer src="https://www.tiktok.com/player/v1/123" title="Clip" muted/>);
    const frame = getByTitle('Clip') as HTMLIFrameElement;
    if (!frame.contentWindow) throw new Error('Missing player window');
    const send = vi.spyOn(frame.contentWindow, 'postMessage');
    window.dispatchEvent(new CustomEvent(BIXTOK_SOUND_EVENT, { detail: false }));
    expect(send).toHaveBeenCalledWith({ 'x-tiktok-player': true, type: 'unMute' }, 'https://www.tiktok.com');
    expect(send).toHaveBeenCalledWith({ 'x-tiktok-player': true, type: 'play' }, 'https://www.tiktok.com');
  });
  it('restores sound when a newly visible player becomes ready, and supports muting', () => {
    const { getByTitle, rerender } = render(<BixtokTikTokPlayer src="https://www.tiktok.com/player/v1/123" title="Clip" muted={false}/>);
    const frame = getByTitle('Clip') as HTMLIFrameElement;
    if (!frame.contentWindow) throw new Error('Missing player window');
    const send = vi.spyOn(frame.contentWindow, 'postMessage');
    window.dispatchEvent(new MessageEvent('message', { origin: 'https://www.tiktok.com', source: frame.contentWindow, data: { 'x-tiktok-player': true, type: 'onPlayerReady' } }));
    expect(send).toHaveBeenCalledWith({ 'x-tiktok-player': true, type: 'unMute' }, 'https://www.tiktok.com');
    send.mockClear();
    rerender(<BixtokTikTokPlayer src="https://www.tiktok.com/player/v1/123" title="Clip" muted/>);
    expect(send).toHaveBeenCalledWith({ 'x-tiktok-player': true, type: 'mute' }, 'https://www.tiktok.com');
  });
});