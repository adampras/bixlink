import { useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, Droplets, Gamepad2, Gift, GraduationCap, Heart, Home, ListChecks, Phone, ReceiptText, Search, Smartphone, Sparkles, Tv, Wallet, Wifi, X, Zap } from 'lucide-react';

const idr = (n: number) => 'Rp' + n.toLocaleString('id-ID');
type Item = { label: string; icon: typeof Zap; badge?: string; tone: string };
const TOPUP: Item[] = [
  { label: 'E-Money', icon: Wallet, badge: 'Rp1', tone: 'text-sky-400' },
  { label: 'Pulsa', icon: Smartphone, badge: '-22%', tone: 'text-primary' },
  { label: 'Paket Data', icon: Wifi, badge: 'Rp1', tone: 'text-sky-400' },
  { label: 'Token Listrik', icon: Zap, badge: '-10rb', tone: 'text-yellow-400' },
  { label: 'Game Top-Up', icon: Gamepad2, tone: 'text-primary' },
  { label: 'Paket Hemat', icon: Phone, tone: 'text-red-400' },
  { label: 'Donasi', icon: Heart, tone: 'text-red-400' },
  { label: 'Top Up BIX PAY', icon: Sparkles, badge: 'New', tone: 'text-yellow-400' },
];
const BILLS: Item[] = [
  { label: 'PDAM', icon: Droplets, tone: 'text-sky-400' }, { label: 'Tagihan Listrik', icon: Zap, tone: 'text-yellow-400' },
  { label: 'Internet & TV', icon: Tv, tone: 'text-primary' }, { label: 'IPKL', icon: Home, tone: 'text-orange-400' },
  { label: 'Biaya Pendidikan', icon: GraduationCap, tone: 'text-primary' }, { label: 'BPJS', icon: ReceiptText, tone: 'text-sky-400' },
  { label: 'Asuransi', icon: BookOpen, tone: 'text-red-400' }, { label: 'Voucher', icon: Gift, tone: 'text-yellow-400' },
];
const QUICK = [['Top Up', 'Pulsa/Paket'], ['Tagihan', 'PDAM'], ['Top Up', 'Token Listrik'], ['Tagihan', 'Tagihan Listrik']];
const AMOUNTS = [10_000, 20_000, 50_000, 100_000, 200_000, 500_000];

/** Demo bills & top-up hub modeled on the reference. No purchase, provider call or charge happens. */
export function BixgoBills({ onBack }: { onBack: () => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [num, setNum] = useState('');
  const [amt, setAmt] = useState(AMOUNTS[1]!);
  const [done, setDone] = useState(false);
  const [log, setLog] = useState<{ label: string; num: string; amt: number; at: string }[]>([]);
  const f = (l: Item[]) => l.filter(i => !q || i.label.toLowerCase().includes(q.toLowerCase()));
  const pick = (l: string) => { setOpen(l); setNum(''); setDone(false); };

  const Grid = ({ items }: { items: Item[] }) => <div className="grid grid-cols-4 gap-y-4">{items.map(i => { const I = i.icon; return <button key={i.label} onClick={() => pick(i.label)} className="flex flex-col items-center gap-1 text-center active:scale-95 transition">
    <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-card shadow-md"><I className={`h-7 w-7 ${i.tone}`}/>{i.badge && <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">{i.badge}</span>}</span>
    <span className="text-[11px] font-semibold leading-tight">{i.label}</span></button>; })}</div>;

  return <div className="min-h-[100dvh] px-4 pb-24 pt-4">
    <header className="flex items-center gap-3"><button aria-label="Kembali" onClick={onBack}><ArrowLeft className="h-6 w-6"/></button><h1 className="text-xl font-black">Pulsa/Bills</h1></header>
    <label className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3"><Search className="h-4 w-4 text-muted-foreground"/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari top up atau biller" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"/></label>

    <section className="mt-4 overflow-hidden rounded-2xl border border-border">
      <p className="flex items-center gap-2 bg-primary/15 px-4 py-2.5 text-sm font-bold"><ListChecks className="h-5 w-5 text-primary"/>Yuk, mulai transaksi sekarang!</p>
      <div className="bg-card p-4"><b className="block truncate text-base">Bayar semua transaksi sekaligus</b>
        <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1">{QUICK.map(([a, b]) => <button key={b} onClick={() => pick(b!)} className="min-w-[140px] rounded-xl border border-border bg-background px-3 py-2 text-left"><span className="block text-[11px] text-muted-foreground">{a}</span><b className="text-sm">{b}</b></button>)}</div>
        <button onClick={() => pick('Pulsa')} className="mt-3 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground">Transaksi sekarang</button></div>
    </section>

    <h2 className="mb-3 mt-6 text-lg font-black">Top-Up</h2><Grid items={f(TOPUP)}/>
    <h2 className="mb-3 mt-6 text-lg font-black">Tagihan</h2><Grid items={f(BILLS)}/>

    <div className="mt-6 grid grid-cols-2 gap-2">
      <div className="rounded-2xl bg-primary/15 p-3"><b className="text-sm">Cek promo menarik</b><p className="text-[11px] text-muted-foreground">Promo contoh BIXGO</p></div>
      <div className="rounded-2xl bg-accent/20 p-3"><b className="text-sm">Daftar transaksi</b><p className="text-[11px] text-muted-foreground">{log.length} transaksi demo</p></div>
    </div>
    {log.length > 0 && <div className="mt-2 space-y-1">{log.map(l => <p key={l.at} className="rounded-xl border border-border px-3 py-2 text-xs"><b>{l.label}</b> · {l.num} · {idr(l.amt)}</p>)}</div>}
    <h2 className="mb-2 mt-6 text-lg font-black">Atur tagihan anda dengan mudah</h2>
    <div className="rounded-2xl border border-border bg-card p-4 text-sm"><b>Bayar semua sekaligus</b><p className="text-xs text-muted-foreground">Sekali bayar, semua tagihan lunas — segera hadir.</p></div>

    {open && <div className="fixed inset-0 z-[70] flex items-end bg-background/70 backdrop-blur-sm" onClick={() => setOpen(null)}>
      <div className="mx-auto w-full max-w-xl rounded-t-3xl border-t border-border bg-background p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between"><b className="text-lg">{open}</b><button aria-label="Tutup" onClick={() => setOpen(null)}><X className="h-5 w-5"/></button></div>
        {done ? <div className="py-6 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-primary"/><p className="mt-2 font-bold">Transaksi demo tercatat</p><p className="text-xs text-muted-foreground">Pratinjau saja — tidak ada saldo terpotong dan tidak ada pengisian ke operator.</p></div> : <>
          <input value={num} onChange={e => setNum(e.target.value.replace(/[^0-9]/g, '').slice(0, 20))} inputMode="numeric" placeholder="Nomor HP / ID pelanggan" className="mt-3 w-full rounded-xl border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary"/>
          <div className="mt-3 grid grid-cols-3 gap-2">{AMOUNTS.map(a => <button key={a} onClick={() => setAmt(a)} className={`rounded-xl border py-2.5 text-sm font-bold ${amt === a ? 'border-primary bg-primary/15' : 'border-border'}`}>{idr(a)}</button>)}</div>
          <button disabled={num.length < 6} onClick={() => { setLog(l => [{ label: open, num, amt, at: new Date().toISOString() }, ...l]); setDone(true); }} className="mt-4 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-40">Bayar {idr(amt)}</button>
        </>}
      </div></div>}
  </div>;
}
