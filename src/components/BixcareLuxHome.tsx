import { useEffect, useState } from 'react';
import { MapPin, Search, SlidersHorizontal, Bell, Heart, BadgeCheck, Star, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDevicePosition, reverseGeocode } from '@/lib/geo';
import type { Division, Outlet } from '@/lib/bixcare';
import { onBreak } from '@/components/BixcareExtras';
import autoImg from '@/assets/bixcare-auto.jpg';
import laundryImg from '@/assets/bixcare-laundry.jpg';
import rentImg from '@/assets/bixcare-rent.jpg';
import salonImg from '@/assets/bixcare-salon.jpg';
import clinicImg from '@/assets/bixcare-clinic.jpg';
import cateringImg from '@/assets/bixcare-catering.jpg';

type Tile = { label: string; div?: Division; term?: string; img?: string; Icon?: typeof Store };
const TILES: Tile[] = [
  { label: 'Auto Garage', div: 'auto', img: autoImg },
  { label: 'Home AC Laundry', div: 'laundry', img: laundryImg },
  { label: 'Car Rental', div: 'rent', img: rentImg },
  { label: 'Beauty Salon', div: 'salon', img: salonImg },
  { label: 'Medical Clinic', div: 'clinic', img: clinicImg },
  { label: 'Professional Catering', div: 'catering', img: cateringImg },
];
const SUB: Record<string, string> = { auto: 'Auto Repair & Maintenance', wash: 'Car Wash & Detailing', laundry: 'Home AC & Laundry', rent: 'Luxury & Comfort Rental', salon: 'Beauty Salon & Spa', clinic: 'Medical Clinic', catering: 'Professional Catering' };

/** Lux BIXCARE home header: real GPS city, real wallet balance, real outlets & ratings only. */
export function BixcareLuxHome({ uid, outlets, urls, stars, q, setQ, div, setDiv, onOpen, onAll }: {
  uid: string | null; outlets: Outlet[]; urls: Record<string, string>; stars: Record<string, { avg: number; n: number }>;
  q: string; setQ: (s: string) => void; div: Division | 'all'; setDiv: (d: Division | 'all') => void; onOpen: (o: Outlet) => void; onAll: () => void;
}) {
  const [city, setCity] = useState('Mendeteksi lokasi…');
  const [bal, setBal] = useState<number | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => { try { setFavs(JSON.parse(localStorage.getItem('bixcare-favs') || '[]')); } catch { /* ignore */ } }, []);
  useEffect(() => {
    getDevicePosition().then(p => reverseGeocode(p.lat, p.lng)).then(pl => {
      const parts = `${pl.name}, ${pl.detail}`.split(',').map(x => x.trim()).filter(Boolean);
      const c = parts.find(x => /^(kota|kabupaten|city)/i.test(x)) ?? parts[1] ?? parts[0] ?? '';
      setCity(c ? `${c.replace(/^(kota|kabupaten)\s+/i, '')}, ${parts[parts.length - 1]}` : 'Lokasi tidak diketahui');
    }).catch(() => setCity('Aktifkan GPS'));
  }, []);
  useEffect(() => { if (uid) void supabase.rpc('bix_asset_balances', { p_user: uid }).then(({ data }) => { const r = (data as { bix_balance: number }[] | null)?.[0]; setBal(Number(r?.bix_balance ?? 0)); }); }, [uid]);
  const fav = (id: string) => { const n = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id]; setFavs(n); localStorage.setItem('bixcare-favs', JSON.stringify(n)); };
  const top = [...outlets].filter(o => stars[o.id]).sort((a, b) => (stars[b.id]!.avg - stars[a.id]!.avg) || (stars[b.id]!.n - stars[a.id]!.n)).concat(outlets.filter(o => !stars[o.id])).slice(0, 5);
  const filters = (div !== 'all' ? 1 : 0) + (q ? 1 : 0);
  return (
    <section className="bxc-lux">
      <header className="bxc-top"><span className="bxc-brand">⬢ BIX<b>CARE</b></span><Bell className="h-5 w-5" aria-hidden /></header>
      <div className="bxc-row">
        <div className="bxc-loc"><MapPin className="h-5 w-5" /><span><small>Location</small><b>{city}</b></span></div>
        <div className="bxc-bal" title="Saldo BIX riil Anda">{bal === null ? (uid ? '…' : 'Masuk') : bal.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}<i>BIX</i></div>
      </div>
      <div className="bxc-row">
        <label className="bxc-search"><Search className="h-4 w-4" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search for services or merchants" aria-label="Cari layanan atau merchant" /></label>
        <button className="bxc-filter" aria-label="Reset filter" onClick={() => { setQ(''); setDiv('all'); }}><SlidersHorizontal className="h-4 w-4" />{filters > 0 && <em>{filters}</em>}</button>
      </div>
      <div className="bxc-grid">
        {TILES.map(t => { const on = (t.div && div === t.div) || (t.term && q === t.term);
          return <button key={t.label} className={`bxc-tile ${on ? 'is-on' : ''}`} onClick={() => { if (t.div) { setDiv(div === t.div ? 'all' : t.div); setQ(''); } else { setDiv('all'); setQ(q === t.term ? '' : t.term!); } }}>
            {t.img ? <img src={t.img} alt="" loading="lazy" /> : t.Icon && <span className="bxc-ico"><t.Icon className="h-10 w-10" /></span>}
            <b>{t.label}</b>
          </button>; })}
      </div>
      <div className="bxc-head"><b>Top Rated Merchants</b><button onClick={onAll}>View All</button></div>
      {top.length === 0 && <p className="bxc-empty">Belum ada merchant terverifikasi di BIXCARE. Daftarkan usaha Anda lewat tombol Gerai.</p>}
      {top.map(o => { const st = stars[o.id]; const open = o.is_open && !onBreak(o);
        return <div key={o.id} className="bxc-m" role="button" tabIndex={0} onClick={() => onOpen(o)} onKeyDown={e => e.key === 'Enter' && onOpen(o)}>
          <div className="bxc-m-img">{o.logo_path && urls[o.logo_path] ? <img src={urls[o.logo_path]} alt="" /> : <Store className="h-8 w-8" />}</div>
          <div className="bxc-m-body">
            <p className="bxc-m-name">{o.name}<BadgeCheck className="h-4 w-4" aria-label="Terverifikasi" /></p>
            <p className="bxc-m-sub">{SUB[o.division] ?? o.division} · {o.city}</p>
            <p className="bxc-m-rate">{st ? <><Star className="h-3.5 w-3.5" />{st.avg.toFixed(1)} <span>({st.n} reviews)</span></> : <span>Belum ada ulasan</span>}</p>
          </div>
          <div className="bxc-m-side">
            <button aria-label="Favorit" onClick={e => { e.stopPropagation(); fav(o.id); }} className={favs.includes(o.id) ? 'is-fav' : ''}><Heart className="h-5 w-5" /></button>
            <span className={open ? 'bxc-open' : 'bxc-closed'}>{!o.is_open ? 'Closed' : onBreak(o) ? 'Break' : 'Open'}</span>
          </div>
        </div>; })}
    </section>
  );
}
