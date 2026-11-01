import { lazy, Suspense } from 'react';
import { Maximize2, X } from 'lucide-react';
import { useRouter } from '@tanstack/react-router';
import { bixtokMini, useBixtokMini } from '@/lib/bixtok-mini';

const BixtokLiveRoom = lazy(() => import('@/components/BixtokLiveRoom').then(m => ({ default: m.BixtokLiveRoom })));

export function BixtokMiniHost() {
  const { room, mini } = useBixtokMini();
  const router = useRouter();
  if (!room) return null;
  const minimize = () => {
    bixtokMini.setMini(true);
    if (router.state.location.pathname === '/bixtok' && window.history.length > 1) window.history.back();
  };
  const isHost = room.live.host_id === room.me;
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
      <button type="button" aria-label="Close LIVE" onClick={() => { if (isHost && !window.confirm('End this LIVE?')) return; bixtokMini.setMini(false); setTimeout(() => (document.querySelector('.bxl-full [aria-label="Close"]') as HTMLButtonElement | null)?.click(), 50); }}><X size={14}/></button>
    </div>}
  </div>;
}
