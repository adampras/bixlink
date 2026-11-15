import { useState } from 'react';
import { Search, Car, Home, Plane, Scissors, HeartPulse, Briefcase, Store } from 'lucide-react';

/** BIXCARE business directory: 6 pillars covering every service type a member can list. Presentation only. */
export const CARE_PILLARS = [
  { id: 'auto', name: 'Otomotif & Kendaraan', Icon: Car, items: ['Bengkel umum', 'Bengkel resmi', 'Ganti oli', 'Cuci mobil', 'Cuci motor', 'Salon mobil / detailing', 'Tambal ban', 'Derek 24 jam', 'Spooring & balancing', 'Aki & kelistrikan'] },
  { id: 'home', name: 'Rumah & Pakaian', Icon: Home, items: ['Laundry kiloan', 'Laundry satuan', 'Dry cleaning', 'Servis & cuci AC', 'Cuci kasur & sofa', 'Reparasi elektronik', 'Cleaning service', 'Tukang & renovasi', 'Pest control'] },
  { id: 'travel', name: 'Transportasi & Rental', Icon: Plane, items: ['Rental mobil lepas kunci', 'Rental mobil + sopir', 'Sewa motor', 'Travel antarkota', 'Sewa bus', 'Tour & wisata'] },
  { id: 'groom', name: 'Kecantikan & Kebugaran', Icon: Scissors, items: ['Barbershop', 'Salon kecantikan', 'Spa & refleksi', 'Gym & fitness', 'Nail art', 'Makeup artist'] },
  { id: 'health', name: 'Kesehatan & Perawatan Diri', Icon: HeartPulse, items: ['Klinik umum', 'Klinik gigi', 'Apotek', 'Fisioterapi', 'Laboratorium', 'Perawat home care'] },
  { id: 'pro', name: 'Jasa & Bisnis Profesional', Icon: Briefcase, items: ['Percetakan', 'Fotografer / videografer', 'Katering', 'Pengurusan surat kendaraan', 'Las & kontraktor', 'Desain & digital', 'Kursus & les privat', 'Event organizer'] },
] as const;

export function CareDirectory({ onPick, onRegister }: { onPick: (term: string) => void; onRegister: () => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const t = q.trim().toLowerCase();
  const hits = t ? CARE_PILLARS.flatMap(p => p.items.filter(i => (i + ' ' + p.name).toLowerCase().includes(t)).map(i => ({ i, p: p.name }))) : [];
  return <section className="space-y-3" aria-label="Direktori bisnis BIXCARE">
    <label className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-card/80 px-3 py-2.5"><Search className="h-4 w-4 text-primary"/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari bengkel, laundry, rental, cuci AC, salon, jasa…" className="w-full bg-transparent text-sm outline-none" aria-label="Cari jenis bisnis"/></label>
    {t ? <div className="flex flex-wrap gap-2">{hits.length ? hits.map(h => <button key={h.i} onClick={() => onPick(h.i)} className="care-pillar rounded-full bg-card px-3 py-1.5 text-xs font-bold">{h.i}<span className="ml-1 text-[10px] text-muted-foreground">· {h.p}</span></button>) : <p className="text-xs text-muted-foreground">Jenis bisnis belum ada di daftar — Anda tetap bisa mendaftarkannya.</p>}</div>
    : <div className="grid grid-cols-2 gap-2">{CARE_PILLARS.map(p => <button key={p.id} onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id} className={`care-pillar rounded-2xl bg-card/80 p-3 text-left ${open === p.id ? 'col-span-2 ring-1 ring-primary/50' : ''}`}>
      <p className="flex items-center gap-2 text-[12.5px] font-extrabold"><p.Icon className="h-4 w-4 text-primary"/>{p.name}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{p.items.length} jenis layanan</p>
      {open === p.id && <span className="mt-2 flex flex-wrap gap-1.5">{p.items.map(i => <span key={i} role="button" tabIndex={0} onClick={e => { e.stopPropagation(); onPick(i); }} className="rounded-full border border-primary/30 px-2.5 py-1 text-[11px] font-bold">{i}</span>)}</span>}
    </button>)}</div>}
    <button onClick={onRegister} className="flex w-full items-center gap-3 rounded-2xl bg-primary p-3 text-left text-primary-foreground"><Store className="h-6 w-6 shrink-0"/><span><b className="block text-sm font-black">Punya usaha sendiri?</b><span className="text-[11px]">Pasang gerai Anda di BIXCARE — terima BIX, USDT, QRIS & tunai.</span></span></button>
  </section>;
}
