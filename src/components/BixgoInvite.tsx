import { useEffect, useMemo, useState } from 'react';
import { MapPin, Share2, Users, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { REGION_CITIES } from '@/lib/bixgo-regions';

type Stats = { code: string | null; invited: number; drivers: number; driver_trips: number; rider_trips: number; usdt: number; bix: number };

/** BIXGO referral plan card: 2% per trip of invited drivers, 1% per trip of invited riders — paid from the 15% platform share. */
export function BixgoInvite() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { void supabase.rpc('bixgo_ref_stats').then(({ data }) => data && setS(data as unknown as Stats)); }, []);
  if (!s) return null;
  const link = s.code ? `https://bixlink.com/register?ref=${s.code}` : '';
  const msg = `Yuk pakai BIXGO! Ojek & mobil lebih hemat, driver dapat 85%. Daftar gratis jadi penumpang atau mitra driver: ${link}`;
  const copy = () => { void navigator.clipboard?.writeText(link); toast.success('Link copied'); };
  return <section className="mx-3 my-3 rounded-2xl border border-primary/40 bg-card p-4">
    <div className="flex items-center gap-2 text-sm font-bold"><Users className="h-4 w-4 text-primary"/>Ajak Teman & Mitra BIXGO</div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px]">
      <div className="rounded-xl border border-border p-2"><b className="block text-lg text-primary">2%</b>tiap trip driver yang Anda ajak</div>
      <div className="rounded-xl border border-border p-2"><b className="block text-lg text-primary">1%</b>tiap trip penumpang yang Anda ajak</div>
    </div>
    <p className="mt-2 text-[10px] text-muted-foreground">Diambil dari 15% bagian platform — tidak menambah ongkos penumpang dan tidak memotong 85% driver. Dicatat otomatis saat trip selesai.</p>
    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] tabular-nums">
      <div><b className="block text-sm">{s.invited}</b>Diajak</div>
      <div><b className="block text-sm">{s.driver_trips + s.rider_trips}</b>Trip</div>
      <div><b className="block text-sm">{Number(s.usdt).toFixed(2)} USDT · {Number(s.bix).toFixed(2)} BIX</b>Komisi</div>
    </div>
    {link && <div className="mt-3 flex gap-2">
      <button onClick={copy} className="flex flex-1 items-center justify-center gap-1 rounded-full border border-primary py-2 text-xs font-bold text-primary"><Copy className="h-3.5 w-3.5"/>{s.code}</button>
      <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-1 rounded-full bg-primary py-2 text-xs font-bold text-primary-foreground"><Share2 className="h-3.5 w-3.5"/>WhatsApp</a>
    </div>}
  </section>;
}

/** Lets an approved driver move their operating city without re-applying. */
export function BixgoCitySwitch({ city, onChange }: { city: string; onChange: (c: string) => void }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const hits = useMemo(() => q.trim().length < 2 ? [] : REGION_CITIES.filter(c => `${c.city} ${c.province}`.toLowerCase().includes(q.toLowerCase())).slice(0, 6), [q]);
  const save = async (id: string) => {
    setBusy(true);
    const { error } = await supabase.rpc('bixgo_driver_set_city', { p_city: id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Operating city updated'); setQ(''); onChange(id);
  };
  return <div className="rounded-2xl border border-border bg-card p-3">
    <div className="flex items-center gap-2 text-xs font-bold"><MapPin className="h-4 w-4 text-primary"/>Kota operasional: <span className="capitalize text-primary">{city || '—'}</span></div>
    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari kota baru…" className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"/>
    {hits.map(c => <button key={c.id} disabled={busy} onClick={() => void save(c.id)} className="mt-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-primary/10">{c.city} <span className="text-muted-foreground">· {c.province}</span></button>)}
    <p className="mt-1 text-[10px] text-muted-foreground">Order hanya muncul untuk kota yang sama dengan kota operasional Anda.</p>
  </div>;
}
