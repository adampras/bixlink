import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { BadgeCheck, CheckCircle2, ClipboardPaste, Clock, Copy, ShieldCheck, Wallet, X, XCircle } from 'lucide-react';
import { getFleetDesk, submitFleetBuy, recheckMyFleetOrder } from '@/lib/p2p-fleet.functions';
import type { FleetMerchant } from '@/lib/p2p-fleet';

const TX_RE = /^0x[0-9a-fA-F]{64}$/;

/** Official Desk: Owner 1 liquidity fleet. Member pays real USDT BEP-20 to their assigned wallet, submits TxID, BIX is credited after on-chain verification. */
export function P2PFleetDesk() {
  const qc = useQueryClient();
  const load = useServerFn(getFleetDesk); const submit = useServerFn(submitFleetBuy); const recheck = useServerFn(recheckMyFleetOrder);
  const q = useQuery({ queryKey: ['p2p-fleet'], queryFn: () => load(), refetchInterval: () => (document.hidden ? false : 60_000) });
  const [pick, setPick] = useState<FleetMerchant | null>(null);
  const [usdt, setUsdt] = useState('100'); const [tx, setTx] = useState(''); const [busy, setBusy] = useState(false);
  const d = q.data;
  if (!d?.enabled) return null;

  const done = (r: { status: string; reason?: string; bix?: number }) => {
    if (r.status === 'credited') { toast.success(`${r.bix?.toLocaleString()} BIX masuk ke wallet Anda`); setPick(null); setTx(''); }
    else if (r.status === 'pending') toast.message(`Menunggu konfirmasi blockchain. ${r.reason ?? ''}`);
    else toast.error(r.reason ?? 'Transfer tidak dapat diverifikasi.');
    qc.invalidateQueries({ queryKey: ['p2p-fleet'] }); qc.invalidateQueries({ queryKey: ['p2p-bal'] });
  };
  const send = async () => {
    if (!pick) return; setBusy(true);
    try { done(await submit({ data: { merchant: pick.name, txHash: tx.trim() } })); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const paste = async () => { try { setTx((await navigator.clipboard.readText()).trim()); } catch { toast.error('Tempel manual TxID'); } };
  const copy = (v: string, label: string) => { navigator.clipboard.writeText(v); toast.success(`${label} disalin`); };
  const amt = Number(usdt) || 0;
  const est = pick ? Math.floor(amt / pick.price * 100) / 100 : 0;
  const okAmt = amt >= d.minUsdt;
  const okTx = TX_RE.test(tx.trim());

  return <section id="official-desk" className="p2p-panel grid gap-3" aria-label="Official Desk">
    <header className="flex items-center justify-between gap-2">
      <div><b className="text-sm tracking-wide">OFFICIAL DESK · BELI BIX DENGAN USDT</b><p className="text-[11px] text-muted-foreground">Bayar USDT BEP-20 dari wallet Anda · BIX masuk otomatis setelah dicek di blockchain</p></div>
      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-1 text-[10px] font-bold text-primary">{d.merchants.length} ONLINE</span>
    </header>
    <ol className="grid grid-cols-3 gap-2 text-center text-[10px] text-muted-foreground">
      <li className="rounded-lg border border-border p-2"><b className="block text-primary">1</b>Pilih merchant</li>
      <li className="rounded-lg border border-border p-2"><b className="block text-primary">2</b>Kirim USDT</li>
      <li className="rounded-lg border border-border p-2"><b className="block text-primary">3</b>Tempel TxID</li>
    </ol>
    {!d.wallet && <p role="alert" className="rounded-lg border border-destructive/40 p-2 text-xs text-destructive">Alamat pembayaran USDT BEP-20 belum tersedia untuk akun Anda. Hubungi admin.</p>}
    <div className="grid max-h-80 gap-2 overflow-y-auto">
      {d.merchants.map(m => <button key={m.name} disabled={!d.wallet} onClick={() => { setPick(m); setTx(''); }} className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2 text-left transition hover:border-primary active:scale-[.98] disabled:opacity-50">
        <span><b className="text-sm">{m.name}</b> <BadgeCheck size={13} className="inline text-chart-2" /><br /><small className="text-muted-foreground">{m.fills} transaksi · 99% selesai · stok {m.stockBix.toLocaleString()} BIX</small></span>
        <span className="text-right"><b className="text-primary">${m.price.toFixed(4)}</b><br /><span className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">BELI</span></span>
      </button>)}
    </div>
    {d.orders.length > 0 && <div className="grid gap-1">
      <small className="font-bold text-muted-foreground">PESANAN SAYA</small>
      {d.orders.map((o: any) => <div key={o.id} className="flex items-center justify-between gap-2 rounded-lg bg-background/50 px-2 py-1.5 text-xs">
        <span className="min-w-0"><b>{o.merchant}</b> · {Number(o.usdt) || '—'} USDT<br /><small className="font-mono text-muted-foreground">{String(o.tx_hash).slice(0, 10)}…{String(o.tx_hash).slice(-6)}</small>{o.note && o.status === 'rejected' && <small className="block text-destructive">{o.note}</small>}</span>
        <span className="flex shrink-0 items-center gap-1">
          {o.status === 'credited' ? <><CheckCircle2 size={14} className="text-chart-2" /><b className="text-chart-2">+{Number(o.bix).toLocaleString()} BIX</b></>
            : o.status === 'rejected' ? <><XCircle size={14} className="text-destructive" /><span className="text-destructive">Ditolak</span></>
            : <><Clock size={14} className="text-chart-3" /><span>Menunggu</span><button className="ml-1 rounded border border-border px-1.5 py-0.5 underline" onClick={async () => { try { done(await recheck({ data: { id: o.id } })); } catch (e) { toast.error((e as Error).message); } }}>Cek</button></>}
        </span>
      </div>)}
    </div>}
    <p className="text-[10px] text-muted-foreground">Merchant Official Desk adalah akun likuiditas resmi BIXLINK. BIX adalah aset ledger internal; BIX hanya dikirim setelah transfer USDT terkonfirmasi di BNB Smart Chain. Satu TxID hanya bisa dipakai sekali.</p>

    {pick && d.wallet && <div className="fixed inset-0 z-[80] grid place-items-end bg-background/90 p-3 sm:place-items-center" onClick={() => setPick(null)}>
      <div role="dialog" aria-modal="true" aria-label={`Beli dari ${pick.name}`} className="grid max-h-[92dvh] w-full max-w-md gap-3 overflow-y-auto rounded-2xl border border-primary/40 bg-card p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between"><div><b>Beli BIX · {pick.name}</b><p className="text-[11px] text-muted-foreground">Harga ${pick.price.toFixed(4)} / BIX · minimal {d.minUsdt} USDT</p></div><button aria-label="Tutup" onClick={() => setPick(null)}><X size={18} /></button></div>

        <label className="text-xs font-semibold">1 · Jumlah USDT yang akan dibayar
          <input inputMode="decimal" value={usdt} onChange={e => setUsdt(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-base" />
        </label>
        <div className="flex gap-2">{[25, 50, 100, 500].map(v => <button key={v} onClick={() => setUsdt(String(v))} className="flex-1 rounded-lg border border-border py-1 text-xs active:scale-95">{v}</button>)}</div>
        <p className="rounded-lg bg-background p-2 text-sm">Anda menerima ≈ <b className="text-primary">{est.toLocaleString()} BIX</b> <small className="block text-[10px] text-muted-foreground">Jumlah akhir dihitung dari USDT yang benar-benar diterima.</small></p>
        {!okAmt && <p className="text-xs text-destructive">Minimal {d.minUsdt} USDT.</p>}

        <div className="grid gap-2 rounded-xl border border-primary/30 bg-background p-3 text-xs">
          <span className="flex items-center gap-1 font-semibold"><Wallet size={14} />2 · Kirim tepat <b className="text-primary">{amt || 0} USDT</b> ke alamat ini</span>
          <span className="w-fit rounded bg-chart-3/15 px-2 py-0.5 text-[10px] font-bold text-chart-3">JARINGAN: BNB SMART CHAIN (BEP-20) SAJA</span>
          <code className="break-all rounded-lg bg-card p-2 text-sm select-text">{d.wallet.address}</code>
          <div className="flex gap-2">
            <button className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border py-2 font-semibold active:scale-95" onClick={() => copy(d.wallet!.address, 'Alamat')}><Copy size={14} />Salin alamat</button>
            <button className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border py-2 font-semibold active:scale-95" onClick={() => copy(String(amt), 'Jumlah')}><Copy size={14} />Salin jumlah</button>
          </div>
          <small className="text-muted-foreground">Kirim dari TokenPocket, Trust Wallet, MetaMask atau exchange. Jaringan lain (TRC-20/ERC-20) akan hilang.</small>
        </div>

        <label className="text-xs font-semibold">3 · Tempel TxID (hash transaksi) setelah transfer
          <div className="mt-1 flex gap-2">
            <input value={tx} onChange={e => setTx(e.target.value)} placeholder="0x… (66 karakter)" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm" />
            <button type="button" onClick={paste} aria-label="Tempel" className="rounded-lg border border-border px-3"><ClipboardPaste size={16} /></button>
          </div>
        </label>
        {tx && !okTx && <p className="text-xs text-destructive">TxID BEP-20 harus diawali 0x dan 66 karakter.</p>}
        <button disabled={busy || !okTx || !okAmt} onClick={send} className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"><ShieldCheck size={16} /> {busy ? 'Memverifikasi di blockchain…' : 'Verifikasi & terima BIX'}</button>
        <p className="text-[10px] text-muted-foreground">Jika transaksi belum terkonfirmasi, pesanan tersimpan sebagai "Menunggu" — tekan Cek nanti di daftar Pesanan Saya.</p>
      </div>
    </div>}
  </section>;
}
