import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { Crown, Gamepad2, IdCard, Play, ShoppingBag, Swords, Trophy, Zap } from 'lucide-react';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/game')({
  head: () => ({ meta: [
    { title: 'BIXGAME Arena — BIXLINK' },
    { name: 'description', content: 'BIXGAME preview: arena hub, PvP brackets, top-up catalog, Hall of Fame, gamer passport and the Cyber Runner mini-game.' },
    { property: 'og:title', content: 'BIXGAME Arena — BIXLINK' },
    { property: 'og:description', content: 'Preview the BIXLINK gaming arena and play Cyber Runner in your browser.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: GamePage,
});

type Tab = 'hub' | 'pvp' | 'store' | 'fame' | 'runner' | 'passport';
const TABS: { k: Tab; label: string; icon: typeof Swords }[] = [
  { k: 'hub', label: 'Arena', icon: Gamepad2 }, { k: 'pvp', label: 'PvP', icon: Swords },
  { k: 'runner', label: 'Runner', icon: Zap }, { k: 'store', label: 'Top-Up', icon: ShoppingBag },
  { k: 'fame', label: 'Fame', icon: Trophy }, { k: 'passport', label: 'Passport', icon: IdCard },
];
const NOTE = 'Preview — tournaments, top-up and prizes are not active yet. No entry fee is charged and no BIX/USDT is paid from this page.';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-primary/25 bg-card/80 p-4 backdrop-blur ${className}`}>{children}</div>;
}
function Soon({ title, items }: { title: string; items: string[] }) {
  return <Card><h3 className="mb-3 text-sm font-bold text-primary">{title}</h3><ul className="space-y-2">{items.map((i) => <li key={i} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm"><span>{i}</span><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Soon</span></li>)}</ul></Card>;
}

function useBest() {
  const [best, setBest] = useState(0);
  useEffect(() => { setBest(Number(localStorage.getItem('bixgame-runner-best') ?? 0)); }, []);
  const save = (s: number) => { if (s > best) { setBest(s); localStorage.setItem('bixgame-runner-best', String(s)); } };
  return { best, save };
}

function Runner({ onScore }: { onScore: (s: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<'idle' | 'run' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const jump = useRef<() => void>(() => {});
  useEffect(() => {
    if (state !== 'run') return;
    const c = ref.current; if (!c) return; const g = c.getContext('2d'); if (!g) return;
    const css = getComputedStyle(document.documentElement);
    const prim = css.getPropertyValue('--primary').trim() || 'gold'; const fg = css.getPropertyValue('--foreground').trim() || 'white';
    const W = c.width, H = c.height, ground = H - 30;
    let y = ground, vy = 0, t = 0, speed = 4, s = 0, raf = 0;
    const obs: { x: number; h: number }[] = [];
    jump.current = () => { if (y >= ground) vy = -11; };
    const loop = () => {
      t++; speed += 0.002; vy += 0.6; y = Math.min(ground, y + vy);
      if (t % Math.max(45, 90 - Math.floor(t / 300)) === 0) obs.push({ x: W, h: 18 + Math.random() * 22 });
      obs.forEach((o) => (o.x -= speed));
      while (obs[0] && obs[0].x < -20) { obs.shift(); s++; setScore(s); }
      g.clearRect(0, 0, W, H);
      g.strokeStyle = prim; g.globalAlpha = 0.4; g.beginPath(); g.moveTo(0, ground + 1); g.lineTo(W, ground + 1); g.stroke(); g.globalAlpha = 1;
      g.fillStyle = fg; g.fillRect(40, y - 24, 20, 24);
      g.fillStyle = prim; obs.forEach((o) => g.fillRect(o.x, ground - o.h, 14, o.h));
      if (obs.some((o) => o.x < 60 && o.x + 14 > 40 && y > ground - o.h)) { setState('over'); onScore(s); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state, onScore]);
  const tap = () => { if (state === 'run') jump.current(); else { setScore(0); setState('run'); } };
  return <div>
    <canvas ref={ref} width={360} height={180} onPointerDown={tap} className="w-full touch-none rounded-xl border border-primary/30 bg-background" aria-label="Cyber Runner — tap to jump" />
    <div className="mt-2 flex items-center justify-between text-sm"><span>Score: <b className="text-primary">{score}</b></span>
      {state !== 'run' && <Button size="sm" onClick={tap}><Play className="mr-1 h-4 w-4" />{state === 'over' ? 'Main lagi' : 'Mulai'}</Button>}</div>
  </div>;
}

function GamePage() {
  const [tab, setTab] = useState<Tab>('hub');
  const { best, save } = useBest();
  return <BixShell><div className="mx-auto max-w-md space-y-4 px-3 pb-28 pt-3">
    <Card className="bg-gradient-to-br from-primary/15 to-accent/10 text-center">
      <Crown className="mx-auto h-7 w-7 text-primary" />
      <h1 className="mt-1 text-xl font-black tracking-wider">BIXGAME ARENA</h1>
      <p className="text-xs text-muted-foreground">Sovereign gaming hub BIXLINK</p>
    </Card>
    <div className="grid grid-cols-6 gap-1">{TABS.map(({ k, label, icon: I }) =>
      <button key={k} onClick={() => setTab(k)} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] transition active:scale-95 ${tab === k ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground'}`}><I className="h-4 w-4" />{label}</button>)}</div>
    {tab === 'hub' && <>
      <Card><p className="text-[10px] uppercase tracking-widest text-primary">Featured</p><h2 className="text-lg font-bold">Cyber Runner Season 0</h2><p className="mb-3 text-sm text-muted-foreground">Mini-game gratis di browser. Skor tersimpan di perangkat ini.</p><Button className="w-full" onClick={() => setTab('runner')}><Play className="mr-1 h-4 w-4" />Main sekarang</Button></Card>
      <Soon title="Turnamen mendatang" items={['MLBB Community Cup', 'Free Fire Squad Clash', 'PUBG Mobile Duo Rush']} />
      <Link to="/arena" className="block"><Card className="text-sm">Misi harian & BIXP ada di <b className="text-primary">Fox Arena →</b></Card></Link>
    </>}
    {tab === 'pvp' && <Card className="text-center"><Swords className="mx-auto h-10 w-10 text-primary" /><h2 className="mt-2 font-bold">PvP Grand Final</h2><p className="text-sm text-muted-foreground">Bracket & matchmaking dibuka setelah aturan turnamen dan anti-cheat siap.</p></Card>}
    {tab === 'runner' && <Card><h2 className="mb-1 font-bold">Cyber Runner</h2><p className="mb-3 text-xs text-muted-foreground">Ketuk layar untuk lompat. Rekor terbaik: <b className="text-primary">{best}</b></p><Runner onScore={save} /></Card>}
    {tab === 'store' && <Soon title="Top-Up Store" items={['Mobile Legends — Diamonds', 'Free Fire — Diamonds', 'PUBG Mobile — UC', 'Genshin Impact — Crystals']} />}
    {tab === 'fame' && <Card className="text-center"><Trophy className="mx-auto h-10 w-10 text-primary" /><h2 className="mt-2 font-bold">Hall of Fame</h2><p className="text-sm text-muted-foreground">Papan peringkat hanya berisi pemain nyata dan tampil setelah musim pertama dimulai.</p></Card>}
    {tab === 'passport' && <Card><div className="flex items-center gap-3"><IdCard className="h-10 w-10 text-primary" /><div><h2 className="font-bold">Gamer Passport</h2><p className="text-xs text-muted-foreground">Rekor Runner: {best} · Badge: segera hadir</p></div></div></Card>}
    <p className="text-center text-[11px] text-muted-foreground">{NOTE}</p>
  </div></BixShell>;
}
