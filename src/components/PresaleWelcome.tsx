import { useEffect, useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Crown, Lock, ShieldCheck, Users, X } from 'lucide-react';
import { getPresaleStatus } from '@/lib/presale.functions';
import { presalePrice } from '@/lib/presale';
import { number } from '@/lib/bixlink';

const KEY = 'bixlink-presale-welcome';

export function PresaleWelcome({ userId }: { userId: string }) {
  const path = useRouterState({ select: s => s.location.pathname });
  const load = useServerFn(getPresaleStatus);
  const q = useQuery({ queryKey: ['presale', userId], queryFn: () => load(), staleTime: 60_000 });
  const [open, setOpen] = useState(false);
  const cfg = q.data?.config;
  useEffect(() => {
    if (!cfg?.enabled || path.startsWith('/admin') || path === '/presale') return;
    try { if (sessionStorage.getItem(KEY) === userId) return; sessionStorage.setItem(KEY, userId); } catch { /* storage restricted */ }
    setOpen(true);
  }, [cfg?.enabled, userId]);
  if (!open || !cfg) return null;
  const close = () => setOpen(false);
  return <div className="presale-pop" role="dialog" aria-modal="true" aria-label="BIX presale information" onClick={close}>
    <div className="presale-pop-card" onClick={e => e.stopPropagation()}>
      <button className="presale-pop-x" onClick={close} aria-label="Close"><X size={16}/></button>
      <span className="presale-pop-badge"><Crown size={12}/> VIP · EXCLUSIVE</span>
      <h2 className="font-display text-xl font-black">PRESALE <span className="text-primary">STAKING BIX</span></h2>
      <p className="mt-1 text-xs text-muted-foreground">Presale price <b className="numeric text-primary">${presalePrice(cfg.packages)}</b> per BIX · limited pool</p>
      <div className="mt-4 grid grid-cols-2 gap-2">{cfg.packages.map(p => <div key={p.usd} className="presale-pop-pkg">
        <b className="numeric">${number(p.usd)}</b><small className="numeric">{number(p.bix)} BIX</small>
      </div>)}</div>
      <ul className="mt-4 grid gap-1.5 text-xs">
        <li><Lock size={12} className="inline text-primary"/> BIX locked instantly, released by mining</li>
        <li><Users size={12} className="inline text-primary"/> {cfg.sponsorPct}% sponsor bonus to your direct referrer</li>
      </ul>
      <div className="mt-5 flex gap-2">
        <Link to="/presale" onClick={close} className="presale-pop-cta">View presale</Link>
        <button onClick={close} className="presale-pop-later">Later</button>
      </div>
      <p className="mt-4 flex gap-1.5 text-[10px] leading-snug text-muted-foreground"><ShieldCheck size={12} className="shrink-0"/> No guarantee of profit. Presale BIX is an internal ledger allocation, not an on-chain token.</p>
    </div>
  </div>;
}
