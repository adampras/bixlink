import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, LockKeyhole, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import engine from '@/assets/bix-mining-engine.mp4.asset.json';
import webEngine from '@/assets/bix-mining-engine.webm.asset.json';
import poster from '@/assets/bix-mining-engine-poster.jpg.asset.json';

/** Presentation only; video playback never awards rewards. */
export function MemberMining({ emailVerified }: { emailVerified: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const sync = () => {
      if (visible && !document.hidden && !reduced.matches) element.play().catch(() => {});
      else element.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = !!entry?.isIntersecting; sync(); });
    observer.observe(element);
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', sync); element.pause(); };
  }, []);
  return <section className="member-mining" aria-labelledby="member-mining-title">
    <div className="mining-heading"><h2 id="member-mining-title">BIX MINING</h2><span className={emailVerified ? 'mining-verified' : 'mining-unverified'}>{emailVerified ? <BadgeCheck size={15}/> : <LockKeyhole size={15}/>} {emailVerified ? 'Terverifikasi' : 'Verifikasi email'}</span></div>
    <div className="mining-engine">
      <video ref={video} muted loop playsInline preload="metadata" poster={poster.url} aria-label="Mesin mining BIX" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}><source src={webEngine.url} type="video/webm"/><source src={engine.url} type="video/mp4"/></video>
      <Button variant="outline" size="icon" className="mining-video-control" aria-label={playing ? 'Jeda video mining' : 'Putar video mining'} title={playing ? 'Jeda video mining' : 'Putar video mining'} onClick={() => { const element = video.current; if (!element) return; if (element.paused) element.play().catch(() => {}); else element.pause(); }}>{playing ? <Pause/> : <Play/>}</Button>
    </div>
    <dl className="mining-figures">
      <div><dt>Total mining</dt><dd>— <small>BIX</small></dd></div>
      <div><dt>Batas akun</dt><dd>100 <small>BIX</small></dd></div>
      <div><dt>Laju mining</dt><dd className="mining-pending">Belum ditetapkan</dd></div>
      <div><dt>Bonus staking</dt><dd className="mining-pending">Belum ditetapkan</dd></div>
    </dl>
    <div className="mining-availability"><LockKeyhole size={12}/><span>Belum aktif</span></div>
    <Button variant="outline" className="mining-start" disabled aria-describedby="mining-state"><Play size={16}/> Mulai mining</Button>
    <p id="mining-state" className="mining-state">{emailVerified ? 'Menunggu aktivasi dan pengaturan reward oleh Owner 1.' : 'Verifikasi email diperlukan. Mining belum diaktifkan.'}</p>
    <div className="mining-disclosures"><p>Reward BIX internal · Bukan mining on-chain</p><p>Rencana pool komunitas: <strong>1.000.000 BIX</strong></p></div>
  </section>;
}