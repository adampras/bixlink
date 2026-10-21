import { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import avatarSg from '@/assets/alliance-avatar-sg.jpg';
import avatarId from '@/assets/alliance-avatar-id.jpg';
import avatarMy from '@/assets/alliance-avatar-my.jpg';
import avatarHk from '@/assets/alliance-avatar-hk.jpg';
import avatarAe from '@/assets/alliance-avatar-ae.jpg';

const portraits = [avatarSg, avatarId, avatarMy, avatarHk, avatarAe];
function AllianceAvatar({ index, code }: { index: number; code: string }) {
  return <div className="alliance-portrait"><img src={portraits[index]} alt={`${code} illustrative avatar`} width={384} height={384} loading="lazy"/><span>{code}</span></div>;
}

const NATIONS = [
  { code: 'SG', flag: 'sg', name: 'Singapore', role: 'Core Architecture', body: 'Ledger systems & platform engineering',
    story: 'Singapore anchors the technical backbone of BIXLINK. This desk designs the internal ledger architecture, security layers and platform engineering standards that keep every request traceable and reviewable.',
    focus: ['Internal ledger design & audit trails', 'Platform security and access control', 'Edge delivery and system reliability'] },
  { code: 'ID', flag: 'id', name: 'Indonesia', role: 'Regional Growth', body: 'Community, leaders & member support',
    story: 'Indonesia drives community growth across Southeast Asia. The team trains leaders, supports members in their own language and turns feedback from the field into product improvements.',
    focus: ['Leader development programs', 'Member education & support', 'Community events and onboarding'] },
  { code: 'MY', flag: 'my', name: 'Malaysia', role: 'Operations', body: 'Compliance readiness & partner relations',
    story: 'Malaysia coordinates day-to-day operations. The desk maintains internal procedures, prepares for regional digital-asset rules and manages relationships with prospective partners.',
    focus: ['Operating procedures (SOP)', 'Regulatory readiness research', 'Partner and merchant relations'] },
  { code: 'HK', flag: 'hk', name: 'Hong Kong', role: 'Markets', body: 'Asia market research & liquidity planning',
    story: 'Hong Kong leads market research for the Asia-Pacific region. The desk studies digital-asset trends and prepares liquidity planning scenarios before any public market activity is considered.',
    focus: ['Asia-Pacific market research', 'Liquidity planning scenarios', 'Market data and reporting'] },
  { code: 'AE', flag: 'ae', name: 'Dubai · UAE', role: 'Global Expansion', body: 'Middle East network & RWA narrative',
    story: 'Dubai is the gateway to the Middle East and beyond. The desk builds international networks and explores real-world asset (RWA) concepts as part of the long-term BIXLINK roadmap.',
    focus: ['Middle East & international network', 'RWA concept research', 'Global alliance outreach'] },
];

export function NationAlliance() {
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const go = (i: number) => { const el = rail.current?.children[i] as HTMLElement | undefined; el && rail.current?.scrollTo({ left: el.offsetLeft - (rail.current.clientWidth - el.clientWidth) / 2, behavior: 'smooth' }); };
  useEffect(() => { if (paused || open !== null) return; const id = setInterval(() => go((active + 1) % NATIONS.length), 4500); return () => clearInterval(id); }, [active, paused, open]);
  const onScroll = () => { const r = rail.current; if (!r) return; const mid = r.scrollLeft + r.clientWidth / 2; let best = 0, d = Infinity; Array.from(r.children).forEach((c, i) => { const el = c as HTMLElement; const dist = Math.abs(el.offsetLeft + el.clientWidth / 2 - mid); if (dist < d) { d = dist; best = i; } }); setActive(best); };
  const n = open !== null ? NATIONS[open] : null;

  return <section className="nation-alliance" aria-labelledby="nation-title">
    <div className="eyebrow">GLOBAL ALLIANCE</div>
    <h2 id="nation-title" className="section-title">5-NATION <span>CONSORTIUM</span></h2>
    <div ref={rail} className="nation-rail mt-4" onScroll={onScroll} onPointerDown={() => setPaused(true)}>
      {NATIONS.map((x, i) => <Button variant="ghost" type="button" key={x.code} className={`nation-slide ${active === i ? 'is-on' : ''}`} onClick={() => setOpen(i)} aria-label={`${x.name} — read more`}>
        <AllianceAvatar index={i} code={x.code}/>
        <b>{x.name}</b><small>{x.role}</small><p>{x.body}</p><span className="nation-more">READ PROFILE →</span>
      </Button>)}
    </div>
    <div className="nation-dots">{NATIONS.map((x, i) => <button key={x.code} type="button" aria-label={`Show ${x.name}`} className={active === i ? 'is-on' : ''} onClick={() => go(i)}/>)}</div>
    <p className="mt-4 text-center text-[10px] text-muted-foreground">Regional focus roles. Official team profiles are published by BIXLINK GLOBAL after verification.</p>
    <Dialog open={open !== null} onOpenChange={v => !v && setOpen(null)}>
      <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"/>
      <div className="alliance-dialog-stage">
      <DialogPrimitive.Content className="alliance-dialog bg-card text-card-foreground">
        <DialogPrimitive.Close asChild><Button variant="ghost" size="icon" className="alliance-dialog-close" aria-label="Close profile"><X className="h-4 w-4"/></Button></DialogPrimitive.Close>
        {n && <><DialogHeader className="items-center text-center">
          <AllianceAvatar index={open ?? 0} code={n.code}/>
          <DialogTitle>{n.name}</DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-[.22em] text-chart-2">{n.role}</DialogDescription>
        </DialogHeader>
        <div className="nation-dialog-body"><p>{n.story}</p><ul>{n.focus.map(f => <li key={f}>{f}</li>)}</ul>
          <p className="alliance-profile-note">Illustrative avatar and proposed regional role; not a verified team profile.</p></div></>}
      </DialogPrimitive.Content>
      </div>
      </DialogPrimitive.Portal>
    </Dialog>
  </section>;
}
