import { createFileRoute, Link } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ClientOnly } from '@tanstack/react-router';
const CyberStrike = lazy(() => import('@/components/game/CyberStrike'));
import { Crown, Gamepad2, IdCard, Play, ShoppingBag, Swords, Trophy, Zap } from 'lucide-react';
import heroArt from '@/assets/game/hero.jpg';
import vsArt from '@/assets/game/vs.jpg';
import runnerArt from '@/assets/game/runner.jpg';
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

type Tab = 'strike' | 'hub' | 'pvp' | 'store' | 'fame' | 'runner' | 'passport';
const TABS: { k: Tab; label: string; icon: typeof Swords }[] = [
  { k: 'strike', label: '3D', icon: Crown }, { k: 'hub', label: 'Arena', icon: Gamepad2 }, { k: 'pvp', label: 'PvP', icon: Swords },
  { k: 'runner', label: 'Runner', icon: Zap }, { k: 'store', label: 'Top-Up', icon: ShoppingBag },
  { k: 'fame', label: 'Fame', icon: Trophy }, { k: 'passport', label: 'Passport', icon: IdCard },
];
const NOTE = 'Preview — tournaments, top-up and prizes are not active yet. No entry fee is charged and no BIX/USDT is paid from this page.';


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
    <canvas ref={ref} width={360} height={180} onPointerDown={tap} className="w-full touch-none rounded-xl border border-primary/40 bg-cover bg-center shadow-[0_0_30px_-8px] shadow-primary/60" style={{ backgroundImage: `linear-gradient(color-mix(in oklab, var(--background) 35%, transparent), color-mix(in oklab, var(--background) 35%, transparent)), url(${runnerArt})` }} aria-label="Cyber Runner — tap to jump" />
    <div className="mt-2 flex items-center justify-between text-sm"><span>Score: <b className="text-primary">{score}</b></span>
      {state !== 'run' && <Button size="sm" onClick={tap}><Play className="mr-1 h-4 w-4" />{state === 'over' ? 'Main lagi' : 'Mulai'}</Button>}</div>
  </div>;
}

const GAMES = [
  { n: 'Mobile Legends', u: 'Diamonds', c: 'MLBB' }, { n: 'Free Fire', u: 'Diamonds', c: 'FF' },
  { n: 'PUBG Mobile', u: 'UC', c: 'PUBG' }, { n: 'Genshin Impact', u: 'Crystals', c: 'GI' },
];
const EVENTS = ['MLBB Community Cup', 'Free Fire Squad Clash', 'PUBG Mobile Duo Rush'];

function Lux({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-card via-background to-accent/20 p-5 shadow-[0_0_40px_-12px] shadow-primary/50 ${className}`}>
    <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-accent/25 blur-3xl" />
    <div className="relative">{children}</div></div>;
}
function Tag({ children }: { children: React.ReactNode }) {
  return <span className="inline-block rounded-full border border-primary/50 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-primary">{children}</span>;
}

function GamePage() {
  const [tab, setTab] = useState<Tab>('strike');
  const { best, save } = useBest();
  return <BixShell><div className="bixgame-skin mx-auto max-w-md space-y-4 px-3 pb-28 pt-3">
    <div className="relative overflow-hidden rounded-3xl border border-primary/50 shadow-[0_0_50px_-10px] shadow-accent/60">
      <img src={heroArt} alt="BIXGAME arena champion" className="h-56 w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-center">
      <Tag>Sovereign Arena</Tag>
      <h1 className="mt-2 bg-gradient-to-r from-primary via-foreground to-accent bg-clip-text text-3xl font-black tracking-[0.3em] text-transparent drop-shadow-lg">BIXGAME</h1>
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Play · Compete · Rise</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
        {[['Rekor', String(best)], ['Rank', 'Rookie'], ['Season', '0']].map(([a, b]) => <div key={a} className="rounded-xl border border-primary/20 bg-background/70 py-2 backdrop-blur"><p className="text-muted-foreground">{a}</p><p className="text-sm font-black text-primary">{b}</p></div>)}
      </div></div>
    </div>
    <div className="grid grid-cols-7 gap-1 rounded-2xl border border-primary/20 bg-card/60 p-1 backdrop-blur">{TABS.map(({ k, label, icon: I }) =>
      <button key={k} onClick={() => setTab(k)} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition active:scale-95 ${tab === k ? 'bg-gradient-to-b from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/40' : 'text-muted-foreground'}`}><I className="h-4 w-4" />{label}</button>)}</div>

    {tab === 'strike' && <ClientOnly fallback={<div className="aspect-[3/4] rounded-2xl bg-card" />}><Suspense fallback={<div className="flex aspect-[3/4] items-center justify-center rounded-2xl bg-card text-xs text-muted-foreground">Memuat arena 3D…</div>}><CyberStrike onScore={save} /></Suspense></ClientOnly>}
    {tab === 'hub' && <>
      <Lux className="!p-0"><img src={runnerArt} alt="" className="h-32 w-full object-cover opacity-90" /><div className="p-5 pt-3"><Tag>Featured Event</Tag><h2 className="mt-2 text-xl font-black">Cyber Runner Season 0</h2><p className="mb-4 text-xs text-muted-foreground">Mini-game gratis di browser. Skor tersimpan di perangkat ini.</p>
        <Button className="w-full rounded-xl font-bold" onClick={() => setTab('runner')}><Play className="mr-1 h-4 w-4" />Main sekarang</Button></div></Lux>
      <div className="space-y-2"><p className="px-1 text-[10px] font-bold uppercase tracking-widest text-primary">Turnamen mendatang</p>
        {EVENTS.map((e, i) => <div key={e} className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-card/70 p-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 text-sm font-black text-primary">#{i + 1}</div>
          <div className="flex-1"><p className="text-sm font-bold">{e}</p><div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full w-0 rounded-full bg-primary" /></div><p className="mt-1 text-[10px] text-muted-foreground">Pendaftaran belum dibuka</p></div>
          <Tag>Soon</Tag></div>)}</div>
      <Link to="/arena" className="block"><div className="rounded-2xl border border-accent/40 bg-accent/10 p-3 text-sm">Misi harian & BIXP ada di <b className="text-primary">Fox Arena →</b></div></Link>
    </>}

    {tab === 'pvp' && <Lux className="text-center !p-0"><div className="relative"><img src={vsArt} alt="Grand final duel" className="h-48 w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" /><div className="absolute inset-x-0 top-3"><Tag>Grand Final · Preview</Tag></div><p className="absolute inset-x-0 bottom-2 bg-gradient-to-b from-primary to-accent bg-clip-text text-6xl font-black italic text-transparent drop-shadow-2xl">VS</p></div><div className="p-4">
      <div className="flex items-center justify-between gap-2">
        {['Player A', 'Player B'].map((p, i) => <div key={p} className={`flex w-[38%] flex-col items-center gap-2 rounded-2xl border p-3 ${i ? 'border-accent/60' : 'border-primary/60'}`}>
          <div className={`grid h-14 w-14 place-items-center rounded-full ${i ? 'bg-accent/30' : 'bg-primary/30'}`}><Swords className="h-6 w-6" /></div><p className="text-xs font-bold">{p}</p><p className="text-[10px] text-muted-foreground">Menunggu</p></div>)}
      </div>
      <p className="text-xs text-muted-foreground">Bracket & matchmaking dibuka setelah aturan turnamen dan anti-cheat siap.</p></div></Lux>}

    {tab === 'runner' && <Lux><div className="mb-2 flex items-center justify-between"><h2 className="font-black tracking-wider">CYBER RUNNER</h2><span className="rounded-lg border border-primary/40 px-2 py-0.5 font-mono text-xs text-primary">BEST {best}</span></div>
      <p className="mb-3 text-xs text-muted-foreground">Ketuk layar untuk lompat.</p><Runner onScore={save} /></Lux>}

    {tab === 'store' && <><div className="grid grid-cols-2 gap-2">{GAMES.map((g) => <div key={g.n} className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card to-accent/15 p-3">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/20 text-xs font-black text-primary">{g.c}</div>
      <p className="mt-2 text-sm font-bold leading-tight">{g.n}</p><p className="text-[10px] text-muted-foreground">{g.u}</p><div className="mt-2"><Tag>Soon</Tag></div></div>)}</div>
      <p className="px-1 text-[11px] text-muted-foreground">Top-up dibuka setelah kerja sama dengan penyedia resmi siap. Belum ada harga atau pembayaran.</p></>}

    {tab === 'fame' && <Lux className="text-center"><Tag>Hall of Fame</Tag>
      <div className="mt-5 flex items-end justify-center gap-2">{[{ r: 2, h: 'h-20' }, { r: 1, h: 'h-28' }, { r: 3, h: 'h-14' }].map(({ r, h }) =>
        <div key={r} className="flex w-1/4 flex-col items-center gap-1"><Crown className={`h-5 w-5 ${r === 1 ? 'text-primary' : 'text-muted-foreground'}`} /><p className="text-[10px] text-muted-foreground">Kosong</p>
          <div className={`${h} w-full rounded-t-xl border border-primary/40 bg-gradient-to-t from-primary/10 to-primary/40 pt-2 text-lg font-black`}>{r}</div></div>)}</div>
      <p className="mt-4 text-xs text-muted-foreground">Peringkat hanya berisi pemain nyata dan tampil setelah musim pertama dimulai.</p></Lux>}

    {tab === 'passport' && <Lux><div className="flex items-start justify-between"><div><Tag>Gamer Passport</Tag><h2 className="mt-2 text-lg font-black tracking-wider">BIXGAME ID</h2><p className="text-[11px] text-muted-foreground">Rank: Rookie · Season 0</p></div><IdCard className="h-10 w-10 text-primary" /></div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-background/60 p-2"><p className="text-muted-foreground">Rekor Runner</p><p className="font-mono text-lg font-black text-primary">{best}</p></div><div className="rounded-xl bg-background/60 p-2"><p className="text-muted-foreground">Badge</p><p className="font-bold">Segera hadir</p></div></div>
      <div className="mt-3 flex gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="grid h-10 flex-1 place-items-center rounded-lg border border-dashed border-primary/30"><Trophy className="h-4 w-4 text-muted-foreground/50" /></div>)}</div></Lux>}

    <p className="text-center text-[11px] text-muted-foreground">{NOTE}</p>
  </div></BixShell>;
}
