import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, LockKeyhole, Play, Download, ArrowLeftRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { getMiningStatus, startMining, settleMining, getMiningConversion, convertMining, type MiningStatus } from '@/lib/mining.functions';
import { conversionQuote } from '@/lib/mining-conversion';
import { useMember } from '@/lib/useMember';
import engine from '@/assets/bix-mining-engine.mp4.asset.json';
import webEngine from '@/assets/bix-mining-engine.webm.asset.json';
import poster from '@/assets/bix-mining-engine-poster.jpg.asset.json';

const fmt = (n: number) => n.toLocaleString('id-ID', { minimumFractionDigits: 6, maximumFractionDigits: 6 });

/** BIXP accrual is server-settled; video playback never awards anything. */
export function MemberMining({ emailVerified }: { emailVerified: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getMiningStatus);
  const start = useServerFn(startMining);
  const settle = useServerFn(settleMining);
  const conversionStatus = useServerFn(getMiningConversion);
  const convert = useServerFn(convertMining);
  const { user } = useMember();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const { data: s, error } = useQuery({ queryKey: ['bix-mining', user?.id], queryFn: () => fetchStatus(), staleTime: 30_000, refetchInterval: 15_000, enabled: !!user });
  const { data: c, error: conversionError } = useQuery({ queryKey: ['bix-mining-conversion', user?.id], queryFn: () => conversionStatus(), refetchInterval: 15_000, enabled: !!user });
  const running = !!s?.started && !!s?.enabled && emailVerified;

  // Live display of unsettled BIXP since the last server settlement.
  const [now, setNow] = useState(() => Date.now());
  const offset = useRef(0);
  useEffect(() => { if (s?.serverNow) offset.current = new Date(s.serverNow).getTime() - Date.now(); }, [s?.serverNow]);
  useEffect(() => { if (!running) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [running]);
  const pending = running && s?.settledAt ? Math.max(0, (now + offset.current - new Date(s.settledAt).getTime()) / 86_400_000 * Number(s.ratePerDay)) : 0;
  const vbixBalance = s && c ? Math.max(0, Number(s.miningVbix) + Number(s.networkVbix) + pending - Number(c.consumedVbix)) : null;
  const quote = c && vbixBalance !== null ? conversionQuote(vbixBalance, c.vbixPerBix, Number(c.convertedBix), Number(c.poolUsed)) : 0;

  useEffect(() => {
    const el = video.current; if (!el) return;
    if (!running) { el.pause(); return; }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const sync = () => { if (visible && !document.hidden && !reduced.matches) el.play().catch(() => {}); else el.pause(); };
    const obs = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; sync(); });
    obs.observe(el); document.addEventListener('visibilitychange', sync);
    return () => { obs.disconnect(); document.removeEventListener('visibilitychange', sync); el.pause(); };
  }, [running]);

  const act = async (fn: () => Promise<MiningStatus>, ok: string) => {
    setBusy(true); setMsg('');
    try { qc.setQueryData(['bix-mining', user?.id], await fn()); setMsg(ok); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Failed. Please try again.'); }
    finally { setBusy(false); }
  };

  const state = !emailVerified ? 'Email verification required before starting the engine.'
    : !s?.enabled ? 'Mining is currently disabled by owner.'
    : !s.started ? 'Click Start Mining to run the engine.' : 'Engine running — BIXP accrues continuously even when the app is closed.';

  return <section className="member-mining" aria-labelledby="member-mining-title">
    <div className="mining-heading"><h2 id="member-mining-title">BIX MINING</h2><span className={emailVerified ? 'mining-verified' : 'mining-unverified'}>{emailVerified ? <BadgeCheck size={15}/> : <LockKeyhole size={15}/>} {emailVerified ? 'Verified' : 'Verify Email'}</span></div>
    <dl className="mining-balances"><div><dt>BIXP Balance</dt><dd>{vbixBalance === null ? '—' : fmt(vbixBalance)} <small>BIXP</small></dd></div><div><dt>BIX Balance</dt><dd>{c ? fmt(Number(c.bixBalance)) : '—'} <small>BIX</small></dd></div></dl>
    <div className="mining-engine">
      <video ref={video} muted loop playsInline preload="auto" poster={poster.url} aria-label="BIX mining engine"><source src={webEngine.url} type="video/webm"/><source src={engine.url} type="video/mp4"/></video>
    </div>
    <dl className="mining-figures">
      <div><dt>Mining BIXP</dt><dd>{fmt(Number(s?.miningVbix ?? 0) + pending)} <small>BIXP</small></dd></div>
      <div><dt>Network Bonus</dt><dd>{fmt(Number(s?.networkVbix ?? 0))} <small>BIXP</small></dd></div>
      <div><dt>Mining Rate</dt><dd>{Number(s?.ratePerDay ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 4 })} <small>BIXP/day</small></dd></div>
      <div><dt>Staking Bonus</dt><dd>{s?.boosted ? 'Active' : 'Inactive'}</dd></div>
    </dl>
    {!s?.started
      ? <Button variant="outline" className="mining-start" disabled={busy || !emailVerified || !s?.enabled} onClick={() => act(() => start(), 'Mining engine started.')}><Play size={16}/> Start Mining</Button>
      : <Button variant="outline" className="mining-start" disabled={busy || !running} onClick={() => act(() => settle(), 'BIXP saved to mining balance.')}><Download size={16}/> Claim BIXP</Button>}
    <p className="mining-state" role="status">{msg || state}</p>
    <Button variant="outline" className="mining-start" disabled={busy || !emailVerified || !c?.enabled || quote <= 0} onClick={async () => { setBusy(true); setMsg(''); try { const result = await convert(); qc.setQueryData(['bix-mining-conversion', user?.id], result); await Promise.all([qc.invalidateQueries({ queryKey: ['bix-mining'] }), qc.invalidateQueries({ queryKey: ['my-wallet'] })]); setMsg('Conversion credited to internal BIX balance.'); } catch (e) { setMsg(e instanceof Error ? e.message : 'Conversion failed.'); } finally { setBusy(false); } }}><ArrowLeftRight size={16}/>{c?.enabled ? `Convert BIXP → ${fmt(quote)} BIX` : 'Convert BIXP · Closed'}</Button>
    {(error || conversionError) && <p className="mining-state text-destructive">Failed to load mining balance. Please try again.</p>}
    <div className="mining-disclosures"><p>BIXP is an internal mining point · BIX balance is not an on-chain token</p><p>{c?.vbixPerBix ? `${Number(c.vbixPerBix).toLocaleString('id-ID')} BIXP = 1 BIX · ` : 'Conversion rate not set · '}Pool <strong>1.000.000 BIX</strong> Marketing & Community · Max. 100 BIX/account</p><p>Converted: {c ? fmt(Number(c.convertedBix)) : '—'} / 100 BIX</p></div>
  </section>;
}
