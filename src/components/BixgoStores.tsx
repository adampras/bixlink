import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Minus, Plus, Store } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STATUS_LABEL, cartTotal, nextStatuses, rupiah, signPhotos, type Merchant, type MenuItem, type MerchantOrder } from '@/lib/bixgo-merchant';

const db = supabase as any;

/** Real member stores (approved + open) for BIXFood/BIXMart, menu, cart and cash order. */
export function BixgoStores() {
  const [stores, setStores] = useState<Merchant[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Merchant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [addr, setAddr] = useState(''); const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<(MerchantOrder & { store?: string })[]>([]);

  const load = async () => {
    const { data } = await db.from('bixgo_merchants').select('*').eq('status', 'approved').eq('is_open', true).order('updated_at', { ascending: false }).limit(40);
    setStores(data ?? []);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) { const { data: o } = await db.from('bixgo_merchant_orders').select('*').eq('buyer_id', u.user.id).order('created_at', { ascending: false }).limit(5); setMine(o ?? []); }
    setUrls(await signPhotos((data ?? []).flatMap((s: Merchant) => [s.banner_path, s.logo_path])));
  };
  useEffect(() => { void load(); }, []);
  const openStore = async (s: Merchant) => {
    setOpen(s); setCart({});
    const { data } = await db.from('bixgo_menu_items').select('*').eq('merchant_id', s.id).order('sort');
    setMenu(data ?? []); const u = await signPhotos((data ?? []).map((x: MenuItem) => x.photo_path)); setUrls(p => ({ ...p, ...u }));
  };
  const lines = menu.filter(i => cart[i.id]).map(i => ({ id: i.id, price: Number(i.price_idr), qty: cart[i.id]! }));
  const place = async () => {
    if (!open) return; setBusy(true);
    const { error } = await db.rpc('bixgo_merchant_order_place', { p_merchant: open.id, p_items: lines.map(l => ({ id: l.id, qty: l.qty })), p_address: addr, p_note: note });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Pesanan dikirim ke toko. Bayar tunai saat diterima.'); setOpen(null); void load();
  };
  const cancel = async (id: string) => { const { error } = await db.rpc('bixgo_merchant_order_set', { p_id: id, p_status: 'cancelled' }); if (error) toast.error(error.message); else void load(); };

  if (open) return <section className="px-3 pb-6">
    <button onClick={() => setOpen(null)} className="flex items-center gap-1 py-3 text-sm font-semibold"><ArrowLeft className="h-5 w-5"/>Kembali</button>
    {open.banner_path && urls[open.banner_path] && <img src={urls[open.banner_path]} alt={open.name} className="aspect-[2/1] w-full rounded-2xl object-cover"/>}
    <h2 className="mt-2 text-lg font-black">{open.name}</h2><p className="text-xs text-muted-foreground">{open.category} · {open.address} · {open.open_time}–{open.close_time}</p>
    <div className="mt-3 space-y-2">{menu.map(i => <div key={i.id} className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5 ${i.in_stock ? '' : 'opacity-50'}`}>
      {i.photo_path && urls[i.photo_path] ? <img src={urls[i.photo_path]} alt={i.name} className="h-16 w-16 rounded-xl object-cover"/> : <span className="h-16 w-16 rounded-xl bg-muted"/>}
      <div className="min-w-0 flex-1"><p className="text-sm font-bold">{i.name}</p><p className="line-clamp-1 text-[11px] text-muted-foreground">{i.description}</p><p className="text-sm font-bold">{rupiah(i.price_idr)}</p></div>
      {i.in_stock ? <div className="flex items-center gap-2"><button aria-label="Kurangi" onClick={() => setCart(c => ({ ...c, [i.id]: Math.max(0, (c[i.id] ?? 0) - 1) }))}><Minus className="h-4 w-4"/></button><b className="w-4 text-center text-sm">{cart[i.id] ?? 0}</b><button aria-label="Tambah" onClick={() => setCart(c => ({ ...c, [i.id]: (c[i.id] ?? 0) + 1 }))}><Plus className="h-4 w-4 text-primary"/></button></div> : <span className="text-[11px] font-bold">Habis</span>}
    </div>)}</div>
    {lines.length > 0 && <div className="sticky bottom-16 mt-3 space-y-2 rounded-2xl border border-primary/40 bg-card p-3 shadow-lg">
      <Input placeholder="Alamat antar lengkap" value={addr} onChange={e => setAddr(e.target.value)}/><Input placeholder="Catatan (opsional)" value={note} onChange={e => setNote(e.target.value)}/>
      <Button className="w-full" disabled={busy} onClick={place}>{busy && <Loader2 className="h-4 w-4 animate-spin"/>}Pesan · {rupiah(cartTotal(lines))} · Tunai</Button>
      <p className="text-[10px] text-muted-foreground">Harga final dihitung ulang dari menu toko. Ongkir disepakati dengan toko/driver.</p>
    </div>}
  </section>;

  return <section className="px-3 pt-4">
    {mine.length > 0 && <div className="mb-3 space-y-1.5"><p className="text-sm font-bold">Pesanan saya</p>{mine.map(o => <div key={o.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs"><span>#{o.id.slice(0, 6).toUpperCase()} · {rupiah(o.subtotal_idr)}</span><span className="flex items-center gap-2"><b className="text-primary">{STATUS_LABEL[o.status]}</b>{nextStatuses(o.status, 'buyer').length > 0 && <button className="underline" onClick={() => cancel(o.id)}>Batal</button>}</span></div>)}</div>}
    <p className="mb-2 flex items-center gap-1.5 text-sm font-bold"><Store className="h-4 w-4 text-primary"/>Toko member buka sekarang</p>
    {stores.length ? <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">{stores.map(s => <button key={s.id} onClick={() => openStore(s)} className="w-40 shrink-0 overflow-hidden rounded-2xl border border-border bg-card text-left">
      {(s.banner_path || s.logo_path) && urls[(s.banner_path || s.logo_path)!] ? <img src={urls[(s.banner_path || s.logo_path)!]} alt={s.name} className="aspect-[4/3] w-full object-cover"/> : <span className="grid aspect-[4/3] place-items-center bg-muted"><Store className="h-8 w-8 text-muted-foreground"/></span>}
      <div className="p-2"><p className="truncate text-[13px] font-bold">{s.name}</p><p className="truncate text-[11px] text-muted-foreground">{s.kind === 'food' ? 'BIXFood' : 'BIXMart'} · {s.city}</p></div></button>)}</div>
      : <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">Belum ada toko member yang buka. Punya usaha? Pilih "Saya Merchant" di atas.</p>}
  </section>;
}
