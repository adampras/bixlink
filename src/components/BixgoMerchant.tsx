import { useEffect, useState } from 'react';
import { Camera, Check, Loader2, Plus, Store, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { STATUS_LABEL, nextStatuses, rupiah, signPhotos, uploadMerchantPhoto, type Merchant, type MenuItem, type MerchantOrder } from '@/lib/bixgo-merchant';

const db = supabase as any;
const ACTION: Record<string, string> = { accepted: 'Terima & siapkan', rejected: 'Tolak', ready: 'Siap diambil', completed: 'Selesai' };
const blank = { name: '', kind: 'food' as 'food' | 'mart', category: '', city: '', address: '', landmark: '', phone: '', open_time: '08:00', close_time: '21:00' };

/** Member merchant portal: register a store, manage menu photos/prices/stock and process incoming orders. */
export function BixgoMerchant({ city, isAdmin }: { city: string; isAdmin: boolean }) {
  const [uid, setUid] = useState<string | null>(null);
  const [m, setM] = useState<Merchant | null>(null);
  const [form, setForm] = useState({ ...blank, city });
  const [items, setItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ name: '', description: '', category: 'Menu', price: '', file: null as File | null });
  const [tab, setTab] = useState<'orders' | 'menu' | 'store'>('orders');

  const load = async () => {
    const { data: u } = await supabase.auth.getUser(); const id = u.user?.id ?? null; setUid(id); if (!id) return;
    const { data: mm } = await db.from('bixgo_merchants').select('*').eq('owner_id', id).maybeSingle();
    setM(mm); if (mm) setForm({ name: mm.name, kind: mm.kind, category: mm.category, city: mm.city, address: mm.address, landmark: mm.landmark, phone: mm.phone, open_time: mm.open_time, close_time: mm.close_time });
    if (!mm) return;
    const [{ data: it }, { data: od }] = await Promise.all([
      db.from('bixgo_menu_items').select('*').eq('merchant_id', mm.id).order('sort').order('created_at'),
      db.from('bixgo_merchant_orders').select('*').eq('merchant_id', mm.id).order('created_at', { ascending: false }).limit(50),
    ]);
    setItems(it ?? []); setOrders(od ?? []);
    setUrls(await signPhotos([mm.logo_path, mm.banner_path, ...(it ?? []).map((x: MenuItem) => x.photo_path)]));
  };
  useEffect(() => { void load(); const t = setInterval(() => void load(), 15000); return () => clearInterval(t); }, []);

  const run = async (f: () => Promise<unknown>, ok?: string) => { setBusy(true); try { await f(); if (ok) toast.success(ok); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Gagal'); } finally { setBusy(false); } };
  const chk = ({ error }: { error: unknown }) => { if (error) throw error; };

  const saveStore = () => run(async () => {
    if (form.name.trim().length < 2 || form.address.trim().length < 5) throw new Error('Isi nama toko dan alamat');
    if (m) chk(await db.from('bixgo_merchants').update({ ...form, ...(m.status === 'rejected' ? { status: 'pending' } : {}) }).eq('id', m.id));
    else chk(await db.from('bixgo_merchants').insert({ ...form, owner_id: uid }));
  }, m ? 'Toko disimpan' : 'Pendaftaran dikirim, menunggu persetujuan operator');
  const setPhoto = (col: 'logo_path' | 'banner_path', f?: File) => f && m && uid && run(async () => { const p = await uploadMerchantPhoto(uid, f); chk(await db.from('bixgo_merchants').update({ [col]: p }).eq('id', m.id)); }, 'Foto diperbarui');
  const addItem = () => run(async () => {
    const price = Number(draft.price); if (!m || !uid) return;
    if (!draft.name.trim() || !(price > 0)) throw new Error('Isi nama menu dan harga');
    const photo_path = draft.file ? await uploadMerchantPhoto(uid, draft.file) : null;
    chk(await db.from('bixgo_menu_items').insert({ merchant_id: m.id, name: draft.name.trim(), description: draft.description.trim(), category: draft.category.trim() || 'Menu', price_idr: price, photo_path, sort: items.length }));
    setDraft({ name: '', description: '', category: draft.category, price: '', file: null });
  }, 'Menu ditambahkan');

  if (!uid) return <p className="p-4 text-sm text-muted-foreground">Masuk untuk membuka toko di BIXGO.</p>;
  const F = (k: keyof typeof form, label: string, type = 'text') => <label className="block text-xs font-semibold">{label}<Input type={type} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} className="mt-1"/></label>;

  const storeForm = <div className="space-y-2.5">
    {m && m.status !== 'approved' && <p className="rounded-xl bg-muted p-2.5 text-xs">Status: <b>{STATUS_LABEL[m.status]}</b>{m.review_note && <> — {m.review_note}</>}{m.status === 'rejected' && ' · Perbaiki lalu simpan untuk mengajukan ulang.'}</p>}
    {F('name', 'Nama warung / toko')}
    <div className="grid grid-cols-2 gap-2">{(['food', 'mart'] as const).map(k => <button key={k} type="button" onClick={() => setForm({ ...form, kind: k })} className={`rounded-xl border py-2 text-xs font-bold ${form.kind === k ? 'border-primary bg-primary/15 text-primary' : 'border-border'}`}>{k === 'food' ? 'Kuliner (BIXFood)' : 'Toko (BIXMart)'}</button>)}</div>
    {F('category', 'Kategori (mis. Ayam, Kopi, Sembako)')}{F('city', 'Kota')}{F('address', 'Alamat lengkap')}{F('landmark', 'Patokan untuk driver')}{F('phone', 'WhatsApp toko')}
    <div className="grid grid-cols-2 gap-2">{F('open_time', 'Buka', 'time')}{F('close_time', 'Tutup', 'time')}</div>
    {m && <div className="grid grid-cols-2 gap-2">{(['logo_path', 'banner_path'] as const).map(c => <label key={c} className="relative grid aspect-video cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-border text-xs text-muted-foreground">
      {m[c] && urls[m[c]!] ? <img src={urls[m[c]!]} alt="" className="absolute inset-0 h-full w-full object-cover"/> : <span className="flex items-center gap-1"><Camera className="h-4 w-4"/>{c === 'logo_path' ? 'Logo' : 'Foto depan'}</span>}
      <input type="file" accept="image/*" className="hidden" onChange={e => setPhoto(c, e.target.files?.[0])}/></label>)}</div>}
    <Button className="w-full" disabled={busy} onClick={saveStore}>{busy && <Loader2 className="h-4 w-4 animate-spin"/>}{m ? 'Simpan toko' : 'Daftarkan toko'}</Button>
  </div>;

  return <section className="space-y-3 px-3 pb-6 pt-2">
    {isAdmin && <MerchantApprovals/>}
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      {m?.logo_path && urls[m.logo_path] ? <img src={urls[m.logo_path]} alt="" className="h-12 w-12 rounded-xl object-cover"/> : <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary"><Store className="h-6 w-6"/></span>}
      <div className="min-w-0 flex-1"><p className="truncate font-bold">{m?.name || 'BIXGO Merchant'}</p><p className="text-xs text-muted-foreground">{m ? STATUS_LABEL[m.status] : 'Buka warung atau toko Anda di BIXGO'}</p></div>
      {m?.status === 'approved' && <label className="flex items-center gap-2 text-xs font-bold">{m.is_open ? 'BUKA' : 'TUTUP'}<Switch checked={m.is_open} onCheckedChange={v => run(async () => chk(await db.from('bixgo_merchants').update({ is_open: v }).eq('id', m.id)))}/></label>}
    </div>
    {!m ? <div className="rounded-2xl border border-border bg-card p-3">{storeForm}</div> : <>
      <div className="grid grid-cols-3 rounded-full border border-border bg-card p-1 text-xs font-bold">{([['orders', `Pesanan (${orders.filter(o => ['pending', 'accepted', 'ready'].includes(o.status)).length})`], ['menu', 'Menu'], ['store', 'Toko']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full py-2 ${tab === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{l}</button>)}</div>
      {tab === 'store' && <div className="rounded-2xl border border-border bg-card p-3">{storeForm}</div>}
      {tab === 'menu' && <div className="space-y-2">
        <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
          <p className="text-sm font-bold">Tambah menu / produk</p>
          <Input placeholder="Nama menu" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}/>
          <Input placeholder="Deskripsi singkat" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })}/>
          <div className="grid grid-cols-2 gap-2"><Input placeholder="Kategori" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}/><Input inputMode="numeric" placeholder="Harga (Rp)" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value.replace(/\D/g, '') })}/></div>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border p-2 text-xs text-muted-foreground"><Camera className="h-4 w-4"/>{draft.file?.name || 'Foto menu (opsional)'}<input type="file" accept="image/*" className="hidden" onChange={e => setDraft({ ...draft, file: e.target.files?.[0] ?? null })}/></label>
          <Button className="w-full" disabled={busy} onClick={addItem}><Plus className="h-4 w-4"/>Tambah</Button>
        </div>
        {items.map(it => <div key={it.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5">
          {it.photo_path && urls[it.photo_path] ? <img src={urls[it.photo_path]} alt="" className="h-14 w-14 rounded-xl object-cover"/> : <span className="h-14 w-14 rounded-xl bg-muted"/>}
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{it.name}</p><p className="text-[11px] text-muted-foreground">{it.category}</p>
            <Input inputMode="numeric" defaultValue={String(it.price_idr)} onBlur={e => { const v = Number(e.target.value.replace(/\D/g, '')); if (v > 0 && v !== Number(it.price_idr)) void run(async () => chk(await db.from('bixgo_menu_items').update({ price_idr: v }).eq('id', it.id)), 'Harga diperbarui'); }} className="mt-1 h-8 w-32 text-xs"/></div>
          <div className="flex flex-col items-end gap-1.5"><label className="flex items-center gap-1 text-[10px]">{it.in_stock ? 'Ada' : 'Habis'}<Switch checked={it.in_stock} onCheckedChange={v => run(async () => chk(await db.from('bixgo_menu_items').update({ in_stock: v }).eq('id', it.id)))}/></label>
            <button aria-label="Hapus menu" onClick={() => confirm(`Hapus ${it.name}?`) && run(async () => chk(await db.from('bixgo_menu_items').delete().eq('id', it.id)), 'Menu dihapus')}><Trash2 className="h-4 w-4 text-destructive"/></button></div>
        </div>)}
        {!items.length && <p className="text-center text-xs text-muted-foreground">Belum ada menu.</p>}
      </div>}
      {tab === 'orders' && <div className="space-y-2">
        {orders.map(o => <div key={o.id} className="rounded-2xl border border-border bg-card p-3 text-sm">
          <div className="flex justify-between"><b>#{o.id.slice(0, 6).toUpperCase()}</b><span className="text-xs font-bold text-primary">{STATUS_LABEL[o.status]}</span></div>
          <ul className="mt-1 text-xs">{o.items.map(l => <li key={l.id}>{l.qty}× {l.name} — {rupiah(l.price * l.qty)}</li>)}</ul>
          <p className="mt-1 text-xs text-muted-foreground">{o.address}{o.note && ` · ${o.note}`}</p>
          <p className="mt-1 font-bold">{rupiah(o.subtotal_idr)} · Tunai</p>
          <div className="mt-2 flex gap-2">{nextStatuses(o.status, 'merchant').map(s => <Button key={s} size="sm" variant={s === 'rejected' ? 'outline' : 'default'} disabled={busy} onClick={() => run(async () => chk(await db.rpc('bixgo_merchant_order_set', { p_id: o.id, p_status: s })))}>{ACTION[s]}</Button>)}</div>
        </div>)}
        {!orders.length && <p className="py-6 text-center text-xs text-muted-foreground">{m.status === 'approved' ? (m.is_open ? 'Menunggu pesanan masuk…' : 'Nyalakan BUKA agar toko tampil di BIXFood / BIXMart.') : 'Toko akan tampil setelah disetujui operator.'}</p>}
      </div>}
    </>}
  </section>;
}

function MerchantApprovals() {
  const [rows, setRows] = useState<Merchant[]>([]);
  const load = async () => { const { data } = await db.from('bixgo_merchants').select('*').eq('status', 'pending').order('created_at'); setRows(data ?? []); };
  useEffect(() => { void load(); }, []);
  if (!rows.length) return null;
  const set = async (id: string, status: string) => {
    const note = status === 'rejected' ? prompt('Alasan penolakan') : '';
    if (status === 'rejected' && !note) return;
    const { error } = await db.from('bixgo_merchants').update({ status, review_note: note ?? '' }).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Disimpan'); void load(); }
  };
  return <div className="rounded-2xl border border-primary/40 bg-card p-3"><p className="mb-2 text-sm font-bold">Owner 1 · Persetujuan toko ({rows.length})</p>
    {rows.map(r => <div key={r.id} className="flex items-center gap-2 border-t border-border py-2 text-xs"><div className="min-w-0 flex-1"><b>{r.name}</b><p className="truncate text-muted-foreground">{r.city} · {r.address}</p></div>
      <Button size="sm" onClick={() => set(r.id, 'approved')}><Check className="h-3.5 w-3.5"/></Button><Button size="sm" variant="outline" onClick={() => set(r.id, 'rejected')}>Tolak</Button></div>)}
  </div>;
}
