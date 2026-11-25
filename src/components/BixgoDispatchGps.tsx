import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { LocateFixed, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateDispatchLocation } from '@/lib/bixgo-dispatch.functions';
import { dispatchLocationSchema, freshDispatchFix } from '@/lib/bixgo-dispatch';
import { useBixgoText } from '@/lib/useBixgoText';

export function BixgoDispatchGps({ onReady, onUpdated }: { onReady: (ready: boolean) => void; onUpdated: () => void }) {
  const send = useServerFn(updateDispatchLocation);
  const text = useBixgoText();
  const [status, setStatus] = useState('Detecting GPS…');
  const [retry, setRetry] = useState(0);
  const callbacks = useRef({ onReady, onUpdated });
  callbacks.current = { onReady, onUpdated };
  useEffect(() => {
    let disposed = false, inFlight = false, lastSent = 0;
    callbacks.current.onReady(false);
    setStatus('Detecting GPS…');
    const fail = (message: string) => {
      if (disposed) return;
      setStatus(message);
      callbacks.current.onReady(false);
    };
    if (!navigator.geolocation) { fail('GPS unavailable. Enable location to find nearby orders.'); return; }
    const success = async (position: GeolocationPosition) => {
      if (disposed) return;
      const data = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy };
      if (!freshDispatchFix(position.timestamp, Date.now()) || !dispatchLocationSchema.safeParse(data).success) {
        fail('GPS is not accurate yet. Retry near an open area.'); return;
      }
      if (inFlight || Date.now() - lastSent < 10_000) return;
      inFlight = true;
      try {
        await send({ data });
        if (disposed) return;
        lastSent = Date.now();
        setStatus('GPS active · nearby orders across city borders');
        callbacks.current.onReady(true);
        callbacks.current.onUpdated();
      } catch { fail('Location update failed. Check connection and retry.'); }
      finally { inFlight = false; }
    };
    const error = (e: GeolocationPositionError) => fail(e.code === 1 ? 'Location permission denied. Enable location and retry.' : 'GPS unavailable. Enable location to find nearby orders.');
    const options = { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 };
    const watch = navigator.geolocation.watchPosition(p => void success(p), error, options);
    // Stationary devices may emit no watch events; request a fresh fix, never recycle a cached one.
    const timer = setInterval(() => navigator.geolocation.getCurrentPosition(p => void success(p), error, options), 30_000);
    return () => { disposed = true; navigator.geolocation.clearWatch(watch); clearInterval(timer); };
  }, [retry, send]);
  return <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
    <LocateFixed className="h-4 w-4 shrink-0 text-primary"/>
    <span role="status" className="flex-1">{text(status)}</span>
    <Button variant="ghost" size="icon" aria-label={text('Retry GPS')} title={text('Retry GPS')} onClick={() => setRetry(n => n + 1)}><RefreshCw className="h-4 w-4"/></Button>
  </div>;
}