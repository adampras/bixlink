import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { updateBixgoLocation } from '@/lib/bixgo-trip.functions';
import { watchDriverLocation } from '@/lib/native-device';
export function BixgoDriverLocation({ ids }: { ids: string[] }) {
  const send = useServerFn(updateBixgoLocation);
  const [state, setState] = useState('Sharing GPS during your active trip');
  const last = useRef(0);
  const key = ids.join(',');
  useEffect(() => {
    if (!key) { setState('No active trip'); return; }
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void watchDriverLocation(key.split(','), (lat, lng) => {
      if (disposed) return;
      if (Date.now() - last.current < 8000) return;
      last.current = Date.now();
      void Promise.all(key.split(',').map(id => send({ data: { id, lat, lng } }))).then(() => { if (!disposed) setState('Location shared with your passenger · locked-screen delivery unverified'); }).catch(() => { if (!disposed) setState('Location update failed · check connection'); });
    }, message => { if (!disposed) setState(message); }).then(stop => { if (disposed) stop(); else cleanup = stop; }).catch(() => { if (!disposed) setState('GPS unavailable · check permissions'); });
    return () => { disposed = true; cleanup?.(); };
  }, [key, send]);
  return <p className="text-[11px] text-muted-foreground" role="status">{state}</p>;
}