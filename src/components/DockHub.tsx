import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { LayoutGrid, Home, CandlestickChart, Rocket, Cpu, ArrowLeftRight, Gem, Swords, Clapperboard, HandCoins, Landmark, Store, Send, UserRound, Bot, Bike, WalletCards, type LucideIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HUB_GROUPS, HUB_ITEMS, hubVisible } from '@/lib/dock-hub';

const ICONS: Record<string, LucideIcon> = { home: Home, trade: CandlestickChart, bixtrade: Bot, bixgo: Bike, boost: Rocket, mining: Cpu, exchange: ArrowLeftRight, presale: Gem, arena: Swords, bixtok: Clapperboard, buyback: HandCoins, vault: Landmark, nft: Store, pay: Send, profile: UserRound, onchain: WalletCards };
/** Category look: swipe rows for long groups, fixed grids for short ones. */
const GROUP_STYLE: Record<string, { tone: string; swipe: boolean }> = {
  'Trading & Finance': { tone: 'gold', swipe: true },
  'Wallet & Payments': { tone: 'emerald', swipe: false },
  'Ecosystem': { tone: 'violet', swipe: true },
  'Account': { tone: 'silver', swipe: false },
};

/** Mobile dock HUB (replaces HOME): opens owner-selected shortcuts. */
export function DockHub({ path, cfg }: { path: string; cfg?: Record<string, boolean> | undefined }) {
  const [open, setOpen] = useState(false);
  const items = HUB_ITEMS.filter(i => hubVisible(cfg, i.id));
  const on = open || items.some(i => i.to === path && !['/stake', '/wallet', '/profit', '/network'].includes(i.to));
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Open BIX HUB" className={`flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[10px] font-bold ${on ? 'mobile-nav-on' : 'text-muted-foreground'}`}>
      <LayoutGrid size={19} className="shrink-0"/><span>HUB</span>
    </button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="hub-midnight max-h-[80vh] overflow-y-auto rounded-t-3xl pb-8">
        <SheetHeader><SheetTitle className="hub-title font-display tracking-widest">BIX HUB</SheetTitle></SheetHeader>
        {HUB_GROUPS.map(g => { const list = items.filter(i => i.group === g); if (!list.length) return null; const st = GROUP_STYLE[g] ?? { tone: 'gold', swipe: false }; const swipe = st.swipe && list.length > 3;
          return <section key={g} className={`hub-group hub-tone-${st.tone} mt-3`}>
          <h3 className="hub-group-head"><span>{g}</span>{swipe && <em>Geser ⇆</em>}</h3>
          <div className={swipe ? 'hub-swipe' : 'grid grid-cols-3 gap-2'}>
          {list.map((i, n) => { const Icon = ICONS[i.id] ?? LayoutGrid; const cls = `hub-tile rounded-2xl border px-2 py-3 text-center ${path === i.to ? 'is-active' : ''}`; const body = <><span className="hub-emblem" style={{ animationDelay: `${(n % 4) * -0.9}s` }}><Icon size={20} strokeWidth={1.7}/></span><div className="text-xs font-black">{i.label}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{i.note}</div></>;
            return i.id === 'onchain' ? <a key={i.id} href={i.to} onClick={() => setOpen(false)} className={cls}>{body}</a> : <Link key={i.id} to={i.to} onClick={() => setOpen(false)} className={cls}>{body}</Link>; })}
          </div></section>; })}
      </SheetContent>
    </Sheet>
  </>;
}
