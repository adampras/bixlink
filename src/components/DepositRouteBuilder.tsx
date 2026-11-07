import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { GitBranch, Lock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { previewDepositRoute, setDepositQuotaRoute, setOwner1DepositLock, type RoutePreview } from '@/lib/deposit.functions';

/** Owner 1: type any ID → live network preview → save Model 1 (quota L6+) or Model 2 (whole branch). */
export function DepositRouteBuilder({ onMessage }: { onMessage: (m: string) => void }) {
  const preview = useServerFn(previewDepositRoute); const setQuota = useServerFn(setDepositQuotaRoute); const setLock = useServerFn(setOwner1DepositLock);
  const qc = useQueryClient();
  const [mode, setMode] = useState<'quota' | 'branch'>('quota');
  const [q, setQ] = useState(''); const [max, setMax] = useState(5);
  const [p, setP] = useState<RoutePreview | null>(null); const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = q.trim(); if (s.length < 2) { setP(null); return; }
    let live = true; setLoading(true);
    const t = setTimeout(() => { preview({ data: { q: s, max: mode === 'quota' ? max : 0 } }).then(r => { if (live) setP(r); }).catch(() => { if (live) setP({ found: false }); }).finally(() => { if (live) setLoading(false); }); }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [q, max, mode, preview]);

  const f = p && p.found ? p : null;
  const routed = f ? f.directs.filter(d => d.routed) : [];
  const routedTotal = mode === 'quota' ? routed.reduce((s, d) => s + 1 + d.team, 0) : (f ? 1 + f.team : 0);

  const save = async () => {
    if (!f) return; setBusy(true);
    try {
      const code = f.code ?? q.trim();
      if (mode === 'quota') await setQuota({ data: { code, max, on: true } }); else await setLock({ data: { code, lock: true } });
      await Promise.all([qc.invalidateQueries({ queryKey: ['deposit-quota-routes'] }), qc.invalidateQueries({ queryKey: ['owner1-deposit-locks'] })]);
      onMessage(mode === 'quota' ? `Tersimpan: direct ke-${max + 1} dst milik ${code} beserta jaringannya kini melihat wallet Admin 1.` : `Tersimpan: ${code} dan seluruh jaringannya kini melihat wallet Admin 1.`);
      setQ(''); setP(null);
    } catch (e) { onMessage(e instanceof Error ? e.message : 'Gagal.'); }
    setBusy(false);
  };

  return <div className="mt-5 rounded-xl border border-primary/50 p-3">
    <h4 className="flex items-center gap-2 text-sm font-black"><Search size={14}/> Atur jaringan → wallet deposit Admin 1</h4>
    <div className="mt-2 grid grid-cols-2 gap-2">
      <Button type="button" size="sm" variant={mode === 'quota' ? 'default' : 'outline'} onClick={() => setMode('quota')}><GitBranch size={13}/> Model 1 · Batas direct</Button>
      <Button type="button" size="sm" variant={mode === 'branch' ? 'default' : 'outline'} onClick={() => setMode('branch')}><Lock size={13}/> Model 2 · ID bebas</Button>
    </div>
    <p className="mt-2 text-[11px] text-muted-foreground">{mode === 'quota' ? 'Direct setelah batas (misal ke-6 dst) beserta anak, cucu, cicitnya dialihkan ke wallet Admin 1.' : 'ID ini sendiri beserta seluruh anak, cucu, cicitnya langsung dialihkan, berapa pun jumlah direct-nya.'}</p>
    <div className="mt-2 flex gap-2">
      <input className="form-input flex-1" placeholder="BIX-ID, angka, @username, atau email" value={q} onChange={e => setQ(e.target.value)}/>
      {mode === 'quota' && <input className="form-input w-20" type="number" min={0} aria-label="Batas direct" value={max} onChange={e => setMax(Math.max(0, Math.floor(Number(e.target.value) || 0)))}/>}
    </div>
    {loading && <p className="mt-2 text-xs text-muted-foreground">Mencari…</p>}
    {!loading && p && !p.found && <p className="mt-2 text-xs text-destructive">Member tidak ditemukan. Coba BIX-ID, angka saja, username, atau email.</p>}
    {!loading && f && <div className="mt-3 rounded-lg border border-border p-2 text-xs">
      <div className="font-bold">{f.name || f.username || '—'} <span className="font-mono text-primary">{f.code}</span></div>
      <div className="text-muted-foreground">@{f.username ?? '—'} · {f.email ?? '—'} · sponsor {f.sponsor ?? '—'}</div>
      <div className="mt-1 text-muted-foreground">{f.directs.length} direct · {f.team} total jaringan{f.locked ? ' · sudah Model 2' : ''}{f.quota != null ? ` · Model 1 aktif (batas ${f.quota})` : ''}</div>
      {mode === 'quota' && <ul className="mt-2 max-h-64 space-y-1 overflow-auto">{f.directs.map(d => <li key={d.rn} className={`flex justify-between rounded px-2 py-1 font-mono ${d.routed ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
        <span>{d.rn}. {d.code} {d.username ? `· ${d.username}` : ''}</span><span>+{d.team} cucu/cicit {d.routed ? '→ Admin 1' : '· tetap'}</span></li>)}
        {!f.directs.length && <li className="text-muted-foreground">Belum ada direct sponsor.</li>}</ul>}
      <p className="mt-2 font-bold">{routedTotal} akun akan melihat wallet deposit Admin 1.</p>
      <Button className="mt-2 w-full" disabled={busy} onClick={save}>{busy ? 'Menyimpan…' : mode === 'quota' ? `Simpan · direct ke-${max + 1} dst → Admin 1` : 'Simpan · ID + seluruh jaringan → Admin 1'}</Button>
    </div>}
  </div>;
}
