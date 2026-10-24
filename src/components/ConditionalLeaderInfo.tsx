import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { usePublicConfig } from '@/lib/useMember';
import { Crown, Sparkles, X, Copy, Users, Video, Megaphone, TrendingUp, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { checkLoanDevice, claimConditionalLeader, getConditionalLeaderAccess, getMyLeader } from '@/lib/bixlink.functions';
import { deviceFingerprint, deviceLabel } from '@/lib/deviceFingerprint';

const PACKAGES = [
  { id: 'EXPLORER', usd: 100 }, { id: 'PIONEER', usd: 500 }, { id: 'BUILDER', usd: 1000 },
];
const DAYS = 360;
type Result = { package: string; value_usd: number; target_usd: number };

// Visible to Owner 1 and Owner 1's network only (server-gated). One self-claim per account.
export function ConditionalLeaderInfo() {
  const fetchAccess = useServerFn(getConditionalLeaderAccess);
  const fetchLeader = useServerFn(getMyLeader);
  const claim = useServerFn(claimConditionalLeader);
  const checkDevice = useServerFn(checkLoanDevice);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['conditional-leader-access'], queryFn: () => fetchAccess() });
  const leader = useQuery({ queryKey: ['my-leader'], queryFn: () => fetchLeader(), enabled: !!data?.allowed });
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<{ id: string; usd: number }>({ id: 'BUILDER', usd: 1000 });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<Result | null>(null);
  const [guide, setGuide] = useState(false);
  const [invited, setInvited] = useState(false);
  const { data: cfg } = usePublicConfig();
  useEffect(() => {
    const check = () => setInvited(new URLSearchParams(window.location.search).get('loan') === 'open');
    check(); window.addEventListener('bix-loan-open', check); return () => window.removeEventListener('bix-loan-open', check);
  }, []);
  useEffect(() => { if (invited) document.getElementById('loan-account')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [invited, data?.allowed]);
  const claimed = !!leader.data?.status;
  const [dev, setDev] = useState<{ bound: boolean; match: boolean; taken?: boolean; label?: string } | null>(null);
  useEffect(() => {
    if (!data?.allowed || leader.isLoading) return;
    let live = true;
    // Existing leaders without a binding are locked to the phone they open it on first.
    deviceFingerprint().then(fp => checkDevice({ data: { fp, label: deviceLabel(), bind: claimed } })).then(r => { if (live) setDev(r); }).catch(() => {});
    return () => { live = false; };
  }, [data?.allowed, claimed, leader.isLoading, checkDevice]);
  const locked = !!dev && dev.bound && !dev.match;
  const programOpen = cfg?.readiness?.loanEnabled !== false;
  // Auto-shown for leaders who hold a loan account; otherwise only when opened via FOX AI (?loan=open) while the program is open.
  if (!data?.allowed || (!claimed && !(invited && programOpen))) return null;
  const rows = [
    ['Account value', 'Up to a $1,000 package (existing conditional leaders keep their set value)'],
    ['Turnover target', '5× the joined package value'],
    ['After 5× reached', 'Special company rewards and challenges'],
    ['BIXCOIN distribution', '5–10% when your members/investors stake with the 70:30 split'],
    ['BIX allocation', 'Eligible when team turnover exceeds $100,000'],
  ];
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const d = await checkDevice({ data: { fp: await deviceFingerprint(), label: deviceLabel(), bind: true } });
      setDev(d);
      if (d.taken) throw new Error('This phone is already linked to another loan account (1 phone = 1 account).');
      if (!d.match) throw new Error('This loan account is locked to another phone.');
      const r = await claim({ data: { packageId: pick.id, days: DAYS } });
      setOpen(false); setDone(r);
      await Promise.all([leader.refetch(), qc.invalidateQueries({ queryKey: ['my-bixlink'] }), qc.invalidateQueries({ queryKey: ['my-wallet'] })]);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not activate.'); }
    setBusy(false);
  };
  return <section id="loan-account" className="mt-6 rounded-2xl border border-chart-3/50 bg-card p-5">
    <div className="eyebrow flex items-center gap-2 text-chart-3"><Crown size={14}/> CONDITIONAL LEADER ACCOUNT · GLOBAL</div>
    <h2 className="mt-1 font-display text-lg font-black">Conditional loan account for leaders worldwide</h2>
    <dl className="mt-3 space-y-2 text-xs">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-2 border-b border-border/60 pb-2"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>)}</dl>
    {dev && <div className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-xs ${locked ? 'border-destructive/60 bg-destructive/10' : 'border-chart-3/40 bg-chart-3/5'}`}><ShieldCheck size={16} className={locked ? 'text-destructive' : 'text-chart-3'}/>
      {locked ? <span><b className="text-destructive">Access denied:</b> this loan account is locked to its registered phone{dev.label ? ` (${dev.label})` : ''}. Changed phones? Contact Owner 1 to reset the device lock.</span>
        : dev.taken ? <span><b className="text-destructive">This phone is already linked</b> to another loan account. One phone = one account.</span>
        : dev.bound ? <span><b className="text-chart-3">Device secured</b> · 1 phone = 1 account{dev.label ? ` · ${dev.label}` : ''}</span>
        : <span>This phone will be locked to your account when you claim (1 phone = 1 account).</span>}
    </div>}
    {locked ? null : claimed
      ? <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-chart-3/40 bg-chart-3/10 p-3 text-xs"><span><b className="text-chart-3">Active leader account</b> · ${Number(leader.data?.virtual_usd ?? 0).toLocaleString()} · target ${Number(leader.data?.target ?? 0).toLocaleString()}</span><Button size="sm" variant="outline" className="rounded-full" onClick={() => setGuide(true)}>Growth guide</Button></div>
      : <Button disabled={!!dev?.taken} className="mt-4 w-full rounded-full bg-chart-3 font-black text-background" onClick={() => { setAgree(false); setErr(''); setOpen(true); }}><Crown/> CLAIM & ACTIVATE LOAN PACKAGE</Button>}
    <p className="mt-3 text-[10px] text-muted-foreground">Conditional account is an internal locked credit, not withdrawable funds. Rewards and allocations are reviewed and approved by the owner. Terms apply.</p>

    {open && <div className="modal-backdrop loan-solid-backdrop" onClick={() => setOpen(false)}><div role="dialog" aria-modal="true" aria-label="Pilih paket pinjaman" className="modal-panel loan-solid-panel" onClick={e => e.stopPropagation()}>
      <div className="loan-lux-line"/>
      <div className="flex items-start justify-between gap-2"><div><p className="eyebrow flex items-center gap-1 text-[10px] text-chart-3"><Crown size={11}/> AKUN PINJAMAN LEADER</p><h3 className="mt-0.5 font-display text-base font-black text-foreground">Pilih paket leader Anda</h3></div><Button variant="ghost" size="icon" className="size-8" aria-label="Tutup" onClick={() => setOpen(false)}><X size={16}/></Button></div>
      <div role="radiogroup" className="mt-3 space-y-1.5">{PACKAGES.map(p => { const on = pick.id === p.id; return <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setPick(p)} className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition ${on ? 'border-chart-3 bg-chart-3/10 shadow-[0_0_16px_color-mix(in_oklab,var(--color-chart-3)_35%,transparent)]' : 'border-border/70 bg-background/60'}`}>
        <span className="min-w-0"><b className="flex items-center gap-1.5 text-[11px] tracking-[0.2em] text-foreground">{p.id}{p.usd === 1000 && <span className="rounded-full bg-chart-3 px-1.5 py-px text-[8px] tracking-normal text-background">REKOMENDASI</span>}</b><span className="numeric block text-[11px] text-foreground/75">Target omset: <b>${(p.usd * 5).toLocaleString()}</b> (5×)</span></span>
        <span className="flex items-center gap-2"><span className="numeric text-lg font-black text-chart-3">${p.usd.toLocaleString()}</span><span className={`grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-black ${on ? 'border-chart-3 bg-chart-3 text-background' : 'border-border'}`}>{on ? '✓' : ''}</span></span>
      </button>; })}</div>
      <ul className="mt-3 space-y-1 rounded-lg border border-border/70 bg-background/60 p-2.5 text-[11px] text-foreground/85"><li>• Staking aktif otomatis {DAYS} hari dari kredit pinjaman.</li><li>• Modal terkunci sampai omset 5× (${(pick.usd * 5).toLocaleString()}).</li><li>• Satu klaim per akun; Owner dapat meninjau atau mencabut.</li></ul>
      <label className="mt-2 flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 p-2.5 text-xs text-foreground"><input type="checkbox" className="size-4 accent-[var(--color-chart-3)]" checked={agree} onChange={e => setAgree(e.target.checked)}/> Saya menyetujui syarat akun leader bersyarat.</label>
      {err && <p role="alert" className="mt-2 text-[11px] text-destructive">{err}</p>}
      <Button disabled={!agree || busy} className="mt-3 h-10 w-full rounded-full bg-chart-3 text-xs font-black tracking-wider text-background" onClick={submit}>{busy ? 'Mengaktifkan…' : `AKTIFKAN ${pick.id} · $${pick.usd.toLocaleString()}`}</Button>
    </div></div>}

    {done && <div className="modal-backdrop loan-solid-backdrop" onClick={() => setDone(null)}><div role="dialog" aria-modal="true" aria-label="Akun leader aktif" className="modal-panel loan-solid-panel text-center" onClick={e => e.stopPropagation()}>
      <div className="loan-lux-line"/>
      <div className="mx-auto grid size-14 place-items-center rounded-full border border-chart-3 bg-chart-3/10 text-chart-3 shadow-[0_0_28px_color-mix(in_oklab,var(--color-chart-3)_55%,transparent)]"><Crown size={26}/></div>
      <p className="eyebrow mt-3 text-[10px] text-chart-3"><Sparkles size={10} className="inline"/> LEADER GLOBAL RESMI BIXLINK</p>
      <h3 className="mt-1 font-display text-lg font-black text-foreground">Selamat, Leader!</h3>
      <p className="mt-2 text-[11px] leading-relaxed text-foreground/75">Terima kasih atas dedikasi Anda. Perusahaan mempercayakan modal kerja bersyarat ini sebagai penghargaan atas komitmen Anda membangun BIXLINK.</p>
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px] text-foreground/70"><div className="rounded-lg border border-chart-3/30 bg-background/60 p-2">Paket<b className="block truncate text-xs text-foreground">{done.package}</b></div><div className="rounded-lg border border-chart-3/30 bg-background/60 p-2">Nilai<b className="numeric block text-xs text-chart-3">${Number(done.value_usd).toLocaleString()}</b></div><div className="rounded-lg border border-chart-3/30 bg-background/60 p-2">Target 5×<b className="numeric block text-xs text-foreground">${Number(done.target_usd).toLocaleString()}</b></div></div>
      <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" className="h-9 rounded-full text-xs" asChild><Link to="/stake">Lihat staking</Link></Button><Button className="h-9 rounded-full bg-chart-3 text-xs font-bold text-background" onClick={() => { setDone(null); setGuide(true); }}>Panduan leader</Button></div>
    </div></div>}

    {guide && <div className="modal-backdrop loan-solid-backdrop" onClick={() => setGuide(false)}><div role="dialog" aria-modal="true" aria-label="Panduan leader" className="modal-panel loan-solid-panel" onClick={e => e.stopPropagation()}>
      <div className="loan-lux-line"/>
      <div className="flex items-center justify-between"><h3 className="font-display text-base font-black text-foreground">Panduan pertumbuhan leader</h3><Button variant="ghost" size="icon" className="size-8" aria-label="Tutup" onClick={() => setGuide(false)}><X size={16}/></Button></div>
      <ol className="mt-3 space-y-2 text-[11px] text-foreground/75">
        <li className="flex gap-2"><Copy className="shrink-0 text-chart-3" size={15}/><span><b className="block text-foreground">1. Bagikan link referral</b>Undang partner dengan link resmi BIXLINK dari Profil.</span></li>
        <li className="flex gap-2"><Megaphone className="shrink-0 text-chart-3" size={15}/><span><b className="block text-foreground">2. Presentasi dengan materi resmi</b>Gunakan poster dan video di halaman Marketing.</span></li>
        <li className="flex gap-2"><Video className="shrink-0 text-chart-3" size={15}/><span><b className="block text-foreground">3. Edukasi di BIXZOOM</b>Adakan sesi grup rutin di ruang Zoom resmi.</span></li>
        <li className="flex gap-2"><Users className="shrink-0 text-chart-3" size={15}/><span><b className="block text-foreground">4. Bangun omset tim</b>Setiap staking tim dihitung ke target 5× Anda.</span></li>
      </ol>
      <div className="mt-3 rounded-lg border border-chart-3/40 bg-chart-3/10 p-2.5 text-[11px]"><b className="flex items-center gap-1 text-chart-3"><TrendingUp size={13}/> Potensi keuntungan</b><ul className="mt-1.5 space-y-0.5 text-foreground/75"><li>• Proyeksi hasil staking harian paket leader</li><li>• Bonus jaringan dari staking tim</li><li>• Distribusi BIXCOIN 5–10% pada staking 70:30</li><li>• Hadiah khusus setelah omset 5×</li><li>• Alokasi BIX saat omset tim di atas $100.000</li></ul><p className="mt-1.5 text-[9px] text-muted-foreground">Proyeksi tidak dijamin. Hadiah ditinjau Owner.</p></div>
      <div className="mt-3 grid grid-cols-2 gap-2"><Button variant="outline" className="h-9 rounded-full text-xs" asChild><Link to="/marketing">Marketing</Link></Button><Button className="h-9 rounded-full bg-chart-3 text-xs font-bold text-background" asChild><Link to="/network">Jaringan saya</Link></Button></div>
    </div></div>}
  </section>;
}
