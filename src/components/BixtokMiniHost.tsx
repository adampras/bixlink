import { lazy, Suspense } from 'react';
import { Maximize2, X } from 'lucide-react';
import { useRouter } from '@tanstack/react-router';
import { bixtokMini, useBixtokMini } from '@/lib/bixtok-mini';

const BixtokLiveRoom = lazy(() => import('@/components/BixtokLiveRoom').then(m => ({ default: m.BixtokLiveRoom })));

export function BixtokMiniHost() {
  const { room, mini, feed } = useBixtokMini();
  const router = useRouter();
  if (!room && feed && router.state.location.pathname !== '/bixtok') return <div className="bxl-mini bxl-mini-feed">
    {feed.kind === 'iframe' ? <iframe src={feed.src} title={feed.title} allow="autoplay; encrypted-media" className="h-full w-full border-0"/> : feed.kind === 'video' ? <video src={feed.src} autoPlay loop muted playsInline className="h-full w-full object-cover"/> : <img src={feed.src} alt={feed.title} className="h-full w-full object-cover"/>}
    <div className="bxl-mini-ctl"><span className="bxl-mini-badge feed">BIXTOK</span>
      <button type="button" aria-label="Open BIXTOK" onClick={() => { bixtokMini.setFeed(null); void router.navigate({ to: '/bixtok' }); }}><Maximize2 size={14}/></button>
      <button type="button" aria-label="Close BIXTOK mini" onClick={() => bixtokMini.setFeed(null)}><X size={14}/></button></div>
  </div>;
  if (!room) return null;
  const minimize = () => {
    bixtokMini.setMini(true);
    if (router.state.location.pathname === '/bixtok' && window.history.length > 1) window.history.back();
  };
  return <div className={mini ? 'bxl-mini' : 'bxl-full'}>
    <div className={mini ? 'bxl-mini-inner' : undefined}>
      <Suspense fallback={null}>
        <BixtokLiveRoom live={room.live} me={room.me} cfg={room.cfg} following={room.following} onFollow={room.onFollow} onGift={room.onGift} onClose={() => bixtokMini.close()} onMinimize={minimize}/>
      </Suspense>
    </div>
    {mini && <div className="bxl-mini-ctl">
      <button type="button" className="bxl-mini-hit" aria-label="Expand LIVE" onClick={() => bixtokMini.setMini(false)}/>
      <span className="bxl-mini-badge">● LIVE</span>
      <button type="button" aria-label="Expand LIVE" onClick={() => bixtokMini.setMini(false)}><Maximize2 size={14}/></button>
      <button type="button" aria-label="Close LIVE" onClick={() => { bixtokMini.setMini(false); setTimeout(() => (document.querySelector('.bxl-full [aria-label="Close"]') as HTMLButtonElement | null)?.click(), 50); }}><X size={14}/></button>
    </div>}
  </div>;
}
