import { copyText } from '@/lib/copy-text';
import { useState } from 'react';
import { Copy, Users } from 'lucide-react';
import { number } from '@/lib/bixlink';
import { presaleReleased } from '@/lib/presale';

type Reward = { id: string; bix: number; release_days: number; status: string; created_at: string };

export function PresaleCommission({ rewards, code, now }: { rewards: Reward[]; code?: string | null; now: number }) {
  const [copied, setCopied] = useState(false);
  const total = rewards.reduce((n, r) => n + Number(r.bix), 0);
  const released = rewards.reduce((n, r) => n + presaleReleased(Number(r.bix), r.release_days, r.created_at, now), 0);
  const link = code ? `https://bixlink.lovable.app/register?ref=${code}&target=presale` : '';
  return <section className="mt-8 rounded-2xl border border-border bg-card/60 p-5">
    <div className="eyebrow"><Users size={14}/> MY PRESALE COMMISSION</div>
    <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
      <div><dd className="numeric font-display text-lg font-bold text-chart-3">{number(total)}</dd><dt className="text-[10px] text-muted-foreground">Sponsor BIX</dt></div>
      <div><dd className="numeric font-display text-lg font-bold text-chart-2">{number(released, { maximumFractionDigits: 2 })}</dd><dt className="text-[10px] text-muted-foreground">Mined out</dt></div>
      <div><dd className="numeric font-display text-lg font-bold">{rewards.length}</dd><dt className="text-[10px] text-muted-foreground">Purchases</dt></div>
    </dl>
    {rewards.length > 0 && <div className="mt-3 space-y-1">{rewards.slice(0, 6).map((r, i) => <div key={r.id} className="flex justify-between text-xs"><span className="text-muted-foreground">Referral ***{String(i + 1).padStart(2, '0')} · {new Date(r.created_at).toLocaleDateString()}</span><b className="numeric">{number(Number(r.bix))} BIX · {r.status}</b></div>)}</div>}
    {link && <button type="button" onClick={() => { void copyText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="mt-4 flex w-full items-center justify-between gap-2 rounded-full border border-chart-3/40 px-4 py-2 text-xs"><span className="truncate text-muted-foreground">{link}</span><span className="flex items-center gap-1 font-bold text-chart-3"><Copy size={13}/>{copied ? 'Copied' : 'Copy'}</span></button>}
    {link && (() => { const msg = `BIXLINK Genesis Presale — limited BIX allocation (21M fixed supply). Choose Hybrid, Dividend or Founder strategy, plus 21 Sovereign $100K slots. Projections are not guaranteed.\n${link}`; const enc = encodeURIComponent(msg); return <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-bold">
      <a href={`https://wa.me/?text=${enc}`} target="_blank" rel="noreferrer" className="rounded-full border border-chart-2/50 py-2 text-center text-chart-2">WhatsApp</a>
      <a href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg.split('\n')[0] ?? msg)}`} target="_blank" rel="noreferrer" className="rounded-full border border-primary/50 py-2 text-center text-primary">Telegram</a>
      <button type="button" onClick={() => { void copyText(msg); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="rounded-full border border-chart-3/50 py-2 text-chart-3">Copy message</button>
    </div>; })()}
    <p className="mt-2 text-[10px] text-muted-foreground">Direct sponsor bonus only, locked and released on the buyer's mining schedule.</p>
  </section>;
}
