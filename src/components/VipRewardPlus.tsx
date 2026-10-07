import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Crown, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { claimVip, getVipStatus } from '@/lib/network.functions';
import { money, number } from '@/lib/bixlink';

export function VipRewardPlus() {
  const fetchVip = useServerFn(getVipStatus); const claim = useServerFn(claimVip);
  const { data, refetch } = useQuery({ queryKey: ['vip-status'], queryFn: () => fetchVip() });
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState<number | null>(null);
  const sales = Number(data?.teamSalesUsd ?? 0); const tiers = data?.tiers ?? [];
  const next = tiers.find(t => !t.qualified);
  const pct = next ? Math.min(100, (sales / next.targetUsd) * 100) : 100;
  return <section className="mt-6 rounded-[20px] border border-chart-3/40 bg-card p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-display text-lg font-bold"><Crown size={18} className="text-chart-3"/>REWARD PLUS VIP</h2><span className="text-xs text-muted-foreground">One-time reward per level</span></div>
    <div className="mt-3 rounded-xl border border-border p-3"><span className="text-xs text-muted-foreground">Team sales</span><b className="numeric block text-2xl text-chart-3">{money(sales)}</b>
      {next && <><progress className="mt-2 h-2 w-full" max={100} value={pct}/><p className="mt-1 text-xs text-muted-foreground">Next: VIP{next.level} · {money(next.targetUsd)}</p></>}</div>
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{tiers.map(t => {
      const claimed = t.status === 'approved' || t.status === 'pending';
      return <div key={t.level} className={`rounded-xl border p-3 text-center ${t.qualified ? 'border-chart-3' : 'border-border opacity-80'}`}>
        <b className="font-display text-sm text-chart-3">VIP{t.level}</b>
        <p className="numeric text-xs text-muted-foreground">{money(t.targetUsd)}</p>
        <p className="numeric mt-1 text-sm font-bold">{number(t.rewardBix)} BIX</p>
        <div className="mt-2">{t.status === 'approved' ? <span className="inline-flex items-center gap-1 text-xs font-bold text-chart-2"><Check size={12}/>Received</span>
          : t.status === 'pending' ? <span className="text-xs font-bold text-chart-3">Pending review</span>
          : t.qualified && !claimed ? <Button size="sm" className="h-7 rounded-full px-3 text-xs" disabled={busy === t.level} onClick={async () => { setBusy(t.level); try { await claim({ data: { level: t.level } }); await refetch(); setMsg('Reward claimed. Awaiting owner review.'); } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not claim.'); } setBusy(null); }}>Claim</Button>
          : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock size={11}/>Locked</span>}</div>
      </div>; })}</div>
    {msg && <p className="mt-3 text-xs text-chart-2">{msg}</p>}
    <p className="mt-3 text-xs text-muted-foreground">Team sales count active USDT stakes across your whole network. Each VIP reward is paid once in BIX after owner review.</p>
  </section>;
}
