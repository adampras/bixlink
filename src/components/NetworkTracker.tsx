import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Network, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackMemberNetwork, moveMemberNetwork } from '@/lib/network-tracker.functions';

type Result = Awaited<ReturnType<typeof trackMemberNetwork>>;

/** Owner 1 tool: find which owner network a member belongs to and move their sponsor when needed. */
export function NetworkTracker() {
  const track = useServerFn(trackMemberNetwork); const move = useServerFn(moveMemberNetwork);
  const [key, setKey] = useState(''); const [to, setTo] = useState('');
  const [res, setRes] = useState<Result | null>(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<Result>, ok?: string) => { setBusy(true); setMsg(''); try { setRes(await fn()); if (ok) setMsg(ok); } catch (e) { setMsg(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); } };
  return <section className="rounded-2xl border border-border bg-card p-4">
    <div className="flex items-center gap-2"><Network size={18} className="text-chart-3"/><b className="text-sm">Network tracker · Admin 1 / Admin 2</b></div>
    <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); if (key.trim()) void run(() => track({ data: { key } })); }}>
      <input className="form-input flex-1" placeholder="Member ID, BIX code or username" aria-label="Member to track" value={key} onChange={e => setKey(e.target.value)}/>
      <Button type="submit" size="icon" disabled={busy} aria-label="Track"><Search/></Button>
    </form>
    {res && <div className="mt-3 space-y-2 text-xs">
      <div className="flex items-center justify-between gap-2"><span><b className="text-sm">{res.name}</b> <span className="text-muted-foreground">{res.code}</span></span>
        <span className={`rounded-full px-2 py-0.5 font-bold ${res.network === 'Admin 1' ? 'bg-chart-3/20 text-chart-3' : 'bg-accent/20 text-accent'}`}>{res.network}{res.isClone ? ' · clone' : ''}</span></div>
      <p className="text-muted-foreground">Sponsor line: {res.sponsors.length ? res.sponsors.map(s => s.code || s.name).join(' ← ') : 'none (top level)'}</p>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (!to.trim() || !confirm(`Move ${res.name} under ${to}? Their whole downline moves with them.`)) return; void run(() => move({ data: { userId: res.userId, sponsorKey: to } }), 'Network moved.'); }}>
        <input className="form-input flex-1" placeholder="New sponsor code / username" aria-label="New sponsor" value={to} onChange={e => setTo(e.target.value)}/>
        <Button type="submit" size="sm" variant="outline" disabled={busy}>Move</Button>
      </form>
    </div>}
    {msg && <p role="status" className="mt-2 text-xs text-chart-2">{msg}</p>}
  </section>;
}
