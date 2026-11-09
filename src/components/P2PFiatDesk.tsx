import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Banknote, CheckCircle2, Clock, Copy, QrCode, ShieldCheck, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Ad = { id: string; seller_id: string; price_idr: number; remaining_bix: number; min_idr: number; methods: string[]; status: string };
type Order = { id: string; ad_id: string; seller_id: string; buyer_id: string; amount_bix: number; price_idr: number; total_idr: number; method: string; status: string; proof_path: string | null; note: string | null; expires_at: string; paid_at: string | null; created_at: string };
type Profile = { bank_name: string; bank_account: string; bank_holder: string; qris_path: string | null };

const rpc = async (fn: string, args: Record<string, unknown>) => { const { data, error } = await supabase.rpc(fn as never, args as never); if (error) throw new Error(error.message); return data as unknown; };
const idr = (n: number) => 'Rp' + Math.round(Number(n)).toLocaleString('id-ID');
const BANKS = ['BCA', 'Mandiri', 'BRI', 'BNI', 'BSI', 'CIMB Niaga', 'Permata', 'Danamon', 'Maybank', 'SeaBank', 'Jago', 'Lainnya'];

export const FIAT_STATUS: Record<string, { label: string; cls: string }> = {
  pending_pay: { label: 'Menunggu pembayaran pembeli', cls: 'bg-chart-3/15 text-chart-3' },
  paid: { label: 'Pembeli sudah bayar · penjual cek rekening', cls: 'bg-primary/15 text-primary' },
  disputed: { label: 'Banding · ditinjau admin', cls: 'bg-destructive/15 text-destructive' },
  released: { label: 'Selesai · BIX masuk ke pembeli', cls: 'bg-chart-2/15 text-chart-2' },
  cancelled: { label: 'Dibatalkan', cls: 'bg-muted text-muted-foreground' },
  expired: { label: 'Kedaluwarsa (lewat 15 menit)', cls: 'bg-muted text-muted-foreground' },
  refunded: { label: 'BIX dikembalikan ke penjual', cls: 'bg-muted text-muted-foreground' },
};

async function signed(path: string | null) { if (!path) return ''; const { data } = await supabase.storage.from('bix-p2p').createSignedUrl(path, 900); return data?.signedUrl ?? ''; }
async function upload(uid: string, kind: string, file: File) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Maksimal 5 MB');
  if (!/^image\//.test(file.type)) throw new Error('Hanya gambar');
  const path = `${uid}/${kind}-${Date.now()}.${(file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5)}`;
  const { error } = await supabase.storage.from('bix-p2p').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}
function useNow() { const [n, setN] = useState(Date.now()); useEffect(() => { const t = setInterval(() => setN(Date.now()), 1000); return () => clearInterval(t); }, []); return n; }

/** Member-to-member BIX sale paid by bank transfer / QRIS outside the app; BIX sits in escrow until the seller confirms receipt. */
export function P2PFiatDesk({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['p2p-fiat', userId], refetchInterval: () => (document.hidden ? false : 10_000),
    queryFn: async () => {
      await supabase.rpc('bix_p2p_fiat_expire' as never);
      const [ads, orders, prof] = await Promise.all([
        supabase.from('bix_p2p_fiat_ads' as never).select('*').in('status', ['open']).order('price_idr').limit(100),
        supabase.from('bix_p2p_fiat_orders' as never).select('*').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order('created_at', { ascending: false }).limit(30),
        supabase.from('bix_p2p_pay_profiles' as never).select('*').eq('user_id', userId).maybeSingle(),
      ]);
      return { ads: (ads.data ?? []) as unknown as Ad[], orders: (orders.data ?? []) as unknown as Order[], profile: (prof.data ?? null) as unknown as Profile | null };
    },
  });
  const [tab, setTab] = useState<'buy' | 'sell' | 'orders'>('buy');
  const [take, setTake] = useState<Ad | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['p2p-fiat'] }); qc.invalidateQueries({ queryKey: ['p2p-bal'] }); };
  const d = q.data;
  const active = (d?.orders ?? []).filter(o => ['pending_pay', 'paid', 'disputed'].includes(o.status)).length;
  const order = d?.orders.find(o => o.id === open) ?? null;

  return <section className="p2p-panel grid gap-3" aria-label="P2P Bank dan QRIS">
    <header className="flex items-center justify-between gap-2">
      <div><b className="text-sm tracking-wide">P2P BANK / QRIS · ANTAR MEMBER</b><p className="text-[11px] text-muted-foreground">BIX penjual dikunci di escrow · dilepas hanya setelah penjual cek uang masuk</p></div>
      <ShieldCheck size={20} className="shrink-0 text-chart-2" />
    </header>
    <div className="grid grid-cols-3 gap-1 rounded-xl border border-border p-1 text-xs font-bold">
      {(['buy', 'sell', 'orders'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`rounded-lg py-2 ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t === 'buy' ? 'Beli BIX' : t === 'sell' ? 'Jual BIX' : `Pesanan${active ? ` (${active})` : ''}`}</button>)}
    </div>

    {tab === 'buy' && <div className="grid gap-2">
      {(d?.ads ?? []).filter(a => a.seller_id !== userId).length === 0 && <p className="text-xs text-muted-foreground">Belum ada iklan jual Bank/QRIS. Jadilah yang pertama di tab Jual BIX.</p>}
      {(d?.ads ?? []).filter(a => a.seller_id !== userId).map(a => <button key={a.id} onClick={() => setTake(a)} className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2 text-left active:scale-[.98]">
        <span><b className="text-sm">Penjual ·{a.seller_id.slice(-5).toUpperCase()}</b><br /><small className="text-muted-foreground">Stok {Number(a.remaining_bix).toLocaleString()} BIX · min {idr(a.min_idr)} · {a.methods.map(m => m === 'bank' ? 'Bank' : 'QRIS').join(' / ')}</small></span>
        <span className="text-right"><b className="text-primary">{idr(a.price_idr)}</b><small className="block text-[10px] text-muted-foreground">per BIX</small><span className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">BELI</span></span>
      </button>)}
    </div>}

    {tab === 'sell' && <SellPanel userId={userId} profile={d?.profile ?? null} ads={(d?.ads ?? []).filter(a => a.seller_id === userId)} onDone={refresh} />}

    {tab === 'orders' && <div className="grid gap-2">
      {(d?.orders ?? []).length === 0 && <p className="text-xs text-muted-foreground">Belum ada pesanan.</p>}
      {(d?.orders ?? []).map(o => { const st = FIAT_STATUS[o.status] ?? { label: o.status, cls: '' }; return <button key={o.id} onClick={() => setOpen(o.id)} className="grid gap-1 rounded-xl border border-border bg-background/60 px-3 py-2 text-left text-xs">
        <span className="flex justify-between"><b>{o.buyer_id === userId ? 'Beli' : 'Jual'} {Number(o.amount_bix).toLocaleString()} BIX</b><b>{idr(o.total_idr)}</b></span>
        <span className={`w-fit rounded px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
      </button>; })}
    </div>}

    <ul className="grid gap-1 rounded-xl bg-background/50 p-3 text-[11px] text-muted-foreground">
      <li>🔒 BIX penjual dikunci sistem selama transaksi — tidak bisa dibatalkan sepihak.</li>
      <li>⏱️ Pembeli wajib bayar dalam 15 menit, jika tidak pesanan batal otomatis.</li>
      <li>🏦 Penjual: lepas BIX hanya setelah uang terlihat di mutasi m-Banking, jangan percaya foto struk saja.</li>
      <li>⚖️ Ada masalah? Tekan Banding — admin meninjau bukti dan memutuskan.</li>
      <li>🚫 Jangan transaksi di luar aplikasi atau ke rekening atas nama berbeda.</li>
    </ul>

    {take && <TakeDialog ad={take} onClose={() => setTake(null)} onDone={id => { setTake(null); refresh(); setTab('orders'); setOpen(id); }} />}
    {order && <OrderDialog order={order} userId={userId} onClose={() => setOpen(null)} onDone={refresh} />}
  </section>;
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[80] grid place-items-end bg-background/90 p-3 sm:place-items-center" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={title} className="grid max-h-[92dvh] w-full max-w-md gap-3 overflow-y-auto rounded-2xl border border-primary/40 bg-card p-4" onClick={e => e.stopPropagation()}>
      <div className="flex items-start justify-between"><b>{title}</b><button aria-label="Tutup" onClick={onClose}><X size={18} /></button></div>
      {children}
    </div>
  </div>;
}

function TakeDialog({ ad, onClose, onDone }: { ad: Ad; onClose: () => void; onDone: (id: string) => void }) {
  const [bix, setBix] = useState(''); const [method, setMethod] = useState(ad.methods[0] ?? 'bank'); const [busy, setBusy] = useState(false);
  const n = Number(bix) || 0; const total = Math.round(n * Number(ad.price_idr));
  const go = async () => { setBusy(true); try { const id = await rpc('bix_p2p_fiat_take', { p_ad: ad.id, p_amount: n, p_method: method }) as string; toast.success('Pesanan dibuat · bayar dalam 15 menit'); onDone(id); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } };
  return <Sheet title={`Beli BIX · ${idr(ad.price_idr)}/BIX`} onClose={onClose}>
    <label className="text-xs font-semibold">Jumlah BIX (stok {Number(ad.remaining_bix).toLocaleString()})<input inputMode="decimal" value={bix} onChange={e => setBix(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-base" /></label>
    <div className="flex gap-2">{ad.methods.map(m => <button key={m} onClick={() => setMethod(m)} className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-2 text-xs font-bold ${method === m ? 'border-primary text-primary' : 'border-border'}`}>{m === 'bank' ? <Banknote size={14} /> : <QrCode size={14} />}{m === 'bank' ? 'Transfer Bank' : 'QRIS'}</button>)}</div>
    <p className="rounded-lg bg-background p-2 text-sm">Total bayar <b className="text-primary">{idr(total)}</b><small className="block text-[10px] text-muted-foreground">Minimal {idr(ad.min_idr)} · rekening penjual muncul setelah pesanan dibuat</small></p>
    <button disabled={busy || n <= 0 || n > Number(ad.remaining_bix) || total < Number(ad.min_idr)} onClick={go} className="rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? 'Memproses…' : 'Buat pesanan & kunci BIX'}</button>
  </Sheet>;
}

function OrderDialog({ order: o, userId, onClose, onDone }: { order: Order; userId: string; onClose: () => void; onDone: () => void }) {
  const now = useNow(); const buyer = o.buyer_id === userId; const [busy, setBusy] = useState(false); const [ok, setOk] = useState(false);
  const [payee, setPayee] = useState<Profile & { method: string } | null>(null); const [qr, setQr] = useState(''); const [proof, setProof] = useState('');
  useEffect(() => {
    if (buyer && ['pending_pay', 'paid', 'disputed'].includes(o.status)) void rpc('bix_p2p_fiat_payee', { p_order: o.id }).then(async p => { const v = p as (Profile & { method: string }) | null; setPayee(v); if (v?.qris_path && o.method === 'qris') setQr(await signed(v.qris_path)); }).catch(() => {});
    void signed(o.proof_path).then(setProof);
  }, [o.id, o.status, o.proof_path, buyer, o.method]);
  const left = Math.max(0, new Date(o.expires_at).getTime() - now); const mm = String(Math.floor(left / 60000)).padStart(2, '0'); const ss = String(Math.floor(left / 1000) % 60).padStart(2, '0');
  const act = async (action: string, proofPath: string | null = null) => { setBusy(true); try { await rpc('bix_p2p_fiat_act', { p_order: o.id, p_action: action, p_proof: proofPath }); toast.success(action === 'release' ? 'BIX dilepas ke pembeli' : action === 'paid' ? 'Bukti terkirim · menunggu penjual' : action === 'dispute' ? 'Banding dikirim ke admin' : 'Pesanan dibatalkan'); onDone(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } };
  const sendProof = async (f: File | undefined) => { if (!f) return; setBusy(true); try { const p = await upload(userId, 'proof', f); setBusy(false); await act('paid', p); } catch (e) { toast.error((e as Error).message); setBusy(false); } };
  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success('Disalin'); };
  const st = FIAT_STATUS[o.status] ?? { label: o.status, cls: '' };
  return <Sheet title={`${buyer ? 'Beli' : 'Jual'} ${Number(o.amount_bix).toLocaleString()} BIX`} onClose={onClose}>
    <span className={`w-fit rounded px-2 py-1 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
    <p className="rounded-lg bg-background p-2 text-sm">Total <b className="text-primary">{idr(o.total_idr)}</b> · {idr(o.price_idr)}/BIX · {o.method === 'bank' ? 'Transfer Bank' : 'QRIS'}</p>
    {o.status === 'pending_pay' && <p className="flex items-center gap-1 text-xs font-bold text-chart-3"><Clock size={14} />Sisa waktu bayar {mm}:{ss}</p>}
    {o.note && <p className="text-xs text-muted-foreground">{o.note}</p>}

    {buyer && payee && o.status === 'pending_pay' && <div className="grid gap-2 rounded-xl border border-primary/30 bg-background p-3 text-xs">
      <b>1 · Transfer tepat {idr(o.total_idr)} ke penjual</b>
      {o.method === 'bank' ? <>
        <span>{payee.bank_name} · a.n. <b>{payee.bank_holder}</b></span>
        <button onClick={() => copy(payee.bank_account.replace(/\D/g, ''))} className="flex items-center justify-between rounded-lg bg-card p-2 font-mono text-sm">{payee.bank_account}<Copy size={14} /></button>
      </> : qr ? <img src={qr} alt="QRIS penjual" className="mx-auto max-h-64 rounded-lg bg-card" /> : <span>Memuat QRIS…</span>}
      <button onClick={() => copy(String(Math.round(o.total_idr)))} className="flex items-center justify-center gap-1 rounded-lg border border-border py-2 font-semibold"><Copy size={14} />Salin nominal</button>
      <small className="text-muted-foreground">Pastikan nama penerima sama. Jangan tulis kata “BIX/crypto” di berita transfer.</small>
      <b className="mt-1">2 · Unggah bukti transfer</b>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground"><Upload size={16} />{busy ? 'Mengirim…' : 'Saya sudah bayar · unggah bukti'}<input type="file" accept="image/*" className="hidden" disabled={busy} onChange={e => sendProof(e.target.files?.[0])} /></label>
      <button disabled={busy} onClick={() => act('cancel')} className="text-xs text-muted-foreground underline">Batalkan pesanan (belum bayar)</button>
    </div>}

    {proof && <a href={proof} target="_blank" rel="noreferrer" className="text-xs"><img src={proof} alt="Bukti transfer" className="max-h-56 rounded-lg border border-border" /><span className="underline">Lihat bukti transfer</span></a>}

    {!buyer && o.status === 'pending_pay' && <p className="text-xs text-muted-foreground">BIX Anda terkunci aman. Menunggu pembeli transfer dan mengunggah bukti.</p>}
    {!buyer && ['paid', 'disputed'].includes(o.status) && <div className="grid gap-2 rounded-xl border border-chart-3/40 bg-background p-3 text-xs">
      <p className="flex gap-1 font-bold text-chart-3"><AlertTriangle size={14} className="shrink-0" />Buka m-Banking Anda dulu. Foto struk bisa dipalsukan.</p>
      <label className="flex items-start gap-2"><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} className="mt-0.5" />Saya sudah membuka m-Banking dan dana {idr(o.total_idr)} benar-benar masuk di mutasi rekening saya.</label>
      <button disabled={busy || !ok} onClick={() => act('release')} className="flex items-center justify-center gap-2 rounded-xl bg-chart-2 py-3 font-bold text-background disabled:opacity-50"><CheckCircle2 size={16} />Konfirmasi & lepas BIX</button>
    </div>}
    {o.status === 'paid' && <button disabled={busy} onClick={() => act('dispute')} className="rounded-xl border border-destructive/50 py-2 text-xs font-bold text-destructive">Banding ke admin</button>}
  </Sheet>;
}

function SellPanel({ userId, profile, ads, onDone }: { userId: string; profile: Profile | null; ads: Ad[]; onDone: () => void }) {
  const [p, setP] = useState<Profile>({ bank_name: 'BCA', bank_account: '', bank_holder: '', qris_path: null });
  useEffect(() => { if (profile) setP(profile); }, [profile]);
  const [qrUrl, setQrUrl] = useState(''); useEffect(() => { void signed(p.qris_path).then(setQrUrl); }, [p.qris_path]);
  const [price, setPrice] = useState('7000'); const [amt, setAmt] = useState(''); const [min, setMin] = useState('50000');
  const [methods, setMethods] = useState<string[]>(['bank']); const [busy, setBusy] = useState(false);
  const hasBank = !!(profile?.bank_account && profile.bank_holder); const hasQr = !!profile?.qris_path;
  const saveProfile = async () => { setBusy(true); try { await rpc('bix_p2p_set_pay', { p_bank_name: p.bank_name, p_bank_account: p.bank_account, p_bank_holder: p.bank_holder, p_qris_path: p.qris_path ?? '' }); toast.success('Profil pembayaran tersimpan'); onDone(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } };
  const qrUp = async (f?: File) => { if (!f) return; try { const path = await upload(userId, 'qris', f); setP(v => ({ ...v, qris_path: path })); toast.message('QRIS terunggah · tekan Simpan'); } catch (e) { toast.error((e as Error).message); } };
  const post = async () => { setBusy(true); try { await rpc('bix_p2p_fiat_post', { p_price: Number(price), p_amount: Number(amt), p_min: Number(min), p_methods: methods }); toast.success('Iklan aktif · BIX dikunci di escrow'); setAmt(''); onDone(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } };
  const total = useMemo(() => Math.round((Number(amt) || 0) * (Number(price) || 0)), [amt, price]);
  const inp = 'mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm';
  return <div className="grid gap-3">
    <details className="rounded-xl border border-border p-3" open={!hasBank && !hasQr}>
      <summary className="cursor-pointer text-xs font-bold">Profil pembayaran {hasBank || hasQr ? '✓' : '(wajib diisi)'}</summary>
      <div className="mt-2 grid gap-2 text-xs">
        <label>Bank<select value={p.bank_name} onChange={e => setP({ ...p, bank_name: e.target.value })} className={inp}>{BANKS.map(b => <option key={b}>{b}</option>)}</select></label>
        <label>Nomor rekening<input inputMode="numeric" value={p.bank_account} onChange={e => setP({ ...p, bank_account: e.target.value })} className={inp} /></label>
        <label>Nama pemilik rekening (sesuai buku tabungan)<input value={p.bank_holder} onChange={e => setP({ ...p, bank_holder: e.target.value })} className={inp} /></label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border p-2"><QrCode size={16} />{p.qris_path ? 'Ganti gambar QRIS' : 'Unggah gambar QRIS (opsional)'}<input type="file" accept="image/*" className="hidden" onChange={e => qrUp(e.target.files?.[0])} /></label>
        {qrUrl && <img src={qrUrl} alt="QRIS saya" className="max-h-40 w-fit rounded-lg" />}
        <button disabled={busy} onClick={saveProfile} className="rounded-lg bg-primary py-2 font-bold text-primary-foreground disabled:opacity-50">Simpan profil</button>
        <small className="text-muted-foreground">Rekening hanya terlihat oleh pembeli yang sedang punya pesanan aktif dengan Anda.</small>
      </div>
    </details>
    <div className="grid gap-2 text-xs">
      <b>Pasang iklan jual BIX</b>
      <div className="grid grid-cols-2 gap-2">
        <label>Harga per BIX (Rp)<input inputMode="numeric" value={price} onChange={e => setPrice(e.target.value)} className={inp} /></label>
        <label>Jumlah BIX<input inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value)} className={inp} /></label>
      </div>
      <label>Minimal pembelian (Rp)<input inputMode="numeric" value={min} onChange={e => setMin(e.target.value)} className={inp} /></label>
      <div className="flex gap-2">{[['bank', 'Transfer Bank', hasBank], ['qris', 'QRIS', hasQr]].map(([k, l, en]) => <label key={k as string} className={`flex flex-1 items-center gap-2 rounded-lg border border-border p-2 ${en ? '' : 'opacity-50'}`}><input type="checkbox" disabled={!en} checked={methods.includes(k as string)} onChange={e => setMethods(m => e.target.checked ? [...m, k as string] : m.filter(x => x !== k))} />{l as string}</label>)}</div>
      <p className="rounded-lg bg-background p-2">Nilai iklan ≈ <b className="text-primary">{idr(total)}</b> · BIX langsung dikunci sampai terjual atau iklan ditutup.</p>
      <button disabled={busy || !(Number(amt) > 0) || !methods.length || (!hasBank && !hasQr)} onClick={post} className="rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">Pasang iklan</button>
    </div>
    {ads.length > 0 && <div className="grid gap-1"><small className="font-bold text-muted-foreground">IKLAN SAYA</small>
      {ads.map(a => <div key={a.id} className="flex items-center justify-between rounded-lg bg-background/50 px-2 py-1.5 text-xs"><span>{Number(a.remaining_bix).toLocaleString()} BIX @ {idr(a.price_idr)}</span><button disabled={busy} className="underline" onClick={async () => { try { await rpc('bix_p2p_fiat_close', { p_ad: a.id }); toast.success('Iklan ditutup · sisa BIX kembali'); onDone(); } catch (e) { toast.error((e as Error).message); } }}>Tutup</button></div>)}
    </div>}
  </div>;
}
