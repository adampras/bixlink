import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, Wallet, Lock, Cpu, Fingerprint, Radio, ArrowLeft, Gift, Crown, Landmark, UserRound, LineChart, BookOpen, Repeat } from 'lucide-react';
import { ExchangeTerminal } from '@/components/ExchangeTerminal';
import { KycCard } from '@/components/KycCard';
import { AdminKycReview } from '@/components/AdminKycReview';
import { useMember, usePublicConfig } from '@/lib/useMember';
import heroImg from '@/assets/exchange/hero-3d.jpg';
import cMarket from '@/assets/exchange/cat-market.jpg';
import cKyc from '@/assets/exchange/cat-kyc.jpg';
import cP2p from '@/assets/exchange/cat-p2p.jpg';
import cVip from '@/assets/exchange/cat-vip.jpg';
import cProfile from '@/assets/exchange/cat-profile.jpg';
import { useBinanceDepth, useBinanceTickers } from '@/components/exchange/useBinanceLive';

export const Route = createFileRoute('/exchange')({
  head: () => ({ meta: [
    { title: 'BIXLINK Exchanger — Live Crypto Terminal & KYC' },
    { name: 'description', content: 'Live BTC, ETH, BNB and SOL charts, real-time order books and the BIX/USDT member market, with secure identity verification.' },
    { property: 'og:title', content: 'BIXLINK Exchanger — Live Crypto Terminal' },
    { property: 'og:description', content: 'Professional real-time charts, live depth and the BIX internal market in one Web3 cockpit.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: ExchangePage,
});

const PAIRS = [
  { id: 'BIX', label: 'BIX/USDT', sym: null },
  { id: 'BTC', label: 'BTC/USDT', sym: 'BTCUSDT' },
  { id: 'ETH', label: 'ETH/USDT', sym: 'ETHUSDT' },
  { id: 'BNB', label: 'BNB/USDT', sym: 'BNBUSDT' },
  { id: 'SOL', label: 'SOL/USDT', sym: 'SOLUSDT' },
  { id: 'XRP', label: 'XRP/USDT', sym: 'XRPUSDT' },
] as const;
const SYMS = PAIRS.flatMap(p => (p.sym ? [p.sym] : []));
const fmt = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: v < 10 ? 4 : 2, maximumFractionDigits: v < 10 ? 4 : 2 });

function ExchangePage() {
  const { user } = useMember();
  const { data: cfg } = usePublicConfig();
  void cfg; const ref = 0.5;
  const [pair, setPair] = useState<(typeof PAIRS)[number]>(PAIRS[1]);
  const [tf, setTf] = useState('15');
  const ticks = useBinanceTickers(SYMS);
  const { book, trades } = useBinanceDepth(pair.sym);
  const t = pair.sym ? ticks[pair.sym] : undefined;
  const chartUrl = useMemo(() => pair.sym ? `https://s.tradingview.com/widgetembed/?symbol=BINANCE%3A${pair.sym}&interval=${tf}&theme=dark&style=1&timezone=Etc%2FUTC&hide_side_toolbar=0&allow_symbol_change=0&studies=%5B%22RSI%40tv-basicstudies%22%2C%22MACD%40tv-basicstudies%22%5D&locale=en` : '', [pair, tf]);
  const router = useRouter();
  const [tab, setTab] = useState<'chart' | 'book' | 'trades'>('chart');
  const [idDone, setIdDone] = useState<boolean | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  useEffect(() => { if (!user) return;
    supabase.from('bix_identity_profiles').select('user_id').eq('user_id', user.id).maybeSingle().then(({ data }) => setIdDone(!!data));
    supabase.from('kyc_submissions').select('status').eq('user_id', user.id).maybeSingle().then(({ data }) => setKycStatus(data?.status ?? null));
  }, [user]);
  const back = () => { if (window.history.length > 1) router.history.back(); else router.navigate({ to: '/' }); };
  const verified = kycStatus === 'approved';
  const maxQ = Math.max(1, ...book.bids.map(b => b[1]), ...book.asks.map(a => a[1]));

  return <div className="ex-app min-h-dvh bg-background text-foreground">
    <header className="ex-topbar sticky top-0 z-40 flex items-center gap-2 px-3 py-2">
      <button type="button" onClick={back} aria-label="Kembali" className="ex-icon-btn"><ArrowLeft size={18}/></button>
      <div className="min-w-0 flex-1 leading-tight"><b className="block font-display text-sm font-black tracking-wide">BIXLINK <span className="text-primary">EXCHANGER</span></b>
        <span className="flex items-center gap-1 text-[9px] font-black tracking-[0.2em] text-chart-2"><Radio size={10} className="ex-pulse"/>LIVE · ENGINE 2.4M TPS · 0.42ms</span></div>
      <Link to="/sovereign-wallet" aria-label="Wallet" className="ex-icon-btn"><Wallet size={17}/></Link>
      <Link to="/settings" hash="identity" className={`ex-chip ${verified ? 'is-ok' : ''}`}><ShieldCheck size={13}/>{verified ? 'Verified' : user ? 'Verifikasi' : 'Masuk'}</Link>
    </header>
    <main className="ex-stage mx-auto max-w-7xl space-y-3 px-3 pb-28 pt-3 md:px-6">
    <section className="ex-hero ex-hero-x relative overflow-hidden rounded-2xl p-4 md:p-6">
      <img src={heroImg} alt="" width={1024} height={640} className="ex-hero-img" aria-hidden/><i className="ex-grid" aria-hidden/><i className="ex-orb" aria-hidden/>
      <p className="relative text-[9px] font-black tracking-[0.3em] text-chart-3">THE SOVEREIGN LIQUIDITY ENGINE</p>
      <h1 className="relative mt-1 font-display text-xl font-black leading-tight md:text-3xl">Satu kokpit. <span className="ex-shine">Pasar dunia & BIX</span> live.</h1>
      <div className="relative mt-3 grid grid-cols-3 gap-1.5 text-center">{[['1', 'Pantau tren'], ['2', 'Pilih pasar'], ['3', 'Trade via wallet']].map(([n, l]) =>
        <div key={n} className="ex-step"><b>{n}</b><span>{l}</span></div>)}</div>
      <div className="relative mt-3 grid grid-cols-2 gap-2 sm:flex">
        <Link to="/trade" className="ex-btn-gold justify-center"><Repeat size={14}/>Trade BIX · $0.50</Link>
        <Link to="/settings" hash="identity" className="ex-btn-ghost justify-center"><Fingerprint size={14}/>Lengkapi data</Link>
      </div>
    </section>
    <div className="ex-promos flex snap-x gap-2 overflow-x-auto pb-1">
      <Link to="/trade" className="ex-promo ex-anim is-gold snap-start"><i className="ex-fx ex-fx-orb" aria-hidden/><img src={cMarket} alt="" width={56} height={56} loading="lazy" className="ex-cat-img"/><b>Pasar BIX</b><span>Acuan tetap $0.50 / BIX</span></Link>
      <Link to="/settings" hash="identity" className="ex-promo ex-anim snap-start"><i className="ex-fx ex-fx-sheen" aria-hidden/><img src={cKyc} alt="" width={56} height={56} loading="lazy" className="ex-cat-img"/><b>Bonus 20 BIX</b><span>KYC + stake $100 → BIX terbuka</span></Link>
      <Link to="/p2p" className="ex-promo ex-anim snap-start"><i className="ex-fx ex-fx-flow" aria-hidden/><img src={cP2p} alt="" width={56} height={56} loading="lazy" className="ex-cat-img"/><b>P2P Bank & QRIS</b><span>Beli/jual BIX antar member</span></Link>
      <Link to="/stake" className="ex-promo ex-anim snap-start"><i className="ex-fx ex-fx-sheen" aria-hidden/><img src={cVip} alt="" width={56} height={56} loading="lazy" className="ex-cat-img"/><b>VIP Staker</b><span>Staker aktif dapat prioritas fitur</span></Link>
      <Link to="/profile" className="ex-promo ex-anim snap-start"><i className="ex-fx ex-fx-scan" aria-hidden/><img src={cProfile} alt="" width={56} height={56} loading="lazy" className="ex-cat-img"/><b>Profil saya</b><span>{idDone ? 'Data diri lengkap ✓' : 'Data diri belum lengkap'}</span></Link>
    </div>
    <div className="ex-ticker flex gap-2 overflow-x-auto rounded-xl p-2">
      {PAIRS.map(p => { const k = p.sym ? ticks[p.sym] : undefined; const price = p.sym ? k?.c : ref; const ch = k?.P ?? 0;
        return <button key={p.id} type="button" onClick={() => setPair(p)} className={`ex-tick shrink-0 rounded-lg px-3 py-2 text-left ${pair.id === p.id ? 'is-on' : ''}`}>
          <span className="block text-[10px] font-black tracking-widest text-muted-foreground">{p.label}</span>
          <b className="numeric block text-sm">{price ? fmt(price) : '—'}</b>
          <span className={`numeric text-[10px] font-bold ${p.sym ? (ch >= 0 ? 'text-chart-2' : 'text-destructive') : 'text-primary'}`}>{p.sym ? `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%` : 'ACUAN TETAP'}</span>
        </button>; })}
    </div>

    {pair.sym ? <>
      <div className="ex-tabs grid grid-cols-3 gap-1 rounded-full p-1 md:hidden">{([['chart', 'Grafik', LineChart], ['book', 'Order Book', BookOpen], ['trades', 'Transaksi', Repeat]] as const).map(([k, l, I]) =>
        <button key={k} type="button" onClick={() => setTab(k)} className={tab === k ? 'is-on' : ''}><I size={13}/>{l}</button>)}</div>
      <section className={`ex-panel rounded-2xl p-3 ${tab === 'chart' ? '' : 'max-md:hidden'}`}>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="font-display text-lg font-black">{pair.label}</h2>
            <p className="numeric text-[11px] text-muted-foreground">H {t ? fmt(t.h) : '—'} · L {t ? fmt(t.l) : '—'} · Vol {t ? (t.q / 1e6).toFixed(1) + 'M' : '—'} USDT</p></div>
          <div className="flex gap-1">{[['1', '1m'], ['15', '15m'], ['60', '1h'], ['240', '4h'], ['D', '1D']].map(([v, l]) =>
            <button key={v} type="button" onClick={() => setTf(v!)} className={`ex-tf ${tf === v ? 'is-on' : ''}`}>{l}</button>)}</div>
        </div>
        <iframe key={chartUrl} title={`${pair.label} live chart`} src={chartUrl} className="ex-chart w-full rounded-xl" loading="lazy"/>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className={`ex-panel rounded-2xl p-3 ${tab === 'book' ? '' : 'max-md:hidden'}`}>
          <h3 className="mb-2 text-[10px] font-black tracking-widest text-primary">LIVE ORDER BOOK</h3>
          <div className="numeric grid gap-px text-[11px]">
            <div className="flex justify-between text-[10px] text-muted-foreground"><span>Price</span><span>Amount</span></div>
            {[...book.asks].reverse().map(([p, q]) => <div key={'a' + p} className="ex-row relative flex justify-between px-1 text-destructive"><i className="ex-bar ex-bar-ask" style={{ width: `${(q / maxQ) * 100}%` }}/><span>{fmt(p)}</span><span className="text-foreground/80">{q.toFixed(4)}</span></div>)}
            <div className="my-1 text-center text-base font-black text-primary">{t ? fmt(t.c) : '—'}</div>
            {book.bids.map(([p, q]) => <div key={'b' + p} className="ex-row relative flex justify-between px-1 text-chart-2"><i className="ex-bar ex-bar-bid" style={{ width: `${(q / maxQ) * 100}%` }}/><span>{fmt(p)}</span><span className="text-foreground/80">{q.toFixed(4)}</span></div>)}
            {!book.bids.length && <p className="py-6 text-center text-muted-foreground">Connecting to live depth…</p>}
          </div>
        </section>
        <section className={`ex-panel rounded-2xl p-3 ${tab === 'trades' ? '' : 'max-md:hidden'}`}>
          <h3 className="mb-2 text-[10px] font-black tracking-widest text-primary">RECENT TRADES</h3>
          <div className="numeric grid gap-px text-[11px]">{trades.map(r => <div key={r.id} className="flex justify-between"><span className={r.buy ? 'text-chart-2' : 'text-destructive'}>{fmt(r.p)}</span><span>{r.q.toFixed(4)}</span><span className="text-muted-foreground">{new Date(r.t).toLocaleTimeString()}</span></div>)}</div>
          <div className="mt-3 rounded-xl border border-border p-3 text-[11px] text-muted-foreground">Global pairs are live market data for analysis. Trading {pair.label} on BIXLINK opens at launch; BIX trades today on the member market.</div>
          <Link to="/trade" className="ex-btn-gold mt-2 w-full justify-center">Trade BIX/USDT now →</Link>
        </section>
      </div>
    </> : <ExchangeTerminal/>}

    <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[[ShieldCheck, 'KYC 3-step', 'ID + selfie, private storage'], [Lock, 'Server-verified', 'Every balance move checked'], [Wallet, 'Web3 sign-in', 'BNB Chain signature login'], [Cpu, 'One ledger', 'Wallet · P2P · BIX PAY']].map(([I, a, b]) => { const Ic = I as typeof Lock;
        return <div key={a as string} className="ex-feature rounded-xl p-3"><Ic size={16} className="text-primary"/><b className="mt-1 block text-xs">{a as string}</b><span className="text-[10px] text-muted-foreground">{b as string}</span></div>; })}
    </section>

    <section className="ex-unlock grid grid-cols-3 gap-1.5 text-center">{[['1', 'Verifikasi KYC', '+20 BIX terkunci'], ['2', 'Stake min. $100', 'Paket aktif'], ['3', 'BIX terbuka', 'Masuk saldo']].map(([n, a, b]) =>
      <div key={n} className="ex-unlock-step"><b>{n}</b><span>{a}</span><small>{b}</small></div>)}</section>
    <p className="text-center text-[11px] text-muted-foreground">Bonus staking aktif: <b className="text-chart-3">$500 → +50 BIX</b> · <b className="text-chart-3">$1.000 → +100 BIX</b> (sekali per member, langsung bisa dipakai).</p>
    <section id="kyc" className="ex-panel rounded-2xl p-4">
      <h2 className="mb-1 text-xs font-black tracking-widest text-primary">IDENTITY VERIFICATION</h2>
      <p className="mb-3 text-xs text-muted-foreground">Member terverifikasi mendapat <b className="text-primary">20 BIX</b> (terkunci). Reward otomatis <b className="text-chart-3">terbuka dan bisa dipakai</b> setelah Anda memiliki staking aktif minimal <b>$100</b>.</p>
      {user ? <><Link to="/settings" hash="identity" className={`ex-btn-gold mb-3 w-full justify-center ${idDone ? 'opacity-90' : ''}`}><UserRound size={14}/>{idDone ? 'Perbarui data diri di Profil' : 'Lengkapi data diri di Profil'}</Link><KycCard userId={user.id}/></> : <Link to="/auth" className="ex-btn-gold w-full justify-center">Masuk untuk verifikasi</Link>}
    </section>
    {cfg?.isAdmin && <AdminKycReview/>}
    <p className="pb-4 text-center text-[10px] text-muted-foreground">Live data from public market feeds. BIX price is the BIXLINK internal reference, not an exchange listing. Not financial advice.</p>
  </main>
    <nav className="ex-dock" aria-label="Menu Exchanger">
      <Link to="/exchange" className="is-on"><LineChart size={19}/><span>Pasar</span></Link>
      <Link to="/trade"><Repeat size={19}/><span>Trade</span></Link>
      <Link to="/p2p"><Landmark size={19}/><span>P2P</span></Link>
      <Link to="/sovereign-wallet"><Wallet size={19}/><span>Aset</span></Link>
      <Link to="/settings" hash="identity"><Fingerprint size={19}/><span>KYC</span></Link>
    </nav></div>;
}
