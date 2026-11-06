import { useMemo, useState } from 'react';
import { MapPin, ChevronLeft, Search, X } from 'lucide-react';
import { REGION_CITIES } from '@/lib/bixgo-regions';

const COUNTRIES = [
  { cc: 'ID', flag: '🇮🇩', name: 'Indonesia', live: true },
  { cc: 'MY', flag: '🇲🇾', name: 'Malaysia', live: true },
  { cc: 'SG', flag: '🇸🇬', name: 'Singapore', live: false },
  { cc: 'AE', flag: '🇦🇪', name: 'United Arab Emirates', live: false },
] as const;

/** One-column cascading picker: Country → Province/State → City. Unopened countries show "Coming soon". */
export function BixgoRegionPicker({ city, onCity, onClose }: { city: string; onCity: (id: string) => void; onClose: () => void }) {
  const cur = REGION_CITIES.find(c => c.id === city);
  const [cc, setCc] = useState<string | null>(cur?.cc ?? null);
  const [prov, setProv] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const provinces = useMemo(() => {
    const m = new Map<string, number>();
    REGION_CITIES.filter(c => c.cc === cc).forEach(c => m.set(c.province, (m.get(c.province) ?? 0) + 1));
    return [...m.entries()];
  }, [cc]);
  const s = q.trim().toLowerCase();
  const cities = REGION_CITIES.filter(c => c.cc === cc && (s ? (c.city + c.province).toLowerCase().includes(s) : c.province === prov));
  const step = !cc ? 1 : !prov && !s ? 2 : 3;
  const back = () => { if (step === 3 && !s) setProv(null); else { setCc(null); setProv(null); setQ(''); } };

  return <div className="fixed inset-0 z-[80] flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
    <div role="dialog" aria-label="Select region" onClick={e => e.stopPropagation()} className="bixgo-hero mx-auto flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl p-4">
      <div className="flex items-center gap-2">
        {step > 1 && <button aria-label="Back" onClick={back} className="bixgo-hero-chip rounded-full p-1.5"><ChevronLeft className="h-4 w-4"/></button>}
        <div className="flex-1"><p className="bixgo-hero-gold text-[10px] font-bold tracking-[0.3em]">STEP {step} OF 3</p>
          <p className="font-display text-base font-black">{step === 1 ? 'Select country' : step === 2 ? 'Province / State' : 'Operational city'}</p></div>
        <button aria-label="Close" onClick={onClose} className="bixgo-hero-chip rounded-full p-1.5"><X className="h-4 w-4"/></button>
      </div>
      {cc && <label className="bixgo-hero-chip mt-3 flex items-center gap-2 rounded-xl px-3 py-2"><Search className="h-4 w-4 opacity-70"/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search city or province" className="w-full bg-transparent text-sm outline-none"/></label>}
      <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto pb-4">
        {step === 1 && COUNTRIES.map(c => <button key={c.cc} disabled={!c.live} onClick={() => setCc(c.cc)} className="bixgo-hero-chip flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left disabled:opacity-60">
          <span className="text-2xl">{c.flag}</span><span className="flex-1"><b className="block text-sm">{c.name}</b>
          <span className="text-[11px] text-muted-foreground">{c.live ? `${new Set(REGION_CITIES.filter(r => r.cc === c.cc).map(r => r.province)).size} regions · ${REGION_CITIES.filter(r => r.cc === c.cc).length} cities` : 'Pre-registration'}</span></span>
          {!c.live && <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Coming soon</span>}
        </button>)}
        {step === 2 && provinces.map(([p, n]) => <button key={p} onClick={() => setProv(p)} className="bixgo-hero-chip flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm"><span>{p}</span><span className="text-[11px] tabular-nums text-muted-foreground">{n} cities</span></button>)}
        {step === 3 && cities.map(c => <button key={c.id} onClick={() => { onCity(c.id); onClose(); }} className={`bixgo-hero-chip flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm ${c.id === city ? 'is-on' : ''}`}>
          <MapPin className="h-4 w-4"/><span className="flex-1">{c.city}<span className="block text-[11px] text-muted-foreground">{c.province}</span></span><span className="text-[11px] tabular-nums text-muted-foreground">{c.mult.toFixed(2)}x</span></button>)}
        {step === 3 && !cities.length && <p className="text-center text-xs text-muted-foreground">No city found.</p>}
      </div>
    </div>
  </div>;
}
