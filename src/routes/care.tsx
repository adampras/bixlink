import { GlobalRegions } from '@/components/GlobalRegions';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Wrench, Droplets, Shirt, KeyRound, Store, ClipboardList, Search, Fuel, QrCode, Check, X, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ecosystemHead } from '@/lib/ecosystem-seo';
import heroImg from '@/assets/bixcare-hero.jpg';
import autoImg from '@/assets/bixcare-auto.jpg';
import washImg from '@/assets/bixcare-wash.jpg';
import laundryImg from '@/assets/bixcare-laundry.jpg';
import rentImg from '@/assets/bixcare-rent.jpg';
import { type Division, type Outlet, type Service, type CareOrder, STAGES, CARE_STATUS, careNext, gasFeeBix, rp, uploadCareFile, signCare, MIN_GAS_BIX, type PayMethod, PAY_LABEL, isWalletPay, payQuote, walletNet } from '@/lib/bixcare';

export const Route = createFileRoute('/care')({
  head: () => ecosystemHead('/care', 'BIXCARE — Bengkel, Cuci, Laundry & Rental | BIXLINK', 'Pesan servis bengkel, cuci kendaraan, laundry dan rental motor/mobil dari mitra BIXLINK. Bayar langsung ke QRIS mitra; biaya platform BIX Gas dari saldo mitra.'),
  component: CarePage,
});

const DIVS: { id: Division; name: string; tag: string; img: string; Icon: typeof Wrench }[] = [
  { id: 'auto', name: 'BIX AutoCare', tag: 'Bengkel motor & mobil', img: autoImg, Icon: Wrench },
  { id: 'wash', name: 'BIX Wash', tag: 'Cuci & detailing', img: washImg, Icon: Droplets },
  { id: 'laundry', name: 'BIX Laundry', tag: 'Kiloan · dry clean', img: laundryImg, Icon: Shirt },
  { id: 'rent', name: 'BIX Rent', tag: 'Rental motor & mobil', img: rentImg, Icon: KeyRound },
];
const divName = (d: string) => DIVS.find(x => x.id === d)?.name ?? d;
const card = 'rounded-2xl border border-border/60 bg-card/70 backdrop-blur p-4';
const input = 'w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm';
const btn = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50';
const ghost = 'rounded-xl border border-border px-3 py-2 text-xs font-semibold';

function CarePage() {
  const [uid, setUid] = useState<string | null>(null);
  const [owner1, setOwner1] = useState(false);
  const [tab, setTab] = useState<'explore' | 'orders' | 'partner'>('explore');
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id ?? null; setUid(id);
      if (id) void supabase.rpc('bix_is_owner1').then(({ data: o }) => setOwner1(o === true));
    });
  }, []);
  return (
    <main className="mx-auto min-h-screen max-w-3xl pb-24 text-foreground">
      <section className="relative overflow-hidden">
        <img src={heroImg} alt="BIXCARE kendaraan, laundry dan rental" width={1536} height={864} className="h-56 w-full object-cover sm:h-72" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <Link to="/" className="absolute left-3 top-3 rounded-full bg-background/70 p-2"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="absolute bottom-3 left-4 right-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">BIXLINK Ecosystem</p>
          <h1 className="text-3xl font-black tracking-tight">BIX<span className="text-primary">CARE</span></h1>
          <p className="text-xs text-muted-foreground">Bengkel · Cuci · Laundry · Rental — bayar langsung ke mitra, BIX sebagai bahan bakar platform.</p>
        </div>
      </section>
      <GlobalRegions service="BIXCARE"/>
      <nav className="sticky top-0 z-10 flex gap-2 bg-background/90 px-4 py-2 backdrop-blur">
        {([['explore', 'Jelajah', Search], ['orders', 'Pesanan Saya', ClipboardList], ['partner', 'Pemilik Layanan', Store]] as const).map(([k, l, I]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold ${tab === k ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}><I className="h-4 w-4" />{l}</button>
        ))}
      </nav>
      <div className="space-y-4 px-4 pt-2">
        {tab === 'explore' && <Explore uid={uid} onBooked={() => setTab('orders')} />}
        {tab === 'orders' && (uid ? <MyOrders uid={uid} /> : <SignIn />)}
        {tab === 'partner' && (uid ? <Partner uid={uid} owner1={owner1} /> : <SignIn />)}
      </div>
    </main>
  );
}

function SignIn() {
  return <div className={card}><p className="text-sm">Masuk ke akun BIXLINK untuk melanjutkan.</p><Link to="/auth" className={`${btn} mt-3 inline-block`}>Masuk</Link></div>;
}

function Explore({ uid, onBooked }: { uid: string | null; onBooked: () => void }) {
  const [div, setDiv] = useState<Division | 'all'>('all');
  const [q, setQ] = useState('');
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Outlet | null>(null);
  useEffect(() => {
    void supabase.from('bixcare_outlets').select('*').eq('status', 'approved').then(async ({ data }) => {
      const list = ((data ?? []) as Outlet[]).sort((a, b) => Number(b.is_open) - Number(a.is_open)); setOutlets(list);
      if (uid) setUrls(await signCare(list.map(o => o.logo_path)));
    });
  }, [uid]);
  const shown = outlets.filter(o => (div === 'all' || o.division === div) && `${o.name} ${o.city}`.toLowerCase().includes(q.toLowerCase()));
  if (open) return <OutletDetail outlet={open} uid={uid} onBack={() => setOpen(null)} onBooked={onBooked} />;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {DIVS.map(d => (
          <button key={d.id} onClick={() => setDiv(div === d.id ? 'all' : d.id)} className={`group relative overflow-hidden rounded-2xl border text-left ${div === d.id ? 'border-primary ring-2 ring-primary/50' : 'border-border/60'}`}>
            <img src={d.img} alt={d.name} loading="lazy" width={816} height={816} className="aspect-square w-full object-cover transition group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            <div className="absolute bottom-2 left-3 right-3"><p className="flex items-center gap-1 text-sm font-black"><d.Icon className="h-4 w-4 text-primary" />{d.name}</p><p className="text-[10px] text-muted-foreground">{d.tag}</p></div>
          </button>
        ))}
      </div>
      <input className={input} placeholder="Cari outlet atau kota…" value={q} onChange={e => setQ(e.target.value)} />
      {shown.length === 0 && <div className={`${card} text-center text-sm text-muted-foreground`}>Belum ada outlet buka{div !== 'all' ? ` untuk ${divName(div)}` : ''}. Punya usaha? Daftar di tab Mitra.</div>}
      {shown.map(o => (
        <button key={o.id} onClick={() => setOpen(o)} className={`${card} flex w-full items-center gap-3 text-left`}>
          {o.logo_path && urls[o.logo_path] ? <img src={urls[o.logo_path]} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/15"><Store className="h-6 w-6 text-primary" /></div>}
          <div className="min-w-0 flex-1"><p className="truncate font-bold">{o.name}</p><p className="text-xs text-muted-foreground">{divName(o.division)} · {o.city} · {o.open_time}–{o.close_time}</p></div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${o.is_open ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>{o.is_open ? 'BUKA' : 'TUTUP'}</span>
        </button>
      ))}
    </>
  );
}

function OutletDetail({ outlet, uid, onBack, onBooked }: { outlet: Outlet; uid: string | null; onBack: () => void; onBooked: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [pay, setPay] = useState<PayMethod>('cash');
  const [wbal, setWbal] = useState<{ bix: number; usdt: number } | null>(null);
  useEffect(() => { if (uid) void supabase.rpc('bix_asset_balances', { p_user: uid }).then(({ data }) => { const r = (data as { bix_balance: number; usdt_balance: number }[] | null)?.[0]; setWbal({ bix: Number(r?.bix_balance ?? 0), usdt: Number(r?.usdt_balance ?? 0) }); }); }, [uid]);
  const methods = (['bix', 'usdt', 'qris', 'bank', 'cash'] as PayMethod[]).filter(m => m === 'bix' ? outlet.accept_bix : m === 'usdt' ? outlet.accept_usdt : m === 'qris' ? !!outlet.qris_path : m === 'bank' ? !!outlet.bank_account : true);
  const [when, setWhen] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void supabase.from('bixcare_services').select('*').eq('outlet_id', outlet.id).eq('available', true).order('price_idr').then(({ data }) => setServices((data ?? []) as Service[])); }, [outlet.id]);
  const total = services.reduce((s, x) => s + x.price_idr * (qty[x.id] ?? 0), 0);
  const quote = payQuote(total);
  const short = pay === 'bix' ? (wbal?.bix ?? 0) < quote.bix : pay === 'usdt' ? (wbal?.usdt ?? 0) < quote.usdt : false;
  const book = async () => {
    setBusy(true); setMsg('');
    const items = Object.entries(qty).filter(([, n]) => n > 0).map(([id, n]) => ({ id, qty: n }));
    const { error } = await supabase.rpc('bixcare_order_place', { p_outlet: outlet.id, p_items: items, p_pay: pay, p_schedule: when ? new Date(when).toISOString() : null as unknown as string, p_note: note });
    setBusy(false);
    if (error) setMsg(error.message); else onBooked();
  };
  return (
    <>
      <button onClick={onBack} className={ghost}>← Semua outlet</button>
      <div className={card}><p className="text-xs text-primary">{divName(outlet.division)}</p><h2 className="text-xl font-black">{outlet.name}</h2><p className="text-xs text-muted-foreground">{outlet.address}, {outlet.city} · {outlet.open_time}–{outlet.close_time}</p>{outlet.description && <p className="mt-2 text-sm">{outlet.description}</p>}
        {!outlet.is_open && <p className="mt-2 text-xs font-bold text-destructive">Outlet sedang TUTUP — pemesanan dibuka saat mitra online.</p>}
        {outlet.phone && <a href={`https://wa.me/${outlet.phone.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(`Halo ${outlet.name}, saya dari BIXCARE ingin bertanya.`)}`} target="_blank" rel="noreferrer" className={`${ghost} mt-2 inline-block`}>Chat WhatsApp mitra</a>}
      </div>
      <div className={card}>
        <p className="mb-2 text-sm font-bold">Daftar harga resmi</p>
        {services.length === 0 && <p className="text-xs text-muted-foreground">Belum ada layanan.</p>}
        {services.map(s => (
          <div key={s.id} className="flex items-center gap-2 py-2">
            <div className="flex-1"><p className="text-sm font-semibold">{s.name}</p><p className="text-xs text-muted-foreground">{rp(s.price_idr)} / {s.unit} · ±{s.duration_min} mnt</p></div>
            <button className={ghost} onClick={() => setQty(p => ({ ...p, [s.id]: Math.max(0, (p[s.id] ?? 0) - 1) }))}>−</button>
            <span className="w-5 text-center text-sm">{qty[s.id] ?? 0}</span>
            <button className={ghost} onClick={() => setQty(p => ({ ...p, [s.id]: Math.min(20, (p[s.id] ?? 0) + 1) }))}>+</button>
          </div>
        ))}
      </div>
      {uid ? (
        <div className={`${card} space-y-3`}>
          <label className="block text-xs text-muted-foreground">Jadwal datang (opsional — lewati antrean)<input type="datetime-local" className={`${input} mt-1`} value={when} onChange={e => setWhen(e.target.value)} /></label>
          <input className={input} placeholder="Catatan (plat nomor, jenis kendaraan, dll.)" value={note} onChange={e => setNote(e.target.value)} />
          <p className="text-xs font-bold">Metode pembayaran</p>
          <div className="grid grid-cols-2 gap-2">{methods.map(p => <button key={p} onClick={() => setPay(p)} className={`rounded-xl px-2 py-2 text-left text-xs font-bold ${pay === p ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>{PAY_LABEL[p]}{p === 'bix' && <span className="block text-[10px] font-normal opacity-80">{quote.bix} BIX · saldo {wbal?.bix.toFixed(2) ?? '…'}</span>}{p === 'usdt' && <span className="block text-[10px] font-normal opacity-80">{quote.usdt} USDT · saldo {wbal?.usdt.toFixed(2) ?? '…'}</span>}</button>)}</div>
          <p className="text-[11px] text-muted-foreground">{isWalletPay(pay) ? 'Saldo ditahan otomatis saat pesan dan diteruskan ke mitra setelah order Selesai. Batal/ditolak = saldo kembali penuh.' : pay === 'cash' ? 'Bayar tunai langsung ke mitra.' : 'Setelah pesan, buka Pesanan Saya untuk melihat QRIS/rekening mitra, bayar, lalu tekan "Saya sudah bayar".'}</p>
          {short && <p className="text-xs text-destructive">Saldo tidak cukup untuk metode ini.</p>}
          <div className="flex items-center justify-between"><span className="text-lg font-black text-primary">{rp(total)}</span><button className={btn} disabled={busy || total <= 0 || short || !outlet.is_open} onClick={book}>Pesan sekarang</button></div>
          {msg && <p className="text-xs text-destructive">{msg}</p>}
        </div>
      ) : <SignIn />}
    </>
  );
}

function Tracker({ o, division }: { o: CareOrder; division?: Division | undefined }) {
  const stages = STAGES[division ?? 'wash'];
  const idx = o.status === 'completed' ? stages.length : stages.indexOf(o.stage);
  return <div className="mt-2 flex gap-1">{stages.map((s, i) => <div key={s} className="flex-1"><div className={`h-1.5 rounded-full ${i <= idx ? 'bg-primary' : 'bg-muted'}`} /><p className="mt-1 text-[9px] leading-tight text-muted-foreground">{s}</p></div>)}</div>;
}

function PayBadge({ o }: { o: CareOrder }) {
  const closed = o.status === 'cancelled' || o.status === 'rejected';
  const t = isWalletPay(o.pay_method)
    ? (closed ? 'Saldo dikembalikan' : o.status === 'completed' ? 'Dibayar ke mitra' : 'Saldo ditahan (aman)')
    : o.pay_method === 'cash' ? 'Bayar di tempat' : o.paid_at ? `Konfirmasi bayar terkirim${o.pay_ref ? ` · ${o.pay_ref}` : ''}` : 'Belum dikonfirmasi bayar';
  return <span className="mt-1 inline-block rounded-full border border-primary/40 px-2 py-0.5 text-[10px] font-bold text-primary">{t}</span>;
}

function MyOrders({ uid }: { uid: string }) {
  const [orders, setOrders] = useState<CareOrder[]>([]);
  const [outlets, setOutlets] = useState<Record<string, Outlet>>({});
  const [qris, setQris] = useState<Record<string, string>>({});
  const [refs, setRefs] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const { data } = await supabase.from('bixcare_orders').select('*').eq('buyer_id', uid).order('created_at', { ascending: false }).limit(50);
    const list = (data ?? []) as unknown as CareOrder[]; setOrders(list);
    const ids = [...new Set(list.map(o => o.outlet_id))];
    if (ids.length) {
      const { data: os } = await supabase.from('bixcare_outlets').select('*').in('id', ids);
      const map: Record<string, Outlet> = {}; (os ?? []).forEach(o => { map[o.id] = o as Outlet; }); setOutlets(map);
      setQris(await signCare((os ?? []).map(o => o.qris_path)));
    }
  }, [uid]);
  useEffect(() => { void load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  const cancel = async (id: string) => { await supabase.rpc('bixcare_order_set', { p_id: id, p_status: 'cancelled', p_stage: '' }); void load(); };
  if (!orders.length) return <div className={`${card} text-sm text-muted-foreground`}>Belum ada pesanan.</div>;
  return <>{orders.map(o => { const ot = outlets[o.outlet_id]; return (
    <div key={o.id} className={card}>
      <div className="flex justify-between"><p className="font-bold">{ot?.name ?? 'Outlet'}</p><span className="text-xs font-bold text-primary">{CARE_STATUS[o.status]}</span></div>
      <p className="text-xs text-muted-foreground">{o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</p>
      <p className="text-sm font-bold">{rp(o.total_idr)} · {PAY_LABEL[o.pay_method]}{o.pay_method === 'bix' ? ` · ${o.fare_bix} BIX` : o.pay_method === 'usdt' ? ` · ${o.fare_usdt} USDT` : ''}</p>
      <PayBadge o={o} />
      {!['cancelled', 'rejected'].includes(o.status) && <Tracker o={o} division={ot?.division} />}
      {o.pay_method === 'qris' && ot?.qris_path && qris[ot.qris_path] && !['completed', 'cancelled', 'rejected'].includes(o.status) && (
        <details className="mt-2"><summary className="flex cursor-pointer items-center gap-1 text-xs font-bold text-primary"><QrCode className="h-4 w-4" />Tampilkan QRIS mitra</summary><img src={qris[ot.qris_path]} alt="QRIS mitra" className="mx-auto mt-2 max-h-72 rounded-xl" /><p className="text-center text-[10px] text-muted-foreground">Bayar {rp(o.total_idr)} langsung ke mitra.</p></details>
      )}
      {o.pay_method === 'bank' && ot && !['completed', 'cancelled', 'rejected'].includes(o.status) && (
        <div className="mt-2 rounded-xl border border-border/60 p-2 text-xs"><p className="font-bold">{ot.bank_name}</p><p className="font-mono text-sm">{ot.bank_account}</p><p className="text-muted-foreground">a.n. {ot.bank_holder}</p><button className={`${ghost} mt-1`} onClick={() => void navigator.clipboard?.writeText(ot.bank_account)}>Salin nomor</button></div>
      )}
      {(o.pay_method === 'bank' || o.pay_method === 'qris') && !o.paid_at && !['completed', 'cancelled', 'rejected'].includes(o.status) && (
        <div className="mt-2 flex gap-2"><input className={input} placeholder="No. referensi (opsional)" value={refs[o.id] ?? ''} onChange={e => setRefs({ ...refs, [o.id]: e.target.value })} /><button className={btn} onClick={() => void supabase.rpc('bixcare_order_paid', { p_id: o.id, p_ref: refs[o.id] ?? '' }).then(load)}>Saya sudah bayar</button></div>
      )}
      {careNext(o.status, 'buyer').includes('cancelled') && <button className={`${ghost} mt-2`} onClick={() => cancel(o.id)}>Batalkan</button>}
    </div>); })}</>;
}

const emptyOutlet = { name: '', division: 'wash' as Division, city: '', address: '', phone: '', description: '', open_time: '08:00', close_time: '20:00', bank_name: '', bank_account: '', bank_holder: '', accept_bix: true, accept_usdt: true };

function Partner({ uid, owner1 }: { uid: string; owner1: boolean }) {
  const [outlet, setOutlet] = useState<Outlet | null | undefined>(undefined);
  const [form, setForm] = useState(emptyOutlet);
  const [bal, setBal] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [urls, setUrls] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const { data } = await supabase.from('bixcare_outlets').select('*').eq('owner_id', uid).maybeSingle();
    setOutlet((data as Outlet) ?? null);
    if (data) { setForm({ name: data.name, division: data.division as Division, city: data.city, address: data.address, phone: data.phone, description: data.description, open_time: data.open_time, close_time: data.close_time, bank_name: data.bank_name, bank_account: data.bank_account, bank_holder: data.bank_holder, accept_bix: data.accept_bix, accept_usdt: data.accept_usdt }); setUrls(await signCare([data.logo_path, data.qris_path])); }
    const { data: b } = await supabase.rpc('bix_asset_balances', { p_user: uid });
    setBal(Number((b as { bix_balance: number }[] | null)?.[0]?.bix_balance ?? 0));
  }, [uid]);
  useEffect(() => { void load(); }, [load]);
  const save = async () => {
    setMsg('');
    if (form.name.trim().length < 2 || !form.city.trim()) return setMsg('Isi nama outlet dan kota.');
    const payload = { ...form, name: form.name.trim() };
    const { error } = outlet
      ? await supabase.from('bixcare_outlets').update({ ...payload, ...(outlet.status === 'rejected' ? { status: 'pending' } : {}) }).eq('id', outlet.id)
      : await supabase.from('bixcare_outlets').insert({ ...payload, owner_id: uid });
    setMsg(error ? error.message : 'Tersimpan. Menunggu persetujuan Owner 1.'); void load();
  };
  const upload = async (field: 'logo_path' | 'qris_path', f?: File) => {
    if (!f || !outlet) return;
    try { const p = await uploadCareFile(uid, f); await supabase.from('bixcare_outlets').update(field === 'logo_path' ? { logo_path: p } : { qris_path: p }).eq('id', outlet.id); void load(); } catch (e) { setMsg((e as Error).message); }
  };
  const toggle = async () => {
    if (!outlet) return;
    const { error } = await supabase.rpc('bixcare_set_open', { p_open: !outlet.is_open });
    setMsg(error ? error.message : ''); void load();
  };
  if (outlet === undefined) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  return (
    <>
      {owner1 && <OwnerReview />}
      <div className={`${card} space-y-1`}>
        <p className="flex items-center gap-2 text-sm font-bold"><Fuel className="h-4 w-4 text-primary" />BIX Gas Tank</p>
        <p className="text-2xl font-black text-primary">{bal === null ? '…' : bal.toLocaleString('en-US', { maximumFractionDigits: 4 })} BIX</p>
        <p className="text-[11px] text-muted-foreground">Bayar saldo BIX/USDT: dana konsumen ditahan, lalu masuk ke saldo Anda dikurangi biaya platform saat order Selesai. QRIS/transfer/tunai: konsumen bayar langsung ke Anda; saat order ditandai Selesai, biaya platform (AutoCare/Rent 2%, Wash/Laundry 3%) dipotong otomatis dalam BIX dari saldo Anda. Minimal {MIN_GAS_BIX} BIX agar outlet bisa BUKA; di bawah itu outlet tutup otomatis.</p>
        <Link to="/wallet" className={`${ghost} mt-2 inline-block`}>Isi ulang BIX</Link>
      </div>
      <div className={`${card} space-y-2`}>
        <div className="flex items-center justify-between"><p className="font-bold">{outlet ? 'Outlet saya' : 'Daftarkan usaha Anda'}</p>{outlet && <span className="text-xs font-bold text-primary">{CARE_STATUS[outlet.status]}</span>}</div>
        {outlet?.status === 'rejected' && <p className="text-xs text-destructive">Ditolak: {outlet.review_note} — perbaiki lalu simpan untuk ajukan ulang.</p>}
        <input className={input} placeholder="Nama outlet" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <select className={input} value={form.division} onChange={e => setForm({ ...form, division: e.target.value as Division })}>{DIVS.map(d => <option key={d.id} value={d.id}>{d.name} — {d.tag}</option>)}</select>
        <div className="grid grid-cols-2 gap-2"><input className={input} placeholder="Kota" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /><input className={input} placeholder="WhatsApp" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
        <input className={input} placeholder="Alamat & patokan" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
        <textarea className={input} placeholder="Deskripsi singkat" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-2"><input type="time" className={input} value={form.open_time} onChange={e => setForm({ ...form, open_time: e.target.value })} /><input type="time" className={input} value={form.close_time} onChange={e => setForm({ ...form, close_time: e.target.value })} /></div>
        <p className="pt-2 text-xs font-bold">Pembayaran yang diterima</p>
        <div className="grid grid-cols-3 gap-2"><input className={input} placeholder="Bank (BCA, BRI…)" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} /><input className={input} placeholder="No. rekening" inputMode="numeric" value={form.bank_account} onChange={e => setForm({ ...form, bank_account: e.target.value.replace(/[^0-9 -]/g, '') })} /><input className={input} placeholder="Atas nama" value={form.bank_holder} onChange={e => setForm({ ...form, bank_holder: e.target.value })} /></div>
        <div className="flex gap-4 text-xs"><label className="flex items-center gap-1"><input type="checkbox" checked={form.accept_bix} onChange={e => setForm({ ...form, accept_bix: e.target.checked })} />Terima saldo BIX</label><label className="flex items-center gap-1"><input type="checkbox" checked={form.accept_usdt} onChange={e => setForm({ ...form, accept_usdt: e.target.checked })} />Terima saldo USDT</label></div>
        <p className="text-[10px] text-muted-foreground">QRIS diunggah di bawah setelah outlet tersimpan. Tunai selalu tersedia.</p>
        <button className={btn} onClick={save}>Simpan</button>
        {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      </div>
      {outlet && (
        <>
          <div className={`${card} grid grid-cols-2 gap-3`}>
            {(['logo_path', 'qris_path'] as const).map(f => (
              <label key={f} className="cursor-pointer text-center text-xs">
                {outlet[f] && urls[outlet[f]!] ? <img src={urls[outlet[f]!]} alt="" className="mx-auto h-24 w-24 rounded-xl object-cover" /> : <div className="mx-auto grid h-24 w-24 place-items-center rounded-xl border border-dashed border-border">{f === 'qris_path' ? <QrCode className="h-8 w-8 text-primary" /> : <Store className="h-8 w-8 text-primary" />}</div>}
                <span className="mt-1 block font-semibold">{f === 'logo_path' ? 'Foto outlet' : 'QRIS / rekening'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => upload(f, e.target.files?.[0])} />
              </label>
            ))}
          </div>
          <div className={`${card} flex items-center justify-between`}>
            <div><p className="font-bold">{outlet.is_open ? 'BUKA' : 'TUTUP'}</p><p className="text-[11px] text-muted-foreground">Tampil di radar publik saat BUKA.</p></div>
            <button className={btn} onClick={toggle} disabled={outlet.status !== 'approved'}>{outlet.is_open ? 'Tutup' : 'Buka'}</button>
          </div>
          <ServiceManager outlet={outlet} uid={uid} />
          <IncomingOrders outlet={outlet} onChange={load} />
        </>
      )}
    </>
  );
}

function ServiceManager({ outlet, uid }: { outlet: Outlet; uid: string }) {
  const [list, setList] = useState<Service[]>([]);
  const [f, setF] = useState({ name: '', unit: 'layanan', price_idr: '', duration_min: '30' });
  const load = useCallback(() => void supabase.from('bixcare_services').select('*').eq('outlet_id', outlet.id).order('created_at').then(({ data }) => setList((data ?? []) as Service[])), [outlet.id]);
  useEffect(() => { load(); }, [load]);
  const add = async () => {
    const price = Number(f.price_idr); if (!f.name.trim() || !(price >= 0)) return;
    await supabase.from('bixcare_services').insert({ outlet_id: outlet.id, owner_id: uid, name: f.name.trim(), unit: f.unit || 'layanan', price_idr: price, duration_min: Number(f.duration_min) || 30 });
    setF({ name: '', unit: 'layanan', price_idr: '', duration_min: '30' }); load();
  };
  return (
    <div className={`${card} space-y-2`}>
      <p className="font-bold">Daftar harga (anti-getok)</p>
      {list.map(s => (
        <div key={s.id} className="flex items-center gap-2 text-sm">
          <span className="flex-1">{s.name} <span className="text-xs text-muted-foreground">/ {s.unit}</span></span>
          <input type="number" defaultValue={s.price_idr} className={`${input} w-28`} onBlur={e => void supabase.from('bixcare_services').update({ price_idr: Number(e.target.value) }).eq('id', s.id)} />
          <button className={ghost} onClick={() => void supabase.from('bixcare_services').update({ available: !s.available }).eq('id', s.id).then(load)}>{s.available ? 'Aktif' : 'Off'}</button>
          <button className={ghost} onClick={() => void supabase.from('bixcare_services').delete().eq('id', s.id).then(load)}><Trash2 className="h-3 w-3" /></button>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2">
        <input className={input} placeholder="Nama jasa (mis. Ganti oli)" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <input className={input} placeholder="Satuan (kg/unit/hari)" value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })} />
        <input type="number" className={input} placeholder="Harga Rp" value={f.price_idr} onChange={e => setF({ ...f, price_idr: e.target.value })} />
        <input type="number" className={input} placeholder="Durasi menit" value={f.duration_min} onChange={e => setF({ ...f, duration_min: e.target.value })} />
      </div>
      <button className={btn} onClick={add}>Tambah layanan</button>
    </div>
  );
}

function IncomingOrders({ outlet, onChange }: { outlet: Outlet; onChange: () => void }) {
  const [orders, setOrders] = useState<CareOrder[]>([]);
  const [msg, setMsg] = useState('');
  const load = useCallback(() => void supabase.from('bixcare_orders').select('*').eq('outlet_id', outlet.id).order('created_at', { ascending: false }).limit(50).then(({ data }) => setOrders((data ?? []) as unknown as CareOrder[])), [outlet.id]);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  const act = async (o: CareOrder, status: string, stage = '') => {
    setMsg('');
    const { data, error } = await supabase.rpc('bixcare_order_set', { p_id: o.id, p_status: status, p_stage: stage });
    if (error) setMsg(error.message);
    else if (status === 'completed') { const r = data as { fee_bix?: number; closed?: boolean; merchant_bix?: number; merchant_usdt?: number }; setMsg(r.merchant_bix !== undefined ? `Selesai. ${r.merchant_bix} BIX masuk ke saldo Anda.` : r.merchant_usdt !== undefined ? `Selesai. ${r.merchant_usdt} USDT masuk ke saldo Anda.` : `Selesai. BIX Gas terpotong ${r.fee_bix} BIX.${r.closed ? ' Saldo di bawah minimum — outlet ditutup otomatis.' : ''}`); onChange(); }
    load();
  };
  const active = useMemo(() => orders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status)), [orders]);
  const done = orders.filter(o => o.status === 'completed');
  const label: Record<string, string> = { accepted: 'Terima', rejected: 'Tolak', in_progress: 'Mulai kerjakan', ready: 'Siap', completed: 'Selesai & bayar diterima' };
  return (
    <div className={`${card} space-y-3`}>
      <p className="font-bold">Order masuk ({active.length})</p>
      {msg && <p className="text-xs text-primary">{msg}</p>}
      {active.map(o => (
        <div key={o.id} className="rounded-xl border border-border/60 p-3">
          <div className="flex justify-between text-sm"><span className="font-semibold">{o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</span><span className="text-xs text-primary">{CARE_STATUS[o.status]}</span></div>
          <p className="text-xs text-muted-foreground">{rp(o.total_idr)} · {PAY_LABEL[o.pay_method]}{o.schedule_at ? ` · ${new Date(o.schedule_at).toLocaleString('id-ID')}` : ''} · {o.pay_method === 'bix' ? `Anda terima ${walletNet(o.fare_bix, outlet.division)} BIX` : o.pay_method === 'usdt' ? `Anda terima ${walletNet(o.fare_usdt, outlet.division)} USDT` : `gas ±${gasFeeBix(o.total_idr, outlet.division)} BIX`}</p>
          <PayBadge o={o} />
          {(o.pay_method === 'qris' || o.pay_method === 'bank') && <p className="text-[10px] text-muted-foreground">Cek mutasi QRIS/rekening Anda sebelum menyelesaikan order.</p>}
          {o.note && <p className="text-xs">“{o.note}”</p>}
          {['accepted', 'in_progress', 'ready'].includes(o.status) && <div className="mt-2 flex flex-wrap gap-1">{STAGES[outlet.division].map(s => <button key={s} onClick={() => act(o, o.status, s)} className={`rounded-full px-2 py-1 text-[10px] ${o.stage === s ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>{s}</button>)}</div>}
          <div className="mt-2 flex flex-wrap gap-2">{careNext(o.status, 'merchant').map(s => <button key={s} className={s === 'rejected' ? ghost : btn} onClick={() => act(o, s)}>{label[s]}</button>)}</div>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground">Selesai: {done.length} order · omzet {rp(done.reduce((s, o) => s + Number(o.total_idr), 0))} · diterima {done.reduce((s, o) => s + Number(o.merchant_bix), 0).toFixed(2)} BIX + {done.reduce((s, o) => s + Number(o.merchant_usdt), 0).toFixed(2)} USDT</p>
    </div>
  );
}

function OwnerReview() {
  const [list, setList] = useState<Outlet[]>([]);
  const load = useCallback(() => void supabase.from('bixcare_outlets').select('*').eq('status', 'pending').then(({ data }) => setList((data ?? []) as Outlet[])), []);
  useEffect(() => { load(); }, [load]);
  const review = async (o: Outlet, ok: boolean) => {
    const note = ok ? '' : window.prompt('Alasan penolakan?') ?? '';
    if (!ok && !note.trim()) return;
    await supabase.from('bixcare_outlets').update({ status: ok ? 'approved' : 'rejected', review_note: note }).eq('id', o.id); load();
  };
  return (
    <div className={`${card} space-y-2 border-primary/50`}>
      <p className="font-bold text-primary">Owner 1 · Mitra menunggu ({list.length})</p>
      {list.map(o => (
        <div key={o.id} className="flex items-center gap-2 text-sm">
          <div className="flex-1"><p className="font-semibold">{o.name}</p><p className="text-xs text-muted-foreground">{divName(o.division)} · {o.city} · {o.phone}</p></div>
          <button className={btn} onClick={() => review(o, true)}><Check className="h-4 w-4" /></button>
          <button className={ghost} onClick={() => review(o, false)}><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}
