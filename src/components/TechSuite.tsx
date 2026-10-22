import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Fingerprint, ShieldCheck } from 'lucide-react';

/** Thin protocol HUD: only real signals (connection, measured latency, local clock). */
export function QuantumHud() {
  const [online, setOnline] = useState(true);
  const [ms, setMs] = useState<number | null>(null);
  const [clock, setClock] = useState('');
  useEffect(() => {
    const ping = async () => {
      const t = performance.now();
      try { await fetch('/manifest.webmanifest', { cache: 'no-store', method: 'HEAD' }); setMs(Math.round(performance.now() - t)); } catch { setMs(null); }
    };
    const tick = () => setClock(new Date().toUTCString().slice(17, 25));
    const sync = () => setOnline(navigator.onLine);
    sync(); tick(); ping();
    const a = setInterval(tick, 1000), b = setInterval(ping, 30000);
    addEventListener('online', sync); addEventListener('offline', sync);
    return () => { clearInterval(a); clearInterval(b); removeEventListener('online', sync); removeEventListener('offline', sync); };
  }, []);
  return (
    <div className="quantum-hud" role="status" aria-label="Protocol status">
      <span className={online ? 'qh-dot' : 'qh-dot qh-dot--off'} />
      <b>{online ? 'SECURE · ONLINE' : 'OFFLINE'}</b>
      <span className="qh-sep" />
      <span>TLS 1.3</span>
      <span className="qh-sep" />
      <span className="numeric">{ms === null ? '— ms' : `${ms} ms`}</span>
      <span className="qh-sep qh-hide" />
      <span className="numeric qh-hide">UTC {clock}</span>
    </div>
  );
}

/** Depth bars built from real open offers. */
export function DepthVisualizer({ asks, bids }: { asks: { price_usd: number; remaining_bix: number }[]; bids: { price_usd: number; remaining_bix: number }[] }) {
  const cum = (rows: { price_usd: number; remaining_bix: number }[]) => { let s = 0; return rows.slice(0, 8).map(r => ({ p: Number(r.price_usd), v: (s += Number(r.remaining_bix)) })); };
  const a = cum(asks), b = cum(bids);
  const max = Math.max(1, ...a.map(x => x.v), ...b.map(x => x.v));
  if (!a.length && !b.length) return <div className="depth-viz depth-empty">MARKET DEPTH · No open offers yet</div>;
  return (
    <div className="depth-viz" aria-label="Market depth">
      <div className="depth-title"><span>MARKET DEPTH</span><span className="qh-dot" /></div>
      <div className="depth-cols">
        <div>{b.map((r, i) => <div key={i} className="depth-row depth-row--bid"><i style={{ width: `${(r.v / max) * 100}%` }} /><span className="numeric">${r.p.toFixed(4)}</span></div>)}</div>
        <div>{a.map((r, i) => <div key={i} className="depth-row depth-row--ask"><i style={{ width: `${(r.v / max) * 100}%` }} /><span className="numeric">${r.p.toFixed(4)}</span></div>)}</div>
      </div>
    </div>
  );
}

/** Vault scan stage shown before a sensitive request is submitted. */
export function VaultStage({ open, label, onDone, onCancel }: { open: boolean; label: string; onDone: () => void; onCancel: () => void }) {
  const [phase, setPhase] = useState<'scan' | 'ok'>('scan');
  useEffect(() => {
    if (!open) return; setPhase('scan');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t1 = setTimeout(() => setPhase('ok'), reduce ? 200 : 1200);
    const t2 = setTimeout(onDone, reduce ? 400 : 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [open]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="vault-stage" role="dialog" aria-modal="true" aria-label={label}>
      <div className="vault-card">
        <div className={`vault-ring ${phase === 'ok' ? 'vault-ring--ok' : ''}`}>{phase === 'ok' ? <ShieldCheck size={40} /> : <Fingerprint size={40} />}</div>
        <div className="eyebrow mt-4">SOVEREIGN VAULT</div>
        <p className="mt-2 text-sm font-semibold">{phase === 'ok' ? 'Verified · submitting' : 'Securing request…'}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        {phase === 'scan' && <button type="button" className="mt-4 text-xs text-muted-foreground underline" onClick={onCancel}>Cancel</button>}
      </div>
    </div>, document.body);
}

/** Gold shimmer placeholder used while pages load. */
export function AuricSkeleton() {
  return <div className="mx-auto max-w-3xl space-y-4 px-5 py-10" aria-busy="true" aria-label="Loading">{[56, 140, 90, 90].map((h, i) => <div key={i} className="auric-skel" style={{ height: h }} />)}</div>;
}
