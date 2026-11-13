import { useEffect, useRef, useState, type UIEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { LayoutGrid, Home, CandlestickChart, Rocket, Cpu, ArrowLeftRight, Gem, Swords, Clapperboard, HandCoins, Landmark, Store, Send, Search, Coins, Wrench, UserRound, Settings2, Bot, CarFront, WalletCards, PhoneCall, type LucideIcon } from 'lucide-react';
import artGo from '@/assets/hub/v2-bixgo.jpg';
import artMall from '@/assets/hub/v2-mall.jpg';
import artCall from '@/assets/hub/v2-call.jpg';
import artTok from '@/assets/hub/v2-bixtok.jpg';
import artGold from '@/assets/hub/v2-gold.jpg';
import artMining from '@/assets/hub/mining.jpg';
import artArena from '@/assets/hub/arena.jpg';
import artCare from '@/assets/hub/v2-care.jpg';
import artTrade from '@/assets/hub/v2-trade.jpg';
import artBot from '@/assets/hub/bixtrade.jpg';
import artPresale from '@/assets/hub/presale.jpg';
import artBoost from '@/assets/hub/boost.jpg';
import artBuyback from '@/assets/hub/buyback.jpg';
import artExchange from '@/assets/hub/v2-exchange.jpg';
import artOnchain from '@/assets/hub/onchain.jpg';
import artPay from '@/assets/hub/v2-pay.jpg';
import artVault from '@/assets/hub/vault.jpg';
import artHome from '@/assets/hub/home.jpg';
import artProfile from '@/assets/hub/profile.jpg';
import artSettings from '@/assets/hub/settings.jpg';
import { EcoLogo, ECO_LOGOS } from '@/components/EcoLogo';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SupportCommandCenter } from '@/components/SupportCommandCenter';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HUB_GROUPS, HUB_ITEMS, PILLARS, hubVisible, hubOrdered, pillarOf } from '@/lib/dock-hub';

const ICONS: Record<string, LucideIcon> = { home: Home, trade: CandlestickChart, bixtrade: Bot, bixgo: CarFront, boost: Rocket, mining: Cpu, exchange: ArrowLeftRight, presale: Gem, arena: Swords, bixtok: Clapperboard, buyback: HandCoins, vault: Landmark, nft: Store, pay: Send, profile: UserRound, onchain: WalletCards, call: PhoneCall, settings: Settings2, gold: Coins, care: Wrench };
const ART: Record<string, string> = { bixgo: artGo, nft: artMall, call: artCall, bixtok: artTok, gold: artGold, mining: artMining, arena: artArena, care: artCare, trade: artTrade, bixtrade: artBot, presale: artPresale, boost: artBoost, buyback: artBuyback, exchange: artExchange, onchain: artOnchain, pay: artPay, vault: artVault, home: artHome, profile: artProfile, settings: artSettings };
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
export function DockHub({ path, cfg, order, matrix = false }: { path: string; cfg?: Record<string, boolean> | undefined; order?: string[] | undefined; matrix?: boolean }) {
  const [open, setOpen] = useState(false);
  const owner1 = useQuery({ queryKey: ['is-owner1'], staleTime: 300_000, enabled: open, queryFn: async () => Boolean((await supabase.rpc('bix_is_owner1')).data) });
  const [csOpen, setCsOpen] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => { if (!open) setQ(''); }, [open]);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => { if (open) { try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')); } catch { setRecent([]); } } }, [open]);
  const items = hubOrdered(HUB_ITEMS, order).filter(i => hubVisible(cfg, i.id));
  const on = open || items.some(i => i.to === path && !['/stake', '/wallet', '/profit', '/network'].includes(i.to));
  const pick = (id: string) => {
    try { navigator.vibrate?.(8); } catch {}
    try { navigator.vibrate?.(8); } catch { /* unsupported */ }
    try { const next = [id, ...recent.filter(r => r !== id)].slice(0, 3); localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
    setOpen(false);
  };
  const tile = (i: typeof items[number], n: number, compact = false) => {
    const Icon = ICONS[i.id] ?? LayoutGrid;
    const cls = `hub-tile rounded-2xl border px-2 py-3 text-center ${path === i.to ? 'is-active' : ''} ${compact ? 'hub-recent-tile' : ''}`;
    const art = !compact ? ART[i.id] : undefined;
    if (art) {
      const pbody = <>{BADGES[i.id] && <b className={`hub-badge hub-badge-${(BADGES[i.id] ?? '').toLowerCase()}`}>{BADGES[i.id]}</b>}<img src={art} alt="" loading="eager" decoding="sync" draggable={false} width={320} height={320}/><span className="hub-photo-text">{ECO_LOGOS[i.id] ? <EcoLogo id={i.id} size={16}/> : <div className="hub-photo-name">{i.label}</div>}<div className="hub-photo-note">{i.note}</div></span></>;
      if (i.id === 'onchain') return <a key={i.id} href={i.to} onClick={() => pick(i.id)} className={`${cls} hub-photo`}>{pbody}</a>;
      return <Link key={i.id} to={i.to} onClick={() => pick(i.id)} className={`${cls} hub-photo`}>{pbody}</Link>;
    }
    const body = <>{!compact && BADGES[i.id] && <b className={`hub-badge hub-badge-${(BADGES[i.id] ?? '').toLowerCase()}`}>{BADGES[i.id]}</b>}<span className="hub-emblem" style={{ animationDelay: `${(n % 4) * -0.9}s` }}><Icon size={20} strokeWidth={1.7}/></span><div className="text-xs font-black">{i.label}</div>{!compact && <div className="mt-0.5 text-[10px] text-muted-foreground">{i.note}</div>}</>;
    return i.id === 'onchain' ? <a key={i.id} href={i.to} onClick={() => pick(i.id)} className={cls}>{body}</a> : <Link key={i.id} to={i.to} onClick={() => pick(i.id)} className={cls}>{body}</Link>;
  };
  // Sheet follows the finger and parks where released; it only sinks once pulled past ~60% of its height (or a hard flick).
  const [drag, setDrag] = useState(0);
  const [moving, setMoving] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ y: number; t: number; base: number; lastY: number; lastT: number } | null>(null);
  const onDown = (e: React.PointerEvent) => { const now = Date.now(); start.current = { y: e.clientY, t: now, base: drag, lastY: e.clientY, lastT: now }; setMoving(true); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { const s = start.current; if (!s) return; const raw = s.base + e.clientY - s.y; setDrag(raw < 0 ? -Math.sqrt(-raw) * 3 : raw); s.lastY = e.clientY; s.lastT = Date.now(); };
  const onUp = (e: React.PointerEvent) => {
    const s0 = start.current; start.current = null; setMoving(false); if (!s0) return;
    const h = sheetRef.current?.offsetHeight ?? 600; const pos = s0.base + e.clientY - s0.y;
    const v = (e.clientY - s0.lastY) / Math.max(1, Date.now() - s0.lastT + 16);
    if (pos > h * 0.3 || (v > 0.9 && pos > 40)) { try { navigator.vibrate?.(12); } catch { /* unsupported */ } setDrag(h); setTimeout(() => setOpen(false), 220); return; }
    setDrag(0);
  };
  useEffect(() => { if (!open) setDrag(0); }, [open]);
  return <>
    <button type="button" onClick={() => { try { navigator.vibrate?.(6); } catch { /* unsupported */ } setOpen(true); }} aria-label="Open BIX HUB" className={`flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[11.5px] font-extrabold tracking-wide ${on ? 'mobile-nav-on' : 'dock-item'}`}>
      <LayoutGrid size={24} strokeWidth={on ? 2.4 : 2} className="shrink-0"/><span>HUB</span>
    </button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" ref={sheetRef} className="hub-midnight hub-spring max-h-[80vh] overflow-y-auto rounded-t-3xl pb-8" style={{ transform: drag ? `translateY(${drag}px)` : undefined, transition: moving ? 'none' : 'transform .42s cubic-bezier(.16,1,.3,1), opacity .3s ease', opacity: drag > 0 ? Math.max(0.55, 1 - drag / 1400) : 1 }}>
        <div className="touch-none -mx-6 -mt-6 cursor-grab px-6 pt-6 pb-1" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-label="Swipe down to close HUB">
        <div className="hub-grabber" aria-hidden/>
        <SheetHeader><SheetTitle className="hub-title font-display tracking-widest" data-text="BIX HUB">BIX HUB</SheetTitle><p className="hub-gate" aria-hidden><i/>GATEWAY ONLINE</p></SheetHeader>
        </div>
        {owner1.data && <section className="hub-group hub-tone-gold mt-3"><button type="button" className="hub-group-head w-full" onClick={() => setCsOpen(v => !v)} aria-expanded={csOpen}><span>CS 1 · CS 2 · CS 3 control</span><em>{csOpen ? 'Close' : 'Open'}</em></button>{csOpen && <div className="mt-2"><SupportCommandCenter/></div>}</section>}
        {<>
        {matrix ? PILLARS.map((p, pi) => { const list = items.filter(i => pillarOf(i.id) === p.id); if (!list.length) return null; const tone = ['emerald', 'gold', 'violet', 'silver'][pi];
          return <section key={p.id} className={`hub-group hub-tone-${tone} mt-3`}>
          <h3 className="hub-group-head"><span>{p.label}</span><em>{p.note}</em></h3>
          {list.length > 3 ? <SwipeRow count={list.length}>{list.map((i, n) => tile(i, n))}</SwipeRow> : <div className="grid grid-cols-3 gap-2">{list.map((i, n) => tile(i, n))}</div>}
          </section>; }) : HUB_GROUPS.map(g => { const list = items.filter(i => i.group === g); if (!list.length) return null; const st = GROUP_STYLE[g] ?? { tone: 'gold', swipe: false }; const swipe = st.swipe && list.length > 3;
          return <section key={g} className={`hub-group hub-tone-${st.tone} mt-3`}>
          <h3 className="hub-group-head"><span>{g}</span>{swipe && <em>Geser ⇆</em>}</h3>
          {swipe ? <SwipeRow count={list.length}>{list.map((i, n) => tile(i, n))}</SwipeRow> : <div className="grid grid-cols-3 gap-2">{list.map((i, n) => tile(i, n))}</div>}
          </section>; })}
        </>}
      </SheetContent>
    </Sheet>
  </>;
}
