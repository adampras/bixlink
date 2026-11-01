import { useCallback, useEffect, useRef } from 'react';

export const BIXTOK_SOUND_EVENT = 'bixtok:sound';
const TIKTOK_ORIGIN = 'https://www.tiktok.com';

export function BixtokTikTokPlayer({ src, title, muted, className, filter }: {
  src: string; title: string; muted: boolean; className?: string; filter?: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const latestMuted = useRef(muted);
  latestMuted.current = muted;
  const syncSound = useCallback((silent: boolean) => {
    const player = frame.current?.contentWindow;
    if (!player) return;
    player.postMessage({ 'x-tiktok-player': true, type: silent ? 'mute' : 'unMute' }, TIKTOK_ORIGIN);
    if (!silent) {
      player.postMessage({ 'x-tiktok-player': true, type: 'setVolume', value: 100 }, TIKTOK_ORIGIN);
      player.postMessage({ 'x-tiktok-player': true, type: 'play' }, TIKTOK_ORIGIN);
    }
  }, []);

  useEffect(() => {
    const onSound = (event: Event) => syncSound((event as CustomEvent<boolean>).detail);
    const onReady = (event: MessageEvent) => {
      if (event.origin !== TIKTOK_ORIGIN || event.source !== frame.current?.contentWindow) return;
      if (event.data?.['x-tiktok-player'] === true && event.data.type === 'onPlayerReady') syncSound(latestMuted.current);
    };
    window.addEventListener(BIXTOK_SOUND_EVENT, onSound);
    window.addEventListener('message', onReady);
    return () => {
      window.removeEventListener(BIXTOK_SOUND_EVENT, onSound);
      window.removeEventListener('message', onReady);
    };
  }, [syncSound]);
  useEffect(() => syncSound(muted), [muted, syncSound]);

  return <iframe ref={frame} src={src} title={title} className={className}
    allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
    onLoad={() => syncSound(latestMuted.current)} style={{ filter }}/>;
}