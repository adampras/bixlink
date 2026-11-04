import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { GitBranch, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { networkInsert, networkLookup, networkMove } from '@/lib/network-editor.functions';

type Info = { code: string; email: string | null; sponsor: string | null; direct: number; team: number };

export function AdminNetworkEditor({ onMessage }: { onMessage: (m: string) => void }) {
  const lookup = useServerFn(networkLookup); const move = useServerFn(networkMove); const insert = useServerFn(networkInsert); const qc = useQueryClient();
  const [q, setQ] = useState(''); const [info, setInfo] = useState<Info | null>(null);
  const [sponsor, setSponsor] = useState(''); const [child, setChild] = useState(''); const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); onMessage(ok); await qc.invalidateQueries(); if (info) setInfo(await lookup({ data: { code: info.code } })); }
    catch (e) { onMessage(e instanceof Error ? e.message : 'Failed.'); } finally { setBusy(false); }
  };
  return <section className="mt-10 max-w-4xl rounded-xl border border-border bg-card p-5">
    <h2 className="flex items-center gap-2 font-display text-xl font-bold"><GitBranch/> Network structure editor (Owner 1)</h2>
    <p className="mt-1 text-xs text-muted-foreground">The entire downline moves intact. Moving under one's own downline is automatically rejected. Previous bonuses remain recorded; every change is logged in the audit log.</p>
    <form className="mt-4 flex gap-2" onSubmit={async e => { e.preventDefault(); setBusy(true); try { setInfo(await lookup({ data: { code: q } })); } catch (err) { setInfo(null); onMessage(err instanceof Error ? err.message : 'Not found.'); } finally { setBusy(false); } }}>
      <input className="form-input flex-1" placeholder="BIX ID / referral code / email" value={q} onChange={e => setQ(e.target.value)} required/>
      <Button disabled={busy} type="submit"><Search/>Search</Button>
    </form>
    {info && <div className="mt-5 space-y-5">
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-4">
        <div><span className="text-xs text-muted-foreground">Member</span><b className="block">{info.code}</b><span className="text-[11px] text-muted-foreground">{info.email}</span></div>
        <div><span className="text-xs text-muted-foreground">Current sponsor</span><b className="block">{info.sponsor ?? '— (root)'}</b></div>
        <div><span className="text-xs text-muted-foreground">Direct</span><b className="block">{info.direct}</b></div>
        <div><span className="text-xs text-muted-foreground">Team total</span><b className="block">{info.team}</b></div>
      </div>
      <div className="rounded-lg border border-border p-4">
        <h3 className="font-bold">Change direct sponsor</h3>
        <div className="mt-2 flex gap-2"><input className="form-input flex-1" placeholder="New sponsor code" value={sponsor} onChange={e => setSponsor(e.target.value)}/>
          <Button disabled={busy || !sponsor} onClick={() => { if (confirm(`Move ${info.code} and ${info.team} downline to ${sponsor}?`)) void run(() => move({ data: { member: info.code, sponsor } }), 'Sponsor moved successfully.'); }}>Pindahkan</Button></div>
      </div>
      <div className="rounded-lg border border-border p-4">
        <h3 className="font-bold">Detach account from sponsor</h3>
        <p className="mt-1 text-xs text-muted-foreground">Account becomes root without a sponsor; downline remains attached.</p>
        <Button variant="destructive" className="mt-2" disabled={busy || !info.sponsor} onClick={() => { if (confirm(`Detach ${info.code} from sponsor ${info.sponsor}?`)) void run(() => move({ data: { member: info.code, sponsor: null } }), 'Account detached from sponsor.'); }}>Copot</Button>
      </div>
      <div className="rounded-lg border border-border p-4">
        <h3 className="font-bold">Sisipkan {info.code} di atas member lain</h3>
        <p className="mt-1 text-xs text-muted-foreground">{info.code} ditempatkan di bawah sponsor member tujuan, lalu member tujuan (beserta jaringannya) pindah ke bawah {info.code}.</p>
        <div className="mt-2 flex gap-2"><input className="form-input flex-1" placeholder="Recipient member code" value={child} onChange={e => setChild(e.target.value)}/>
          <Button disabled={busy || !child} onClick={() => { if (confirm(`Insert ${info.code} above ${child}?`)) void run(() => insert({ data: { newCode: info.code, child } }), 'Account inserted successfully.'); }}>Sisipkan</Button></div>
      </div>
    </div>}
  </section>;
}
