import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, LockKeyhole, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { confirmPin, txFeedback } from '@/components/TxFeedback';
import { number } from '@/lib/bixlink';
import { nativeBixApy, boosterMaximum } from '@/lib/booster-apy';
import { usePublicConfig } from '@/lib/useMember';
import { useServerFn } from '@tanstack/react-start';
import { stakeNativeBix, unstakeNativeBix } from '@/lib/network.functions';

const LOCKS = [30, 90, 180, 360, 540];

export function BixStakePanel({ bixPrice }: { bixPrice: number }) {
  const qc = useQueryClient();
  const stakeBix = useServerFn(stakeNativeBix); const unstakeBix = useServerFn(unstakeNativeBix);
  const { data: cfg } = usePublicConfig();
  const [amount, setAmount] = useState('100');
  const [days, setDays] = useState(90);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const q = useQuery({
    queryKey: ['bix-native-stakes'],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { bal: 0, stakes: [] as any[] };
      const [b, s] = await Promise.all([
        supabase.rpc('bix_asset_balances', { p_user: u.user.id }).single(),
        supabase.from('bix_stakes').select('*').eq('user_id', u.user.id).order('created_at', { ascending: false }),
      ]);
      return { bal: Number((b.data as any)?.bix_balance ?? 0), stakes: s.data ?? [] };
    },
  });

  const amt = Number(amount) || 0;
  const maximum = boosterMaximum(cfg?.booster.maxApy);
  const apy = nativeBixApy(amt, days, maximum);
  const yearly = amt * apy / 100;
  const periodProfit = yearly * days / 365;
  const active = (q.data?.stakes ?? []).filter(s => s.status === 'active');
  const live = active.reduce((sum, s) => sum + Number(s.amount_bix) * Number(s.apy) / 100 * Math.min((now - new Date(s.created_at).getTime()) / 86400000, s.lock_days) / 365, 0);

  async function stake() {
    if (!(await confirmPin())) return;
    setBusy(true); setMsg('');
    try {
      await stakeBix({ data: { amount: amt, days } });
      setMsg(`CONGRATULATION — ${number(amt)} BIX staked at ${apy}% APY.`); txFeedback.success('BIX staked', `${number(amt)} BIX at ${apy}% APY`);
      await qc.invalidateQueries();
    } catch (error) { setMsg(error instanceof Error ? error.message : 'Could not stake BIX.'); txFeedback.fail('BIX staking failed', error); }
    finally { setBusy(false); }
  }
  async function unstake(id: string) {
    if (!(await confirmPin())) return;
    setBusy(true);
    try {
      const data = await unstakeBix({ data: { id } });
      setMsg(data.penalty > 0 ? `Unstaked early. Penalty ${number(data.penalty)} BIX.` : 'Unstaked. Principal returned.'); txFeedback.success('BIX unstaked', data.penalty > 0 ? `Penalty ${number(data.penalty)} BIX` : 'Principal returned.');
      await qc.invalidateQueries();
    } catch (error) { setMsg(error instanceof Error ? error.message : 'Could not unstake.'); txFeedback.fail('Unstake failed', error); }
    finally { setBusy(false); }
  }

  return <section className="rounded-[20px] border border-chart-2/40 bg-card p-5 sm:p-6">
    <div className="eyebrow"><Coins size={14} className="text-chart-2"/> STAKE BIX DIRECTLY</div>
    <h2 className="mt-2 font-display text-2xl font-black">BIX Booster Staking</h2>
    <p className="mt-2 text-sm text-muted-foreground">Stake your BIX balance here. Volume and lock period set your annual APY (8–{maximum}%). Profit split: 70% passive BIX · 30% active USDT — projection only.</p>
    <div className="mt-4 flex items-center justify-between rounded-xl border border-border p-3 text-sm"><span>Available BIX</span><b className="numeric">{number(q.data?.bal ?? 0, { maximumFractionDigits: 2 })} BIX</b></div>
    <label className="mt-4 block text-xs font-bold uppercase text-muted-foreground">Amount (BIX, min 10)</label>
    <div className="mt-1 flex gap-2">
      <input type="number" min={10} value={amount} onChange={e => setAmount(e.target.value)} className="numeric w-full rounded-xl border border-border bg-background px-3 py-2"/>
      <Button type="button" variant="outline" className="rounded-xl" onClick={() => setAmount(String(Math.floor(q.data?.bal ?? 0)))}>MAX</Button>
    </div>
    <label className="mt-4 block text-xs font-bold uppercase text-muted-foreground">Lock period</label>
    <div className="mt-1 grid grid-cols-5 gap-2">{LOCKS.map(d => <Button key={d} type="button" variant={d === days ? 'default' : 'outline'} className="rounded-xl px-1 text-xs" onClick={() => setDays(d)}>{d}d</Button>)}</div>
    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
      <div className="rounded-xl border border-border p-3"><span className="text-xs text-muted-foreground">APY</span><b className="numeric block text-chart-2 text-xl">{apy}%</b></div>
      <div className="rounded-xl border border-border p-3"><span className="text-xs text-muted-foreground">Est. profit / period</span><b className="numeric block">{number(periodProfit, { maximumFractionDigits: 2 })} BIX</b></div>
      <div className="rounded-xl border border-border p-3"><span className="text-xs text-muted-foreground">Passive 70% BIX</span><b className="numeric block text-primary">{number(periodProfit * 0.7, { maximumFractionDigits: 2 })} BIX</b></div>
      <div className="rounded-xl border border-border p-3"><span className="text-xs text-muted-foreground">Active 30% USDT</span><b className="numeric block text-chart-3">${number(periodProfit * 0.3 * bixPrice, { maximumFractionDigits: 2 })}</b></div>
    </div>
    <Button className="mt-4 w-full rounded-xl" disabled={busy || amt < 10 || amt > (q.data?.bal ?? 0)} onClick={stake}><Zap/> {busy ? 'Staking…' : amt > (q.data?.bal ?? 0) ? 'Insufficient BIX balance' : 'Stake BIX now'}</Button>
    <p className="mt-3 text-xs text-chart-3">Direct referral bonus: {cfg?.referrals.bixDirectEnabled === false ? 'Closed' : `${cfg?.referrals.bixDirectPct ?? cfg?.referrals.direct ?? 10}% · 100% BIX · pending owner approval`}</p>
    <p className="mt-2 text-xs text-muted-foreground">Early unstake before lock end applies a 10% BIX penalty. Figures are projections, not guaranteed.</p>
    {msg && <p className="mt-3 rounded-xl border border-chart-2/40 bg-chart-2/10 p-3 text-sm font-bold text-chart-2">{msg}</p>}

    {active.length > 0 && <div className="mt-6">
      <div className="flex justify-between text-sm"><b>My BIX stakes</b><span className="numeric text-chart-2">Live profit {number(live, { maximumFractionDigits: 6 })} BIX</span></div>
      <div className="mt-3 space-y-2">{active.map(s => {
        const end = new Date(s.created_at).getTime() + s.lock_days * 86400000;
        const pct = Math.min(100, (now - new Date(s.created_at).getTime()) / (s.lock_days * 86400000) * 100);
        return <div key={s.id} className="rounded-xl border border-border p-3 text-sm">
          <div className="flex items-center justify-between gap-2"><b className="numeric">{number(Number(s.amount_bix))} BIX · {s.apy}%</b><Button size="sm" variant="outline" className="rounded-full" onClick={() => unstake(s.id)}>{now < end ? 'Unstake early' : 'Claim'}</Button></div>
          <div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-chart-2" style={{ width: `${pct}%` }}/></div>
          <span className="numeric mt-1 flex items-center gap-1 text-xs text-muted-foreground"><LockKeyhole size={11}/>{s.lock_days} days · {pct.toFixed(1)}%</span>
        </div>;
      })}</div>
    </div>}
  </section>;
}
