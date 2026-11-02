import { useEffect, useState, type UIEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { LayoutGrid, Home, CandlestickChart, Rocket, Cpu, ArrowLeftRight, Gem, Swords, Clapperboard, HandCoins, Landmark, Store, Send, UserRound, Bot, Bike, WalletCards, PhoneCall, type LucideIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HUB_GROUPS, HUB_ITEMS, hubVisible } from '@/lib/dock-hub';

const ICONS: Record<string, LucideIcon> = { home: Home, trade: CandlestickChart, bixtrade: Bot, bixgo: Bike, boost: Rocket, mining: Cpu, exchange: ArrowLeftRight, presale: Gem, arena: Swords, bixtok: Clapperboard, buyback: HandCoins, vault: Landmark, nft: Store, pay: Send, profile: UserRound, onchain: WalletCards, call: PhoneCall };
/** Category look: swipe rows for long groups, fixed grids for short ones. */
const GROUP_STYLE: Record<string, { tone: string; swipe: boolean }> = {
  'Trading & Finance': { tone: 'gold', swipe: true },
  'Wallet & Payments': { tone: 'emerald', swipe: false },
  'Ecosystem': { tone: 'violet', swipe: true },
  'Account': { tone: 'silver', swipe: false },
};
/** Small decorative labels only; they never imply live status or rewards. */
const BADGES: Record<string, string> = { bixtok: 'NEW', bixtrade: 'PRO', presale: 'HOT', call: 'NEW' };
const RECENT_KEY = 'bix-hub-recent';

function SwipeRow({ children, count }: { children: React.ReactNode; count: number }) {
  const pages = Math.ceil(count / 3);
  const [page, setPage] = useState(0);
  const onScroll = (e: UIEvent<HTMLDivElement>) => { const el = e.currentTarget; setPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); };
  return <>
    <div className="hub-swipe" onScroll={onScroll}>{children}</div>
    {pages > 1 && <div className="hub-dots" aria-hidden>{Array.from({ length: pages }, (_, i) => <i key={i} className={i === page ? 'on' : ''}/>)}</div>}
  </>;
}

/** Mobile dock HUB (replaces HOME): opens owner-selected shortcuts. */
export function DockHub({ path, cfg }: { path: string; cfg?: Record<string, boolean> | undefined }) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => { if (open) { try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')); } catch { setRecent([]); } } }, [open]);
  const items = HUB_ITEMS.filter(i => hubVisible(cfg, i.id));
  const on = open || items.some(i => i.to === path && !['/stake', '/wallet', '/profit', '/network'].includes(i.to));
  const pick = (id: string) => {
    try { navigator.vibrate?.(8); } catch { /* unsupported */ }
    try { const next = [id, ...recent.filter(r => r !== id)].slice(0, 3); localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
    setOpen(false);
  };
  const tile = (i: typeof items[number], n: number, compact = false) => {
    const Icon = ICONS[i.id] ?? LayoutGrid;
    const cls = `hub-tile rounded-2xl border px-2 py-3 text-center ${path === i.to ? 'is-active' : ''} ${compact ? 'hub-recent-tile' : ''}`;
    const body = <>{!compact && BADGES[i.id] && <b className={`hub-badge hub-badge-${(BADGES[i.id] ?? '').toLowerCase()}`}>{BADGES[i.id]}</b>}<span className="hub-emblem" style={{ animationDelay: `${(n % 4) * -0.9}s` }}><Icon size={20} strokeWidth={1.7}/></span><div className="text-xs font-black">{i.label}</div>{!compact && <div className="mt-0.5 text-[10px] text-muted-foreground">{i.note}</div>}</>;
    return i.id === 'onchain' ? <a key={i.id} href={i.to} onClick={() => pick(i.id)} className={cls}>{body}</a> : <Link key={i.id} to={i.to} onClick={() => pick(i.id)} className={cls}>{body}</Link>;
  };
  const recentItems = recent.map(id => items.find(i => i.id === id)).filter((i): i is typeof items[number] => !!i);
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Open BIX HUB" className={`flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[10px] font-bold ${on ? 'mobile-nav-on' : 'text-muted-foreground'}`}>
      <LayoutGrid size={19} className="shrink-0"/><span>HUB</span>
    </button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="hub-midnight max-h-[80vh] overflow-y-auto rounded-t-3xl pb-8">
        <div className="hub-grabber" aria-hidden/>
        <SheetHeader><SheetTitle className="hub-title font-display tracking-widest">BIX HUB</SheetTitle></SheetHeader>
        {recentItems.length > 0 && <section className="hub-group hub-tone-gold hub-recent mt-2">
          <h3 className="hub-group-head"><span>Terakhir dibuka</span></h3>
          <div className="grid grid-cols-3 gap-2">{recentItems.map((i, n) => tile(i, n, true))}</div>
        </section>}
        {HUB_GROUPS.map(g => { const list = items.filter(i => i.group === g); if (!list.length) return null; const st = GROUP_STYLE[g] ?? { tone: 'gold', swipe: false }; const swipe = st.swipe && list.length > 3;
          return <section key={g} className={`hub-group hub-tone-${st.tone} mt-3`}>
          <h3 className="hub-group-head"><span>{g}</span>{swipe && <em>Geser ⇆</em>}</h3>
          {swipe ? <SwipeRow count={list.length}>{list.map((i, n) => tile(i, n))}</SwipeRow> : <div className="grid grid-cols-3 gap-2">{list.map((i, n) => tile(i, n))}</div>}
          </section>; })}
      </SheetContent>
    </Sheet>
  </>;
}
