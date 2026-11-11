import { useEffect, useRef } from 'react';
import L from 'leaflet';

export type LatLng = { lat: number; lng: number };

const pin = (color: string) => L.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 11],
  html: `<span style="display:block;width:22px;height:22px;border-radius:50%;background:${color};border:4px solid #fff;box-shadow:0 0 0 3px ${color}55,0 4px 10px #0008"></span>` });

/** Real OpenStreetMap map (browser-only). Tap the map to move the active point. */
export default function BixgoLiveMap({ from, to, active, path, onPick }: { from: LatLng | null; to: LatLng | null; active: 'from' | 'to'; path?: [number, number][] | null; onPick: (p: LatLng) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(onPick); pickRef.current = onPick;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([-8.5913, 116.1063], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on('click', e => pickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize()); ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current, g = layer.current; if (!m || !g) return;
    g.clearLayers();
    if (from) L.marker([from.lat, from.lng], { icon: pin('#22c55e') }).addTo(g);
    if (to) L.marker([to.lat, to.lng], { icon: pin('#ef4444') }).addTo(g);
    if (from && to) {
      L.polyline(path ?? [[from.lat, from.lng], [to.lat, to.lng]], { color: '#22c55e', weight: 5, ...(path ? {} : { dashArray: '8 8' }) }).addTo(g);
      m.fitBounds(L.latLngBounds([from.lat, from.lng], [to.lat, to.lng]), { padding: [50, 50], maxZoom: 16 });
    } else {
      const p = active === 'to' ? to ?? from : from;
      if (p) m.setView([p.lat, p.lng], Math.max(m.getZoom(), 15));
    }
  }, [from, to, active, path]);

  return <div ref={el} className="absolute inset-0 z-0 [&_.leaflet-tile-pane]:[filter:brightness(.75)_contrast(1.1)_saturate(.8)]"/>;
}
