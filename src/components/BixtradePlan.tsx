import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { profitSplit, type BixtradeSettings } from '@/lib/bixtrade';

type Bonus = { id: string; kind: string; amount_usd: number; rate_pct: number; status: string; created_at: string };

/** Member view of the owner-controlled BIXTrade plan. All figures are projections or owner-reviewed records. */
export function BixtradePlan({ cfg }: { cfg: BixtradeSettings }) {
  const [rows, setRows] = useState<Bonus[]>([]);
  useEffect(() => { void supabase.from('bixtrade_bonuses').select('id,kind,amount_usd,rate_pct,status,created_at').order('created_at', { ascending: false }).limit(20).then(({ data }) => setRows((data ?? []) as Bonus[])); }, []);
  if (!cfg.planEnabled) return null;
  const ex = profitSplit(cfg, 100);
  const items: [boolean, string, string][] = [
    [true, 'Profit split', `${cfg.memberSharePct}% member · ${cfg.companySharePct}% company · ${cfg.affiliateSharePct}% affiliate pool`],
    [cfg.matchingEnabled, 'Profit matching', `L1 ${cfg.matchL1}% · L2 ${cfg.matchL2}% · L3 ${cfg.matchL3}% of downline member profit`],
    [cfg.sponsorBonusEnabled, 'Sponsor bonus', `${cfg.sponsorBonusPct}% of a direct referral's approved bot deposit`],
    [cfg.compoundEnabled, 'Compound bonus', `+${cfg.compoundBonusPct}% on profit kept in the bot for a full cycle`],
    [cfg.leaderPoolEnabled, 'Leader pool', `${cfg.leaderPoolPct}% pool shared by leaders with ≥ ${cfg.leaderPoolMinTeamUsd.toLocaleString()} USDT team capital`],
    [cfg.milestoneEnabled, 'Milestone reward', `${cfg.milestoneRewardUsd} USDT when your team bot capital reaches ${cfg.milestoneTargetUsd.toLocaleString()} USDT`],
    [cfg.earlyExitEnabled, 'Early exit', `Withdraw before lock ends: extra ${cfg.earlyExitPct}% fee`],
  ];
  return <section className="arb-card mt-4">
    <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Gift size={18} className="text-chart-3"/> BIXTrade plan & bonuses</h2>
    <p className="mt-1 text-[11px] text-muted-foreground">Cycles: {cfg.cycleDays.map(d => d === 1 ? '24h flexible' : `${d} days`).join(' · ')}</p>
    <div className="mt-3 grid gap-2 text-xs">{items.filter(i => i[0]).map(([, t, d]) => <div key={t} className="arb-pulse-row"><i/><span><b>{t}</b><br/><span className="text-muted-foreground">{d}</span></span></div>)}</div>
    <p className="mt-3 text-[11px]">Example on 100 USDT bot profit: you <b className="text-chart-2">{ex.member}</b> · L1 sponsor {ex.l1} · L2 {ex.l2} · L3 {ex.l3}</p>
    {rows.length > 0 && <div className="mt-3 grid gap-1 text-[11px]"><b>My bonus records</b>{rows.map(r => <div key={r.id} className="flex justify-between"><span>{r.kind} · {Number(r.rate_pct)}%</span><span>{Number(r.amount_usd).toFixed(2)} USDT · <span className={`arb-badge is-${r.status}`}>{r.status}</span></span></div>)}</div>}
    <p className="mt-2 text-[10px] text-muted-foreground">Projections only, not guaranteed. Bonuses are recorded for owner review and never credited automatically.</p>
  </section>;
}
