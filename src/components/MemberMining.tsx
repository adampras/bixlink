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

/** vBIX accrual is server-settled; video playback never awards anything. */
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

  // Live display of unsettled vBIX since the last server settlement.
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
    catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal, coba lagi.'); }
    finally { setBusy(false); }
  };

  const state = !emailVerified ? 'Verifikasi email diperlukan sebelum mesin bisa dijalankan.'
    : !s?.enabled ? 'Mining sedang dinonaktifkan oleh owner.'
    : !s.started ? 'Tekan Mulai mining untuk menyalakan mesin.' : 'Mesin berjalan — vBIX terus bertambah walau aplikasi ditutup.';

  return <section className="member-mining" aria-labelledby="member-mining-title">
    <div className="mining-heading"><h2 id="member-mining-title">BIX MINING</h2><span className={emailVerified ? 'mining-verified' : 'mining-unverified'}>{emailVerified ? <BadgeCheck size={15}/> : <LockKeyhole size={15}/>} {emailVerified ? 'Terverifikasi' : 'Verifikasi email'}</span></div>
    <dl className="mining-balances"><div><dt>Saldo vBIX</dt><dd>{vbixBalance === null ? '—' : fmt(vbixBalance)} <small>vBIX</small></dd></div><div><dt>Saldo BIX</dt><dd>{c ? fmt(Number(c.bixBalance)) : '—'} <small>BIX</small></dd></div></dl>
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
    <Button variant="outline" className="mining-start" disabled={busy || !emailVerified || !c?.enabled || quote <= 0} onClick={async () => { setBusy(true); setMsg(''); try { const result = await convert(); qc.setQueryData(['bix-mining-conversion', user?.id], result); await Promise.all([qc.invalidateQueries({ queryKey: ['bix-mining'] }), qc.invalidateQueries({ queryKey: ['my-wallet'] })]); setMsg('Konversi tersimpan ke saldo BIX internal.'); } catch (e) { setMsg(e instanceof Error ? e.message : 'Konversi gagal.'); } finally { setBusy(false); } }}><ArrowLeftRight size={16}/>{c?.enabled ? `Konversi vBIX → ${fmt(quote)} BIX` : 'Konversi vBIX · Ditutup'}</Button>
    {(error || conversionError) && <p className="mining-state text-destructive">Saldo mining tidak dapat dimuat. Coba kembali.</p>}
    <div className="mining-disclosures"><p>vBIX adalah poin mining internal · Saldo BIX bukan token on-chain</p><p>{c?.vbixPerBix ? `${Number(c.vbixPerBix).toLocaleString('id-ID')} vBIX = 1 BIX · ` : 'Nilai konversi belum ditentukan · '}Pool <strong>1.000.000 BIX</strong> Marketing & Community · Maks. 100 BIX/akun</p><p>Sudah dikonversi: {c ? fmt(Number(c.convertedBix)) : '—'} / 100 BIX</p></div>
  </section>;
}
