import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { updateBixgoLocation } from '@/lib/bixgo-trip.functions';
export function BixgoDriverLocation({ ids }: { ids: string[] }) {
  const send = useServerFn(updateBixgoLocation);
  const [state, setState] = useState('Sharing GPS during your active trip');
  const last = useRef(0);
  const key = ids.join(',');
  useEffect(() => {
    if (!key || !navigator.geolocation) { setState('GPS unavailable'); return; }
    const watch = navigator.geolocation.watchPosition(p => {
      if (Date.now() - last.current < 8000) return;
      last.current = Date.now();
      void Promise.all(key.split(',').map(id => send({ data: { id, lat: p.coords.latitude, lng: p.coords.longitude } }))).then(() => setState('Location shared with your passenger')).catch(() => setState('Location update failed · check connection'));
    }, () => setState('GPS blocked · allow location access in your browser'), { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
    return () => navigator.geolocation.clearWatch(watch);
  }, [key, send]);
  return <p className="text-[11px] text-muted-foreground" role="status">{state}</p>;
}