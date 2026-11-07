import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { PictureInPicture2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { locationFresh } from '@/lib/bixgo-trip';
const Map = lazy(() => import('@/components/BixgoLiveMap'));
type Position = { lat: number; lng: number };
export function BixgoTripMap({ driver, pickup, at }: { driver: Position | null; pickup: Position | null; at?: string | null }) {
  const box = useRef<HTMLDivElement>(null);
  const floating = useRef<Window | null>(null);
  const [supported, setSupported] = useState(false);
  useEffect(() => { setSupported('documentPictureInPicture' in window); return () => { floating.current?.close(); }; }, []);
  useEffect(() => {
    const mirror = () => {
      const w = floating.current, source = box.current;
      if (!w || w.closed || !source) return;
      w.document.body.replaceChildren(source.cloneNode(true));
    };
    const timer = setInterval(mirror, 1500);
    return () => clearInterval(timer);
  }, []);
  return <div className="mt-3 space-y-2">
    <div ref={box} className="space-y-1 bg-card text-card-foreground p-2">
      <p className="text-xs font-semibold">{locationFresh(at) ? 'Driver location · live' : at ? 'Last known driver location · updates paused' : 'Waiting for driver GPS'}</p>
      <div className="relative h-48 overflow-hidden rounded-lg"><ClientOnly><Suspense fallback={<p className="p-4 text-xs">Loading map…</p>}><Map from={driver} to={pickup} active="from" onPick={() => {}}/></Suspense></ClientOnly></div>
      {at && <p className="text-[10px] text-muted-foreground">Updated {new Date(at).toLocaleTimeString()}</p>}
    </div>
    {supported ? <Button variant="outline" className="w-full" onClick={async () => {
      try {
        const api = (window as Window & { documentPictureInPicture?: { requestWindow: (options: { width: number; height: number }) => Promise<Window> } }).documentPictureInPicture;
        if (!api || !box.current) return;
        const w = await api.requestWindow({ width: 360, height: 280 }); floating.current = w;
        document.querySelectorAll('style,link[rel="stylesheet"]').forEach(s => w.document.head.append(s.cloneNode(true)));
        w.document.body.className = document.body.className;
        w.document.body.replaceChildren(box.current.cloneNode(true));
      } catch { setSupported(false); }
    }}><PictureInPicture2 className="mr-2 h-4 w-4"/>Floating map</Button> : <p className="text-[10px] text-muted-foreground">Floating maps are unavailable in this browser. Keep BIXGO open for location updates.</p>}
  </div>;
}