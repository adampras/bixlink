import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, Coins, Clock3, ShieldCheck, TrendingUp, WalletCards } from 'lucide-react';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { Button } from '@/components/ui/button';
import { money, number } from '@/lib/bixlink';
import { useMember, usePublicConfig } from '@/lib/useMember';

export const Route = createFileRoute('/profit')({
  head: () => ({ meta: [
    { title: 'Staking Profit — BIXLINK' },
    { name: 'description', content: 'Track active BIXLINK staking profit projections in USDT and BIX, refreshed every minute.' },
    { property: 'og:title', content: 'Staking Profit — BIXLINK' },
    { property: 'og:description', content: 'A live one-minute view of active staking profit allocations in USDT and BIX.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: ProfitPage,
});

const MINUTE = 60_000;
const YEAR = 365 * 24 * 60 * MINUTE;

function ProfitPage() {
  const { user, ready, data } = useMember();
  const { data: cfg } = usePublicConfig();
  const qc = useQueryClient();
  const [now, setNow] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const leaderFn = useServerFn(getMyLeader);
  const { data: leader } = useQuery({ queryKey: ['my-leader', user?.id], queryFn: () => leaderFn(), enabled: !!user });
  const { data: claimed } = useQuery({ queryKey: ['profit-claimed', user?.id], enabled: !!user, queryFn: async () => { const { data: c } = await supabase.rpc('bix_profit_claimed'); return new Map((c ?? []).map(x => [x.stake_id, Number(x.profit_usd)])); } });
  const locked = !!leader && leader.status === 'approved' && !leader.qualified;

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const minuteNow = now === null ? null : Math.floor(now / MINUTE) * MINUTE;
  const splitUsdt = Number(cfg?.referrals.splitUsdt ?? 70) / 100;
  const splitBix = Number(cfg?.referrals.splitBix ?? 30) / 100;
  const bixPrice = Math.max(Number(cfg?.bixMarket.priceUsd ?? 0.84291), 0.000001);
  const boosterActive = cfg?.booster.enabled !== false;
  const active = useMemo(() => boosterActive ? (data?.stakes ?? []).filter(stake => stake.status === 'active' && stake.activated_at) : [], [boosterActive, data?.stakes]);
  const rows = useMemo(() => active.map(stake => {
    const started = new Date(stake.activated_at ?? stake.created_at).getTime();
    const elapsed = minuteNow === null ? 0 : Math.max(0, Math.min(minuteNow - started, Number(stake.lock_days) * 24 * 60 * MINUTE));
    const annual = Number(stake.amount_usd) * Number(stake.apy) / 100;
    const accrued = Math.max(0, annual * elapsed / YEAR - (claimed?.get(stake.id) ?? 0));
    const daily = annual / 365;
    return {
      ...stake,
      accrued,
      usdt: accrued * splitUsdt,
      bix: accrued * splitBix / bixPrice,
      daily,
      minute: daily / 1440,
    };
  }), [active, bixPrice, minuteNow, splitBix, splitUsdt, claimed]);
  const totals = rows.reduce((sum, row) => ({ accrued: sum.accrued + row.accrued, usdt: sum.usdt + row.usdt, bix: sum.bix + row.bix, daily: sum.daily + row.daily, minute: sum.minute + row.minute }), { accrued: 0, usdt: 0, bix: 0, daily: 0, minute: 0 });
  const withdraw = async () => {
    setBusy(true); setMsg(null);
    const { data: r, error } = await supabase.rpc('bix_claim_stake_profit');
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    const res = r as { usdt: number; bix: number };
    setMsg(`Moved to main wallet: ${number(res.usdt, { maximumFractionDigits: 4 })} USDT + ${number(res.bix, { maximumFractionDigits: 4 })} BIX.`);
    await Promise.all([qc.invalidateQueries({ queryKey: ['profit-claimed'] }), qc.invalidateQueries({ queryKey: ['my-bixlink'] })]);
  };
  const nextRefresh = now === null ? 60 : 60 - Math.floor((now % MINUTE) / 1000);

  return <BixShell><main className="profit-page mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-10">
    <MemberGate ready={ready} signedIn={!!user} title="PROFIT">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="eyebrow"><Activity size={14}/> ACTIVE YIELD LEDGER</div><h1 className="section-title">STAKING <span>PROFIT</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Your active BIXCOIN staking projection is recalculated every minute and allocated between USDT and BIX.</p></div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${boosterActive ? 'border-chart-2/40 bg-chart-2/10 text-chart-2' : 'border-border bg-muted text-muted-foreground'}`}><i className={`h-2 w-2 rounded-full ${boosterActive ? 'animate-pulse bg-chart-2' : 'bg-muted-foreground'}`}/> {boosterActive ? `BOOSTER LIVE · ${nextRefresh}s` : 'BOOSTER PAUSED'}</span>
      </div>

       <section aria-label="Profit summary" className="profit-summary mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="profit-metric profit-metric--total"><TrendingUp/><span>Total active profit</span><strong className="numeric">{money(totals.accrued)}</strong><small>Projected accrued yield</small></div>
        <div className="profit-metric profit-metric--usdt"><WalletCards/><span>USDT profit · {Math.round(splitUsdt * 100)}%</span><strong className="numeric">{number(totals.usdt, { minimumFractionDigits: 8, maximumFractionDigits: 8 })}</strong><small>Virtual USDT allocation</small></div>
        <div className="profit-metric profit-metric--bix"><Coins/><span>BIX profit · {Math.round(splitBix * 100)}%</span><strong className="numeric">{number(totals.bix, { minimumFractionDigits: 8, maximumFractionDigits: 8 })}</strong><small>At ${bixPrice.toFixed(6)} reference</small></div>
        <div className="profit-metric profit-metric--daily"><Clock3/><span>Daily profit</span><strong className="numeric">{money(totals.daily)}</strong><small>+{money(totals.minute)} each minute</small></div>
      </section>

      <section aria-label="Withdraw profit" className="profit-withdraw mt-5">
        <div className="profit-withdraw__info"><span className="eyebrow"><WalletCards size={14}/> WITHDRAW TO MAIN WALLET</span><div className="profit-withdraw__amounts"><div><small>USDT</small><b className="numeric">{number(totals.usdt, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</b></div><div><small>BIX</small><b className="numeric">{number(totals.bix, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</b></div></div></div>
        {locked
          ? <div className="profit-withdraw__lock"><Lock size={16}/><div><b>Leader withdraw locked</b><small className="numeric">Team turnover {money(leader!.turnover)} / {money(leader!.target)} target</small></div></div>
          : <button type="button" className="profit-withdraw__btn" disabled={busy || totals.accrued < 0.01} onClick={withdraw}><ArrowDownToLine size={18}/>{busy ? 'Processing…' : 'Withdraw Profit'}</button>}
        {msg && <p className="profit-withdraw__msg">{msg}</p>}
      </section>

       <div className="mt-6 flex items-end justify-between gap-4"><div><div className="eyebrow">ACTIVE POSITIONS</div><h2 className="mt-2 font-display text-2xl font-black">Profit by stake</h2></div><span className="numeric text-xs text-muted-foreground">{rows.length} active</span></div>
      <section className="mt-4 space-y-3">
        {rows.map(row => <article key={row.id} className="profit-position">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-[10px] font-extrabold uppercase text-chart-2">Yield active</span><h3 className="mt-1 font-display text-lg font-black">{row.package_id}</h3><p className="numeric text-xs text-muted-foreground">{money(Number(row.amount_usd))} · {row.apy}% APY</p></div><div className="text-right"><span className="text-[10px] uppercase text-muted-foreground">Accrued total</span><strong className="numeric block text-xl text-chart-3">{number(row.accrued, { minimumFractionDigits: 8, maximumFractionDigits: 8 })} USD</strong></div></div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-xs"><div><span className="text-muted-foreground">USDT</span><b className="numeric mt-1 block text-chart-2">{number(row.usdt, { minimumFractionDigits: 8, maximumFractionDigits: 8 })}</b></div><div><span className="text-muted-foreground">BIX</span><b className="numeric mt-1 block text-primary">{number(row.bix, { minimumFractionDigits: 8, maximumFractionDigits: 8 })}</b></div><div><span className="text-muted-foreground">Per minute</span><b className="numeric mt-1 block">{money(row.minute)}</b></div></div>
        </article>)}
        {!rows.length && <div className="profit-empty"><ShieldCheck/><h3>No active staking profit yet</h3><p>Activate a staking package to start the one-minute profit projection.</p><Button asChild className="mt-5 rounded-full"><Link to="/stake">Choose a package <ArrowUpRight/></Link></Button></div>}
      </section>
      <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-chart-3"/>Profit values are live internal projections, not paid or withdrawable balances. They stop increasing when a stake ends or is unstaked.</p>
    </MemberGate>
  </main></BixShell>;
}