import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import video from '@/assets/bix-reactor.mp4.asset.json';
import webVideo from '@/assets/bix-reactor.webm.asset.json';
import poster from '@/assets/bix-reactor-poster.jpg.asset.json';

export function ReactorVideo({ maximum }: { maximum: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
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
  }, []);
  return <div className="reactor-glass-stage">
    <video ref={ref} className="reactor-glass-video" poster={poster.url} muted loop playsInline preload="metadata" aria-label="BIXCOIN gold reactor" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}><source src={webVideo.url} type="video/webm"/><source src={video.url} type="video/mp4"/></video>
    <div className="reactor-glass-lens"><span>BIX BOOSTER</span><small>UP TO</small><strong>{maximum}%</strong><small>ANNUAL · PROJECTION</small></div>
    <Button variant="outline" size="icon" className="reactor-video-control" aria-label={playing ? 'Pause reactor video' : 'Play reactor video'} title={playing ? 'Pause video' : 'Play video'} onClick={() => { const element = ref.current; if (!element) return; if (element.paused) element.play().catch(() => {}); else element.pause(); }}>{playing ? <Pause size={14}/> : <Play size={14}/>}</Button>
  </div>;
}