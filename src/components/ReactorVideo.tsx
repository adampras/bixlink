import { useEffect, useRef } from 'react';
import video from '@/assets/bix-reactor.mp4.asset.json';
import webVideo from '@/assets/bix-reactor.webm.asset.json';
import poster from '@/assets/bix-reactor-poster.jpg.asset.json';
import alternative from '@/assets/booster-alternative.mp4.asset.json';
import alternativeWeb from '@/assets/booster-alternative.webm.asset.json';
import alternativePoster from '@/assets/booster-alternative-poster.jpg.asset.json';
import { resolveBoosterVisual } from '@/lib/booster-visual';
import { usePublicConfig } from '@/lib/useMember';

export function ReactorVideo({ maximum, visual }: { maximum: number; visual?: string }) {
  const { data: cfg } = usePublicConfig();
  const selection = resolveBoosterVisual(visual ?? cfg?.boosterVisual.visual);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !reduced.matches) element.play().catch(() => {});
      else element.pause();
    });
    observer.observe(element);
    return () => { observer.disconnect(); element.pause(); };
  }, [selection]);
  return <div className="reactor-glass-stage">
    <video key={selection} ref={ref} className="reactor-glass-video" poster={selection === 'video' ? alternativePoster.url : poster.url} muted loop playsInline preload="metadata" aria-label="BIXCOIN gold reactor">{selection === 'reactor' ? <><source src={webVideo.url} type="video/webm"/><source src={video.url} type="video/mp4"/></> : <><source src={alternativeWeb.url} type="video/webm"/><source src={alternative.url} type="video/mp4"/></>}</video>
    <div className="reactor-glass-lens"><span>BIX BOOSTER</span><small>UP TO</small><strong>{maximum}%</strong><small>MONTHLY · PROJECTION</small></div>
  </div>;
}