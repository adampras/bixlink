import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import video from '@/assets/bix-reactor.mp4.asset.json';
import webVideo from '@/assets/bix-reactor.webm.asset.json';
import poster from '@/assets/bix-reactor-poster.jpg.asset.json';
import alternative from '@/assets/booster-alternative.mp4.asset.json';
import alternativeWeb from '@/assets/booster-alternative.webm.asset.json';
import alternativePoster from '@/assets/booster-alternative-poster.jpg.asset.json';
import { resolveBoosterVisual } from '@/lib/booster-visual';
import { usePublicConfig } from '@/lib/useMember';
import orbital from '@/assets/booster-orbital.mp4.asset.json';
import orbitalWeb from '@/assets/booster-orbital.webm.asset.json';
import orbitalPoster from '@/assets/booster-orbital-poster.jpg.asset.json';
import crystal from '@/assets/booster-crystal.mp4.asset.json';
import crystalWeb from '@/assets/booster-crystal.webm.asset.json';
import crystalPoster from '@/assets/booster-crystal-poster.jpg.asset.json';
import rocket from '@/assets/presale-rocket-dark.mp4.asset.json';
import rocketWeb from '@/assets/presale-rocket-dark.webm.asset.json';
import rocketPoster from '@/assets/presale-rocket-dark-poster.jpg.asset.json';

export function ReactorVideo({ maximum, visual }: { maximum: number; visual?: string }) {
  const { data: cfg } = usePublicConfig();
  const selection = resolveBoosterVisual(visual ?? cfg?.boosterVisual.visual);
  const media = { reactor: { mp4: video, webm: webVideo, poster }, video: { mp4: alternative, webm: alternativeWeb, poster: alternativePoster }, orbital: { mp4: orbital, webm: orbitalWeb, poster: orbitalPoster }, crystal: { mp4: crystal, webm: crystalWeb, poster: crystalPoster }, rocket: { mp4: rocket, webm: rocketWeb, poster: rocketPoster } }[selection];
  const ref = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(false);
  useEffect(() => { setSound(false); }, [selection]);
  useEffect(() => { if (ref.current) ref.current.muted = !sound; }, [sound, selection]);
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
  return <div className={`reactor-glass-stage auric-card${selection === 'rocket' ? ' reactor-rocket-stage' : ''}`}>
    <video key={selection} ref={ref} className="reactor-glass-video" poster={media.poster.url} muted loop playsInline preload="metadata" aria-label={selection === 'rocket' ? 'BIXLINK rocket reactor' : 'BIXCOIN gold reactor'}><source src={media.webm.url} type="video/webm"/><source src={media.mp4.url} type="video/mp4"/></video>
    {selection === 'rocket' && <Button variant="outline" size="icon" className="presale-sound-toggle" aria-label={sound ? 'Mute reactor sound' : 'Unmute reactor sound'} onClick={() => setSound(value => !value)}>{sound ? <Volume2 size={15}/> : <VolumeX size={15}/>}</Button>}
    <div className="reactor-glass-lens"><span>BIX BOOSTER</span><small>UP TO</small><strong>{maximum}%</strong><small>MONTHLY · PROJECTION</small></div>
  </div>;
}