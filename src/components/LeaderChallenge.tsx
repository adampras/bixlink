import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy, ShieldCheck, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type Status = { eligible: boolean; count: number; target: number; reward: number; selfVerified: boolean; claim: { status: string; note?: string | null } | null };

/** Leader/Loan Challenge: 1,000 verified real team members → 1,000 BIX, owner-reviewed and vault-funded. */
export function LeaderChallenge({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const { data } = useQuery({ queryKey: ['leader-challenge', userId], queryFn: async () => {
    const { data, error } = await supabase.rpc('bix_leader_challenge_status' as never);
    if (error) throw error; return data as unknown as Status;
  } });
  if (!data?.eligible) return null;
  const pct = Math.min(100, (data.count / data.target) * 100);
  const ready = data.count >= data.target && data.selfVerified && !data.claim;
  const claim = async () => {
    setBusy(true); setMsg('');
    const { error } = await supabase.rpc('bix_leader_challenge_claim' as never);
    setBusy(false);
    if (error) setMsg(error.message); else { setMsg('Claim submitted — Owner review in progress.'); await qc.invalidateQueries({ queryKey: ['leader-challenge', userId] }); }
  };
  return <section aria-label="Leader challenge" className="leader-challenge mt-6">
    <div className="flex items-center justify-between gap-2"><span className="eyebrow flex items-center gap-1.5"><Trophy size={13}/> LEADER CHALLENGE</span><span className="lc-reward numeric">{data.reward.toLocaleString('en-US')} BIX</span></div>
    <h2 className="mt-1 font-display text-lg font-black">Build a team of 1,000 verified members</h2>
    <div className="lc-bar mt-3" role="progressbar" aria-valuenow={data.count} aria-valuemin={0} aria-valuemax={data.target}><i style={{ width: `${pct}%` }}/></div>
    <div className="mt-1.5 flex justify-between text-xs"><b className="numeric">{data.count.toLocaleString('en-US')} / {data.target.toLocaleString('en-US')}</b><span className="text-muted-foreground">{pct.toFixed(1)}%</span></div>
    <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-primary"/>Counts whole-team members with a verified real email. Clone accounts and wallet-only accounts without email are excluded. One claim per account, reviewed by the owner.</p>
    {data.claim
      ? <p className="mt-3 rounded-xl border border-border px-3 py-2 text-center text-xs font-bold uppercase">Claim {data.claim.status}{data.claim.note ? ` · ${data.claim.note}` : ''}</p>
      : <Button className="lc-claim mt-3 w-full" disabled={!ready || busy} onClick={claim}>{ready ? (busy ? 'Submitting…' : 'CLAIM 1,000 BIX CHALLENGE') : <><Lock size={14}/> {data.selfVerified ? 'Locked until target' : 'Verify your email first'}</>}</Button>}
    {msg && <p className="mt-2 text-center text-xs" role="status">{msg}</p>}
  </section>;
}
