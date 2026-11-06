import { useCallback, useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { updateSetting } from '@/lib/bixlink.functions';
import { readBixtrade, withdrawNet, type BixtradeSettings } from '@/lib/bixtrade';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AdminFold } from '@/components/AdminNavigation';

type Bonus = { id: string; user_id: string; member_id: string; kind: string; amount_usd: number; status: string };
type Req = { id: string; user_id: string; funding?: string; kind: string; amount_usd: number; strategy: string; status: string; created_at: string };

export function AdminBixtrade({ initial, onMessage, onSaved }: { initial?: unknown; onMessage: (m: string) => void; onSaved?: () => void }) {
  const [s, setS] = useState<BixtradeSettings>(() => readBixtrade(initial));
  const [busy, setBusy] = useState(false);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const save = useServerFn(updateSetting);
  const loadBonus = useCallback(async () => { const { data } = await supabase.from('bixtrade_bonuses').select('id,user_id,member_id,kind,amount_usd,status').eq('status', 'pending').order('created_at', { ascending: false }).limit(50); setBonuses((data ?? []) as Bonus[]); }, []);
  useEffect(() => { void loadBonus(); }, [loadBonus]);
  const reviewBonus = async (id: string, ok: boolean) => { const { error } = await supabase.rpc('bixtrade_bonus_review', { p_id: id, p_approve: ok }); onMessage(error ? error.message : ok ? 'Bonus approved (recorded, not automatically added to balance).' : 'Bonus rejected.'); void loadBonus(); };
  const tg = (k: 'planEnabled' | 'matchingEnabled' | 'sponsorBonusEnabled' | 'earlyExitEnabled' | 'compoundEnabled' | 'leaderPoolEnabled' | 'milestoneEnabled', label: string) => <label className="flex items-center justify-between gap-3"><b>{label}</b><Switch checked={s[k]} disabled={busy} onCheckedChange={v => submit({ ...s, [k]: v })}/></label>;
  const fld = (k: keyof BixtradeSettings, label: string, step = '0.1') => <label>{label}<input className="form-input mt-1" type="number" step={step} value={Number(s[k])} onChange={num(k)}/></label>;
  useEffect(() => { setS(readBixtrade(initial)); }, [initial]);
  const load = useCallback(async () => {
    let q = supabase.from('bixtrade_requests').select('id,user_id,funding,kind,amount_usd,strategy,status,created_at').order('created_at', { ascending: false }).limit(50);
    if (filter === 'pending') q = q.eq('status', 'pending');
    const { data } = await q; setReqs((data ?? []) as Req[]);
  }, [filter]);
  useEffect(() => { void load(); }, [load]);
  const num = (k: keyof BixtradeSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setS(v => ({ ...v, [k]: Number(e.target.value) }));
  const submit = async (next = s) => {
    setBusy(true);
    try { await save({ data: { key: 'bixtrade', value: next } }); setS(next); onMessage(`BIXTrade saved · ${next.enabled ? 'ACTIVE' : 'Under Reconstruction'}.`); onSaved?.(); }
    catch (e) { onMessage(e instanceof Error ? e.message : 'Failed to save BIXTrade.'); } finally { setBusy(false); }
  };
  const decide = async (id: string, status: 'approved' | 'rejected') => {
    const { data, error } = await supabase.rpc('bixtrade_review', { p_id: id, p_status: status });
    const d = data as { kind?: string; settled_usd?: number } | null;
    onMessage(error ? error.message : status === 'rejected' ? 'Request rejected.' : d?.kind === 'deposit' ? `Approved · ${Number(d.settled_usd).toFixed(2)} USDT moved from main wallet to bot.` : `Approved · ${Number(d?.settled_usd).toFixed(2)} USDT (net) returned to main wallet.`); void load();
  };
  const sw = (k: 'depositOpen' | 'withdrawOpen', label: string) => <label className="flex items-center justify-between gap-3"><b>{label}</b><Switch checked={s[k]} disabled={busy} onCheckedChange={v => submit({ ...s, [k]: v })}/></label>;
  return <AdminFold title="BIXTrade Bot Arbitrase" tone="gold" badge={s.enabled ? 'ACTIVE' : 'UNDER RECONSTRUCTION'}>
    <div className="mt-4 grid gap-4 text-xs">
      <label className="flex items-center justify-between gap-3"><span><b>Open BIXTrade page</b><br/><span className="text-muted-foreground">When closed, members see “Under Reconstruction”.</span></span>
        <Switch checked={s.enabled} disabled={busy} onCheckedChange={v => submit({ ...s, enabled: v })}/></label>
      <label className="flex items-center justify-between gap-3"><span><b>Public showcase only</b><br/><span className="text-muted-foreground">Members see only the AI bot engine; deposit, withdraw and plan stay hidden (kept here).</span></span>
        <Switch checked={s.showcaseOnly} disabled={busy} onCheckedChange={v => submit({ ...s, showcaseOnly: v })}/></label>
      {sw('depositOpen', 'Enable bot deposit')}
      {sw('withdrawOpen', 'Enable bot withdrawal')}
      <div className="grid gap-3 sm:grid-cols-2">
        <label>Profit harian minimum (%)<input className="form-input mt-1" type="number" step="0.01" min={0} max={5} value={s.minDailyPct} onChange={num('minDailyPct')}/></label>
        <label>Profit harian maksimum (%)<input className="form-input mt-1" type="number" step="0.01" min={0} max={5} value={s.maxDailyPct} onChange={num('maxDailyPct')}/></label>
        <label>Win rate tampilan (%)<input className="form-input mt-1" type="number" min={50} max={99} value={s.winRate} onChange={num('winRate')}/></label>
        <label>Deposit minimum (USDT)<input className="form-input mt-1" type="number" min={10} value={s.minAlloc} onChange={num('minAlloc')}/></label>
        <label>Deposit maksimum (USDT)<input className="form-input mt-1" type="number" min={10} value={s.maxAlloc} onChange={num('maxAlloc')}/></label>
        <label>Withdraw minimum (USDT)<input className="form-input mt-1" type="number" min={1} value={s.minWithdraw} onChange={num('minWithdraw')}/></label>
        <label>Withdrawal fee (%)<input className="form-input mt-1" type="number" step="0.1" min={0} max={20} value={s.withdrawFeePct} onChange={num('withdrawFeePct')}/></label>
        <label>Lock period (days)<input className="form-input mt-1" type="number" min={0} max={365} value={s.lockDays} onChange={num('lockDays')}/></label>
        <label className="sm:col-span-2">Message when closed<input className="form-input mt-1" maxLength={200} value={s.notice ?? ''} onChange={e => setS(v => ({ ...v, notice: e.target.value }))}/></label>
      </div>
      <div className="grid gap-3 rounded-lg border border-border p-3">
        <b>Marketing plan & pembonusan</b>
        {tg('planEnabled', 'Show plans to members')}
        <div className="grid gap-3 sm:grid-cols-3">{fld('memberSharePct', 'Member revenue share (%)')}{fld('companySharePct', 'Perusahaan (%)')}{fld('affiliateSharePct', 'Pool afiliasi (%)')}</div>
        <p className="text-muted-foreground">Total profit sharing must be 100%.</p>
        {tg('matchingEnabled', 'Bonus matching profit L1–L3')}
        <div className="grid gap-3 sm:grid-cols-3">{fld('matchL1', 'Level 1 (%)')}{fld('matchL2', 'Level 2 (%)')}{fld('matchL3', 'Level 3 (%)')}</div>
        {tg('sponsorBonusEnabled', 'Deposit sponsor bonus (recorded for review)')}
        {fld('sponsorBonusPct', 'Bonus sponsor (%)')}
        {tg('earlyExitEnabled', 'Allow early withdrawal with penalty')}
        {fld('earlyExitPct', 'Early withdrawal penalty (%)')}
        {tg('compoundEnabled', 'Bonus compound')}
        {fld('compoundBonusPct', 'Bonus compound (%)')}
        {tg('leaderPoolEnabled', 'Leader pool')}
        <div className="grid gap-3 sm:grid-cols-2">{fld('leaderPoolPct', 'Leader pool (%)')}{fld('leaderPoolMinTeamUsd', 'Team capital requirement (USDT)', '1')}</div>
        {tg('milestoneEnabled', 'Team milestone reward')}
        <div className="grid gap-3 sm:grid-cols-2">{fld('milestoneTargetUsd', 'Team capital target (USDT)', '1')}{fld('milestoneRewardUsd', 'Reward (USDT)', '1')}</div>
        <label>Cycle options (days, comma-separated)<input className="form-input mt-1" defaultValue={s.cycleDays.join(',')} key={s.cycleDays.join(',')} onBlur={e => { const d = e.target.value.split(',').map(x => Math.round(Number(x))).filter(x => x >= 1 && x <= 365).slice(0, 6); if (d.length) setS(v => ({ ...v, cycleDays: d })); }}/></label>
      </div>
      <p className="text-muted-foreground">Approve deposit = member's main wallet USDT moved to bot capital (checks for sufficient balance). Approve withdraw = net amount after fees returned to main wallet (checks capital & lock period). Profit is only a projection, never added.</p>
      <Button disabled={busy} onClick={() => submit()}>{busy ? 'Saving…' : 'Save settings'}</Button>

      <div className="border-t border-border pt-3"><b>Sponsor bonus awaiting review</b>
        <div className="mt-2 grid gap-2">{bonuses.length ? bonuses.map(b => <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2"><span>{b.kind} · {Number(b.amount_usd).toFixed(2)} USDT<br/><span className="text-muted-foreground">penerima {b.user_id.slice(0, 8)} · dari {b.member_id.slice(0, 8)}</span></span><span className="flex gap-1"><Button size="sm" onClick={() => reviewBonus(b.id, true)}>Setujui</Button><Button size="sm" variant="outline" onClick={() => reviewBonus(b.id, false)}>Tolak</Button></span></div>) : <p className="text-muted-foreground">No pending bonuses.</p>}</div>
      </div>
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between"><b>Permintaan deposit / withdraw bot</b>
          <select className="form-input w-auto" value={filter} onChange={e => setFilter(e.target.value as 'pending' | 'all')}><option value="pending">Pending</option><option value="all">All</option></select></div>
        <div className="mt-2 grid gap-2">{reqs.length ? reqs.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2">
          <span><b className="uppercase">{r.kind}</b>{r.funding === 'virtual' ? ' · VIRTUAL (demo)' : ''} {Number(r.amount_usd).toFixed(2)} USDT{r.kind === 'withdraw' ? ` (bersih ${withdrawNet(s, Number(r.amount_usd)).toFixed(2)})` : ''} · {r.strategy}<br/><span className="text-muted-foreground">{r.user_id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}</span></span>
          {r.status === 'pending' ? <span className="flex gap-1"><Button size="sm" onClick={() => decide(r.id, 'approved')}>Setujui</Button><Button size="sm" variant="outline" onClick={() => decide(r.id, 'rejected')}>Reject</Button></span> : <span className={`arb-badge is-${r.status}`}>{r.status}</span>}
        </div>) : <p className="text-muted-foreground">No requests.</p>}</div>
      </div>
    </div>
  </AdminFold>;
}
