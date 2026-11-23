import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type CareOrder, type Outlet, careStats, careCode, rp, PAY_LABEL, MIN_GAS_BIX } from '@/lib/bixcare';

/** Lux neon stepper — reads the order's real stage only. */
export function CareStepper({ stages, idx }: { stages: string[]; idx: number }) {
  return <ol className="bxs-step" aria-label="Progres pesanan">{stages.map((s, i) => (
    <li key={s} className={i < idx ? 'is-done' : i === idx ? 'is-now' : ''}><span>{i < idx || idx >= stages.length ? '✓' : String(i + 1).padStart(2, '0')}</span><b>{s}</b></li>
  ))}</ol>;
}

/** Settlement voucher built from the recorded order lines; no invented tax or discounts. */
export function CareInvoice({ o, outletName }: { o: CareOrder; outletName: string }) {
  const d = new Date(o.completed_at ?? o.created_at);
  return (
    <div className="bxs-inv">
      <p className="bxs-kick">Settlement Voucher</p>
      <div className="flex items-start justify-between gap-2"><div><h3>Service Invoice</h3><p className="bxs-code">{careCode(o.id)}</p></div><span className="bxs-seal" aria-hidden>✦</span></div>
      <span className="bxs-paid">✓ PAID</span>
      <div className="mt-2 grid grid-cols-2 text-[11px]"><div><small>Mitra</small><p>{outletName}</p></div><div><small>Tanggal</small><p>{d.toLocaleDateString('id-ID')} · {d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p></div></div>
      <p className="bxs-kick mt-3">Rincian layanan</p>
      {o.items.map(i => <div key={i.id} className="bxs-line"><span>{i.qty}× {i.name}</span><b>{rp(i.price * i.qty)}</b></div>)}
      <div className="bxs-line bxs-total"><span>TOTAL PAID · {PAY_LABEL[o.pay_method]}</span><b>{rp(o.total_idr)}</b></div>
      {o.pay_method === 'bix' && <p className="text-right text-[11px] text-primary">{o.fare_bix} BIX</p>}
      {o.pay_method === 'usdt' && <p className="text-right text-[11px] text-primary">{o.fare_usdt} USDT</p>}
    </div>
  );
}

/** Executive dashboard header: real today's orders, revenue and gas health. */
export function CareExecStats({ outlet, balance, onToggle }: { outlet: Outlet; balance: number | null; onToggle: () => void }) {
  const [orders, setOrders] = useState<CareOrder[]>([]);
  useEffect(() => { void supabase.from('bixcare_orders').select('*').eq('outlet_id', outlet.id).order('created_at', { ascending: false }).limit(500).then(({ data }) => setOrders((data ?? []) as unknown as CareOrder[])); }, [outlet.id]);
  const now = new Date(); const s = careStats(orders, new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const queue = orders.filter(o => o.status === 'pending').length;
  const pct = balance === null ? 0 : Math.min(100, Math.round((balance / (MIN_GAS_BIX * 10)) * 100));
  return (
    <div className="bxs-exec">
      <p className="bxs-kick">Executive Dashboard</p><h3>{outlet.name}</h3>
      <button className={`bxs-switch ${outlet.is_open ? 'is-on' : ''}`} onClick={onToggle} disabled={outlet.status !== 'approved'} aria-pressed={outlet.is_open}><span>STORE OPEN</span><i /><span>CLOSED</span></button>
      <div className="bxs-stats">
        <div><small>Order hari ini</small><b>{s.orders}</b><em>selesai · antrean {queue}</em></div>
        <div><small>Omzet hari ini</small><b>{rp(s.omzet)}</b><em>{s.bix.toFixed(2)} BIX · {s.usdt.toFixed(2)} USDT</em></div>
        <div><small>Gas Tank</small><b>{balance === null ? '…' : `${pct}%`}</b><em>target {MIN_GAS_BIX * 10} BIX</em></div>
      </div>
    </div>
  );
}
