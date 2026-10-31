/** Browser helpers for real location: device GPS + OpenStreetMap Nominatim geocoding. Call only from event handlers/effects. */
export type Place = { lat: number; lng: number; name: string; detail: string };
const NOM = 'https://nominatim.openstreetmap.org';

const toPlace = (r: { lat: string; lon: string; display_name: string; name?: string }): Place => {
  const parts = r.display_name.split(', ');
  return { lat: +r.lat, lng: +r.lon, name: r.name || parts[0] || r.display_name, detail: parts.slice(1, 4).join(', ') };
};

export function getDevicePosition(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('Perangkat tidak mendukung GPS'));
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      e => rej(new Error(e.code === 1 ? 'Izin lokasi ditolak. Aktifkan lokasi untuk BIXGO di pengaturan browser.' : 'Lokasi belum bisa dibaca, coba lagi di tempat terbuka.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<Place> {
  try {
    const r = await fetch(`${NOM}/reverse?format=jsonv2&accept-language=id&lat=${lat}&lon=${lng}`);
    if (r.ok) { const j = await r.json(); if (j?.display_name) return { ...toPlace(j), lat, lng }; }
  } catch { /* fall through */ }
  return { lat, lng, name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, detail: 'Koordinat GPS' };
}

export async function searchPlaces(q: string, near?: { lat: number; lng: number }): Promise<Place[]> {
  if (q.trim().length < 3) return [];
  const vb = near ? `&viewbox=${near.lng - 0.5},${near.lat + 0.5},${near.lng + 0.5},${near.lat - 0.5}` : '';
  const r = await fetch(`${NOM}/search?format=jsonv2&accept-language=id&limit=6&countrycodes=id${vb}&q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error('Pencarian alamat sedang sibuk, coba lagi.');
  return ((await r.json()) as any[]).map(toPlace);
}
