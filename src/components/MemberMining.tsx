import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, LockKeyhole, Play, Download } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { getMiningStatus, startMining, settleMining, type MiningStatus } from '@/lib/mining.functions';
import engine from '@/assets/bix-mining-engine.mp4.asset.json';
import webEngine from '@/assets/bix-mining-engine.webm.asset.json';
import poster from '@/assets/bix-mining-engine-poster.jpg.asset.json';

const fmt = (n: number) => n.toLocaleString('id-ID', { minimumFractionDigits: 6, maximumFractionDigits: 6 });

/** vBIX accrual is server-settled; video playback never awards anything. */
export function MemberMining({ emailVerified }: { emailVerified: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getMiningStatus);
  const start = useServerFn(startMining);
  const settle = useServerFn(settleMining);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const { data: s } = useQuery({ queryKey: ['bix-mining'], queryFn: () => fetchStatus(), staleTime: 30_000 });
  const running = !!s?.started && !!s?.enabled && emailVerified;

  // Live display of unsettled vBIX since the last server settlement.
  const [now, setNow] = useState(() => Date.now());
  const offset = useRef(0);
  useEffect(() => { if (s?.serverNow) offset.current = new Date(s.serverNow).getTime() - Date.now(); }, [s?.serverNow]);
  useEffect(() => { if (!running) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [running]);
  const pending = running && s?.settledAt ? Math.max(0, (now + offset.current - new Date(s.settledAt).getTime()) / 86_400_000 * Number(s.ratePerDay)) : 0;

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
    try { qc.setQueryData(['bix-mining'], await fn()); setMsg(ok); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal, coba lagi.'); }
    finally { setBusy(false); }
  };

  const state = !emailVerified ? 'Verifikasi email diperlukan sebelum mesin bisa dijalankan.'
    : !s?.enabled ? 'Mining sedang dinonaktifkan oleh owner.'
    : !s.started ? 'Tekan Mulai mining untuk menyalakan mesin.' : 'Mesin berjalan — vBIX terus bertambah walau aplikasi ditutup.';

  return <section className="member-mining" aria-labelledby="member-mining-title">
    <div className="mining-heading"><h2 id="member-mining-title">BIX MINING</h2><span className={emailVerified ? 'mining-verified' : 'mining-unverified'}>{emailVerified ? <BadgeCheck size={15}/> : <LockKeyhole size={15}/>} {emailVerified ? 'Terverifikasi' : 'Verifikasi email'}</span></div>
    <div className="mining-engine">
      <video ref={video} muted loop playsInline preload="auto" poster={poster.url} aria-label="Mesin mining BIX"><source src={webEngine.url} type="video/webm"/><source src={engine.url} type="video/mp4"/></video>
    </div>
    <dl className="mining-figures">
      <div><dt>vBIX mining</dt><dd>{fmt(Number(s?.miningVbix ?? 0) + pending)} <small>vBIX</small></dd></div>
      <div><dt>Bonus jaringan</dt><dd>{fmt(Number(s?.networkVbix ?? 0))} <small>vBIX</small></dd></div>
      <div><dt>Laju mining</dt><dd>{Number(s?.ratePerDay ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 4 })} <small>vBIX/hari</small></dd></div>
      <div><dt>Bonus staking</dt><dd>{s?.boosted ? 'Aktif' : 'Tidak aktif'}</dd></div>
    </dl>
    {!s?.started
      ? <Button variant="outline" className="mining-start" disabled={busy || !emailVerified || !s?.enabled} onClick={() => act(() => start(), 'Mesin mining menyala.')}><Play size={16}/> Mulai mining</Button>
      : <Button variant="outline" className="mining-start" disabled={busy || !running} onClick={() => act(() => settle(), 'vBIX tersimpan ke saldo mining.')}><Download size={16}/> Simpan vBIX</Button>}
    <p className="mining-state" role="status">{msg || state}</p>
    <div className="mining-disclosures"><p>vBIX adalah poin mining internal · Bukan mining on-chain</p><p>Konversi vBIX ke BIX (pool <strong>1.000.000 BIX</strong>, maks. 100 BIX/akun) dibuka nanti dengan nilai dari owner.</p></div>
  </section>;
}
