import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Lock, ShieldCheck, FileText, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { unlockConsortium } from '@/lib/consortium.functions';

export const Route = createFileRoute('/consortium-vault')({
  head: () => ({ meta: [
    { title: 'Consortium Vault · BIXLINK Private Desk' },
    { name: 'description', content: 'Private consortium allocation desk for invited partners.' },
    { name: 'robots', content: 'noindex, nofollow' },
    { property: 'og:title', content: 'Consortium Vault · BIXLINK' },
    { property: 'og:description', content: 'Private consortium allocation desk for invited partners.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: VaultPage,
});

const NATIONS = [['🇸🇬', 'Singapore', 400000], ['🇦🇪', 'UAE', 400000], ['🇭🇰', 'Hong Kong', 400000], ['🇯🇵', 'Japan', 400000], ['🇨🇭', 'Switzerland', 400000]] as const;
const VESTING = [['Month 0–6', 'Cliff · fully locked'], ['Month 7–18', 'Linear release 40%'], ['Month 19–30', 'Linear release 40%'], ['Month 31–36', 'Final release 20%']];
const DOCS = [
  ['Institutional Allocation Framework', 'Defines the planned $2,000,000 consortium commitment, its five equal tranches and the purpose of each allocation.'],
  ['Multi-Sig Custody Protocol', 'Describes the intended multi-signature approval model: no single party may move reserved funds alone.'],
  ['Pre-TGE Governance Charter', 'Sets how consortium members review roadmap, listing and treasury decisions before token generation.'],
  ['Risk & Audit Statement', 'Crypto assets are volatile. Figures are planned commitments, not guarantees, and remain subject to independent audit and applicable regulation.'],
];

function VaultPage() {
  const unlock = useServerFn(unlockConsortium);
  const [pin, setPin] = useState(''); const [open, setOpen] = useState(false); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('');
    try { const r = await unlock({ data: { pin } }); if (r.ok) setOpen(true); else setMsg(r.reason === 'closed' ? 'This private desk is currently closed.' : 'Invalid access PIN.'); }
    catch { setMsg('Unable to verify access.'); } finally { setBusy(false); }
  }
  if (!open) return <main className="grid min-h-screen place-items-center bg-background px-5">
    <form onSubmit={submit} className="w-full max-w-sm rounded-[20px] border border-primary/40 bg-card p-6 text-center">
      <Lock className="mx-auto text-primary" size={30}/><h1 className="mt-3 font-display text-xl font-bold">Private Consortium Desk</h1>
      <p className="mt-1 text-xs text-muted-foreground">Invitation only. Enter your access PIN.</p>
      <Input type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} className="mt-5 text-center tracking-[0.4em]" placeholder="••••••" aria-label="Access PIN"/>
      {msg && <p className="mt-2 text-xs text-destructive">{msg}</p>}
      <Button type="submit" disabled={busy || pin.length < 4} className="mt-4 w-full rounded-full">Unlock</Button>
    </form></main>;
  return <main className="mx-auto max-w-4xl bg-background px-5 py-10">
    <div className="eyebrow"><Landmark size={14}/> PRIVATE · CONSORTIUM VAULT</div>
    <h1 className="mt-3 font-display text-3xl font-bold">$2,000,000 Reserve Commitment</h1>
    <p className="mt-2 text-sm text-muted-foreground">Planned liquidity commitment from five consortium partners, released under a 36-month vesting schedule.</p>
    <section className="mt-6 grid gap-3">{NATIONS.map(([f, n, v]) => <div key={n} className="rounded-[14px] border border-border bg-card p-4">
      <div className="flex justify-between text-sm"><b>{f} {n}</b><span className="numeric text-primary">${v.toLocaleString('en-US')}</span></div>
      <div className="mt-2 h-2 rounded-full bg-muted"><i className="block h-2 rounded-full bg-primary" style={{ width: '20%' }}/></div></div>)}</section>
    <h2 className="mt-8 font-display text-xl font-bold">Escrow & Vesting</h2>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{VESTING.map(([a, b]) => <div key={a} className="rounded-[14px] border border-border bg-card p-4"><b className="text-sm">{a}</b><p className="text-xs text-muted-foreground">{b}</p></div>)}</div>
    <h2 className="mt-8 font-display text-xl font-bold">Governance Documents</h2>
    <div className="mt-3 grid gap-3">{DOCS.map(([t, d]) => <article key={t} className="rounded-[14px] border border-border bg-card p-4"><b className="flex items-center gap-2 text-sm"><FileText size={14} className="text-primary"/>{t}</b><p className="mt-1 text-xs text-muted-foreground">{d}</p></article>)}</div>
    <p className="mt-8 flex gap-2 text-[11px] text-muted-foreground"><ShieldCheck size={13} className="shrink-0"/>Internal framework documents for discussion with invited partners. They are not government licenses, bank guarantees or offers of securities.</p>
  </main>;
}
