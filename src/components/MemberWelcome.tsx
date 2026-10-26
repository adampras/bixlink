import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { claimQuest, getArenaStatus } from '@/lib/arena.functions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ArenaArtwork } from '@/components/ArenaArtwork';
import { welcomeReward } from '@/lib/arena';

const KEY = 'bixlink-member-welcome:';
export function MemberWelcome({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const claim = useServerFn(claimQuest);
  const load = useServerFn(getArenaStatus);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['arena', userId], queryFn: () => load(), enabled: open, staleTime: 0 });
  const status = data?.status;
  const amount = status ? welcomeReward(status.rewards) : undefined;
  const claimed = status?.claimed.includes('welcome');
  useEffect(() => {
    try { if (localStorage.getItem(KEY + userId)) return; } catch { return; }
    const t = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(t);
  }, [userId]);
  const close = () => { try { localStorage.setItem(KEY + userId, '1'); } catch { /* optional storage */ } setOpen(false); };
  const onClaim = async () => {
    if (claimed) { close(); void navigate({ to: '/profile', hash: 'bixp' }); return; }
    setBusy(true); setMsg('');
    try {
      await claim({ data: { key: 'welcome' } });
      await qc.invalidateQueries({ queryKey: ['arena'] });
      await qc.invalidateQueries({ queryKey: ['my-bixlink', userId] });
      close(); void navigate({ to: '/profile', hash: 'bixp' });
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not claim. Please try again.'); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={v => { if (!v) close(); }}><DialogContent className="welcome-3d">
    <div className="welcome-emblem"><ArenaArtwork mission="welcome"/></div>
    <span className="welcome-kicker"><Sparkles size={12}/> GENESIS REWARD</span>
    <DialogTitle className="welcome-title">Welcome to BIXLINK</DialogTitle>
    <DialogDescription className="welcome-description">Your next chapter starts here.</DialogDescription>
    <div className="welcome-amount numeric">{amount === undefined ? '—' : amount}<small>BIXP</small></div>
    <div className="welcome-benefits">{([{ mission: 'checkin', label: 'Daily quests' }, { mission: 'stake7', label: 'Staking' }, { mission: 'referral', label: 'Community' }] as const).map(v => <div key={v.mission}><ArenaArtwork mission={v.mission}/><span>{v.label}</span></div>)}</div>
    <Button className="welcome-claim" disabled={busy || !status || (!claimed && (!status.enabled || !status.missions.welcome))} onClick={onClaim}>{busy ? 'Checking…' : claimed ? 'VIEW BIXP BALANCE' : amount === undefined ? 'Loading reward…' : `CLAIM ${amount} BIXP`}</Button>
    {msg && <p role="alert" className="text-xs text-destructive">{msg}</p>}
    {status && !claimed && (!status.enabled || !status.missions.welcome) && <p className="text-xs text-muted-foreground">Welcome claims are currently closed.</p>}
    <p className="welcome-risk"><ShieldCheck size={12}/> Promotional points, not on-chain BIX. Conversion only when opened by Admin.</p>
  </DialogContent></Dialog>;
}
