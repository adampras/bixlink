import { useState } from 'react';
import { ArrowLeft, BedDouble, CheckCircle2, Plane, Wifi } from 'lucide-react';
import { BIX_REF_USD, TRAVEL_CATALOG, formatMoney, type GlobalCurrency, type TravelKind } from '@/lib/bixgo-global';

const TABS: { k: TravelKind; label: string; icon: typeof Wifi }[] = [
  { k: 'esim', label: 'eSIM', icon: Wifi }, { k: 'hotel', label: 'Hotels', icon: BedDouble }, { k: 'lounge', label: 'Lounges', icon: Plane },
];

/** Global travel hub preview: eSIM, hotels and airport lounges. No purchase or booking is made. */
export function BixgoTravel({ onBack, cur, usdtIdr }: { onBack: () => void; cur: GlobalCurrency; usdtIdr: number }) {
  const [tab, setTab] = useState<TravelKind>('esim');
  const [picked, setPicked] = useState<string | null>(null);
  const items = TRAVEL_CATALOG[tab];
  return <main className="px-4 pb-8 pt-4">
    <section className="flex items-center gap-3"><button aria-label="Back" onClick={onBack}><ArrowLeft className="h-6 w-6"/></button><h1 className="text-xl font-black">Travel & eSIM</h1></section>
    <p className="mt-1 text-xs text-muted-foreground">Global travel essentials priced in {cur}, USDT and BIX.</p>
    <div className="mt-4 grid grid-cols-3 gap-2">{TABS.map(t => { const I = t.icon; return <button key={t.k} onClick={() => { setTab(t.k); setPicked(null); }} className={`flex flex-col items-center gap-1 rounded-2xl border py-3 text-xs ${tab === t.k ? 'border-primary bg-primary/15' : 'border-border bg-card'}`}><I className="h-5 w-5 text-primary"/>{t.label}</button>; })}</div>
    <section className="mt-4 space-y-2">{items.map(i => { const idr = i.usd * usdtIdr; return <button key={i.id} onClick={() => setPicked(i.id)} className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left ${picked === i.id ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
      <span><b className="text-sm">{i.name}</b><span className="block text-[11px] text-muted-foreground">{i.note}</span></span>
      <span className="text-right tabular-nums"><b className="text-sm">{formatMoney(idr, cur, usdtIdr)}</b><span className="block text-[11px] text-muted-foreground">{i.usd.toFixed(2)} USDT · {(i.usd / BIX_REF_USD).toFixed(1)} BIX</span></span>
    </button>; })}</section>
    {picked && <p className="mt-4 flex items-start gap-2 rounded-2xl border border-primary/40 bg-primary/10 p-3 text-xs"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary"/>Saved to your travel wishlist. Checkout opens when BIXGO Global payments go live.</p>}
    <p className="mt-4 text-center text-[10px] text-muted-foreground">Preview catalog · prices are reference estimates · BIX at internal reference rate.</p>
  </main>;
}
