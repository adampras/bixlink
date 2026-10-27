import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Crown, Landmark, UserPlus, LayoutGrid, Wallet } from 'lucide-react';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { getAdminLeaders, getLeaderCandidates, reviewLeader, updateDockHub } from '@/lib/bixlink.functions';
import { getLoanPackages, saveLoanPackages } from '@/lib/loan-packages.functions';
import { loanQuota, type LoanConfig } from '@/lib/loan-packages';
import { HUB_ITEMS, hubVisible } from '@/lib/dock-hub';

export const Route = createFileRoute('/leader-control')({
  head: () => ({ meta: [
    { title: 'Leader & Loan Control — BIXLINK' },
    { name: 'description', content: 'Owner 1 control for sponsored leaders (3× personal) and loan accounts (5× team).' },
    { property: 'og:title', content: 'Leader & Loan Control — BIXLINK' },
    { property: 'og:description', content: 'Owner 1 leader and loan account control.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Page,
});

const usd = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

function Page() {
  const { user, ready } = useMember();
  const owner1 = useQuery({ queryKey: ['is-owner1', user?.id], enabled: !!user, queryFn: async () => { const { data } = await supabase.rpc('bix_is_owner1' as never); return data === true; } });
  return <BixShell><MemberGate ready={ready} signedIn={!!user} title="Leader & Loan control">
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <Link to="/profile" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft size={14}/> Profil</Link>
      <h1 className="font-display text-xl font-black text-primary">Kontrol Leader & Loan</h1>
      {owner1.isLoading ? <p className="text-sm text-muted-foreground">Memeriksa akses…</p>
        : !owner1.data ? <p className="rounded-xl border border-border p-4 text-sm">Halaman ini khusus Owner 1.</p>
        : <Control/>}
    </div>
  </MemberGate></BixShell>;
}

type Tab = 'leader' | 'loan' | 'none' | 'packages' | 'hub' | 'withdraw';

function Control() {
  const [tab, setTab] = useState<Tab>('leader');
  const tabs: { id: Tab; label: string; Icon: typeof Crown }[] = [
    { id: 'leader', label: 'Leader 3×', Icon: Crown }, { id: 'loan', label: 'Loan 5×', Icon: Landmark },
    { id: 'none', label: 'Belum ambil', Icon: UserPlus }, { id: 'packages', label: 'Paket loan', Icon: Landmark }, { id: 'hub', label: 'Menu HUB', Icon: LayoutGrid }, { id: 'withdraw', label: 'Tarik USDT virtual', Icon: Wallet },
  ];
  return <>
    <div className="flex gap-2 overflow-x-auto pb-1">{tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${tab === t.id ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}><t.Icon size={13}/>{t.label}</button>)}</div>
    {(tab === 'leader' || tab === 'loan') && <Roster kind={tab}/>}
    {tab === 'none' && <Candidates/>}
    {tab === 'packages' && <Packages/>}
    {tab === 'hub' && <HubToggles/>}
    {tab === 'withdraw' && <VusdtWithdraw/>}
  </>;
}

function Roster({ kind }: { kind: 'leader' | 'loan' }) {
  const list = useServerFn(getAdminLeaders); const review = useServerFn(reviewLeader); const qc = useQueryClient();
  const q = useQuery({ queryKey: ['owner-leaders'], queryFn: () => list() });
  const [edit, setEdit] = useState<Record<string, string>>({}); const [msg, setMsg] = useState('');
  const rows = (q.data?.leaders ?? []).filter(l => kind === 'loan' ? (l.support_kind === 'loan' || !!l.loan_package_id) : !(l.support_kind === 'loan' || !!l.loan_package_id));
  const act = async (id: string, status: 'approved' | 'rejected', cur: number, req: boolean) => {
    setMsg('');
    try { await review({ data: { userId: id, status, virtualUsd: Number(edit[id] ?? cur), requireTurnover: req } }); setMsg('Tersimpan.'); qc.invalidateQueries({ queryKey: ['owner-leaders'] }); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal menyimpan'); }
  };
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (q.error) return <p className="text-sm text-destructive">{(q.error as Error).message}</p>;
  return <div className="space-y-2">
    <p className="text-xs text-muted-foreground">{kind === 'leader' ? 'Target 3× dari omset staking riil pribadi.' : 'Target 5× dari omset staking riil tim L1.'} Kunci 360 hari. Hangus otomatis bila dalam 30 hari omset riil < 10% nilai paket. Akun virtual, clone dan loan lain tidak dihitung.</p>
    {msg && <p className="text-xs text-primary">{msg}</p>}
    {rows.length === 0 && <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">Belum ada akun.</p>}
    {rows.map(l => {
      const s = l.stats; const base = Number(s?.base ?? l.virtual_usd); const mult = kind === 'leader' ? 3 : 5;
      const done = kind === 'leader' ? Number(s?.own_stake ?? 0) : Number(s?.turnover ?? 0); const target = base * mult;
      const pct = target > 0 ? Math.min(100, (done / target) * 100) : 0;
      return <div key={l.user_id} className="rounded-2xl border border-border bg-card/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0"><div className="truncate text-sm font-bold">{l.username || l.full_name || l.user_id.slice(0, 8)}</div><div className="text-[11px] text-muted-foreground">Paket {usd(base)}{l.loan_package_id ? ` · ${l.loan_package_id}` : ''}</div></div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${s?.qualified ? 'bg-chart-2/15 text-chart-2' : l.status === 'approved' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>{s?.qualified ? 'QUALIFIED' : l.status.toUpperCase()}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${pct}%` }}/></div>
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{usd(done)} / {usd(target)} ({mult}×)</span><span>{pct.toFixed(0)}%</span></div>
        {l.status === 'approved' && l.require_turnover && <Expiry30 userId={l.user_id}/>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input className="h-8 w-28 text-xs" inputMode="decimal" value={edit[l.user_id] ?? String(l.virtual_usd)} onChange={e => setEdit(v => ({ ...v, [l.user_id]: e.target.value }))} aria-label="Nilai paket USD"/>
          <Button size="sm" onClick={() => act(l.user_id, 'approved', l.virtual_usd, l.require_turnover)}>Simpan / Setujui</Button>
          <Button size="sm" variant="outline" onClick={() => act(l.user_id, 'rejected', l.virtual_usd, l.require_turnover)}>Tolak</Button>
        </div>
      </div>;
    })}
  </div>;
}

function Candidates() {
  const load = useServerFn(getLeaderCandidates); const [f, setF] = useState('');
  const q = useQuery({ queryKey: ['owner-leader-candidates'], queryFn: () => load() });
  const rows = (q.data?.members ?? []).filter(m => !f || `${m.username} ${m.full_name}`.toLowerCase().includes(f.toLowerCase()));
  return <div className="space-y-2">
    <Input placeholder="Cari username…" value={f} onChange={e => setF(e.target.value)}/>
    <p className="text-xs text-muted-foreground">{rows.length} member belum mengambil paket leader maupun loan. Tambahkan lewat Admin panel → Leader.</p>
    {q.isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
    <div className="divide-y divide-border rounded-2xl border border-border">{rows.slice(0, 100).map(m => <div key={m.user_id} className="flex justify-between px-3 py-2 text-sm"><span className="truncate">{m.username || m.user_id.slice(0, 8)}</span><span className="truncate text-xs text-muted-foreground">{m.full_name}</span></div>)}</div>
  </div>;
}

function Packages() {
  const load = useServerFn(getLoanPackages); const save = useServerFn(saveLoanPackages); const qc = useQueryClient();
  const q = useQuery({ queryKey: ['loan-packages'], queryFn: () => load() });
  const [cfg, setCfg] = useState<LoanConfig | null>(null); const [msg, setMsg] = useState('');
  useEffect(() => { if (q.data) setCfg(q.data); }, [q.data]);
  if (!cfg) return <p className="text-sm text-muted-foreground">{q.error ? (q.error as Error).message : 'Memuat…'}</p>;
  const set = (i: number, p: Partial<LoanConfig['packages'][number]>) => setCfg({ packages: cfg.packages.map((r, j) => j === i ? { ...r, ...p } : r) });
  return <div className="space-y-2">
    {cfg.packages.map((p, i) => <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/70 p-3">
      <div className="w-24 text-sm font-black">{p.id}<div className="text-[10px] font-normal text-muted-foreground">Kuota sponsor {loanQuota(p.id)} · 360 hari · 5×</div></div>
      <Input className="h-8 w-32" inputMode="decimal" value={p.usd} onChange={e => set(i, { usd: Number(e.target.value) || 0 })} aria-label={`Nilai ${p.id}`}/>
      <label className="flex items-center gap-2 text-xs"><Switch checked={p.enabled} onCheckedChange={v => set(i, { enabled: v })}/>{p.enabled ? 'Buka' : 'Tutup'}</label>
    </div>)}
    {msg && <p className="text-xs text-primary">{msg}</p>}
    <Button onClick={async () => { setMsg(''); try { const r = await save({ data: cfg }); setCfg(r); qc.invalidateQueries({ queryKey: ['loan-packages'] }); setMsg('Paket loan tersimpan.'); } catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); } }}>Simpan paket loan</Button>
  </div>;
}

function HubToggles() {
  const { data } = usePublicConfig(); const save = useServerFn(updateDockHub); const qc = useQueryClient();
  const [cfg, setCfg] = useState<Record<string, boolean>>({}); const [msg, setMsg] = useState('');
  useEffect(() => { setCfg(data?.readiness.dockHub ?? {}); }, [data?.readiness.dockHub]);
  return <div className="space-y-2">
    <p className="text-xs text-muted-foreground">Pilih menu yang tampil di tombol HUB (navigasi bawah ponsel).</p>
    <div className="grid gap-2 sm:grid-cols-2">{HUB_ITEMS.map(it => <label key={it.id} className="flex items-center justify-between rounded-xl border border-border bg-card/70 px-3 py-2 text-sm"><span>{it.label} <small className="text-muted-foreground">{it.note}</small></span><Switch checked={hubVisible(cfg, it.id)} onCheckedChange={v => setCfg(c => ({ ...c, [it.id]: v }))}/></label>)}</div>
    {msg && <p className="text-xs text-primary">{msg}</p>}
    <Button onClick={async () => { setMsg(''); try { await save({ data: { dockHub: cfg } }); qc.invalidateQueries(); setMsg('Menu HUB tersimpan.'); } catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); } }}>Simpan menu HUB</Button>
  </div>;
}

type Recipient = { user_id: string; username: string | null; code: string | null; received: number; transfer_balance: number; leader_virtual: number; wallet_balance: number; kind: string | null };

function VusdtWithdraw() {
  const qc = useQueryClient(); const [f, setF] = useState(''); const [amt, setAmt] = useState<Record<string, string>>({}); const [msg, setMsg] = useState('');
  const q = useQuery({ queryKey: ['vusdt-recipients'], queryFn: async () => { const { data, error } = await supabase.rpc('bix_vusdt_recipients' as never); if (error) throw error; return (data ?? []) as unknown as Recipient[]; } });
  const rows = (q.data ?? []).filter(r => !f || `${r.username} ${r.code}`.toLowerCase().includes(f.toLowerCase()));
  const pull = async (r: Recipient, max: number, full: boolean) => {
    const v = full ? max : Number(amt[r.user_id]);
    if (!v || v <= 0) return setMsg('Isi nominal penarikan.');
    if (!confirm(`Tarik ${usd(v)} USDT virtual dari ${r.username || r.code}?`)) return;
    setMsg('');
    const { error } = await supabase.rpc('bix_vusdt_clawback' as never, { p_user: r.user_id, p_amount: Math.round(v * 100) / 100, p_note: 'Owner 1' } as never);
    if (error) return setMsg(error.message);
    setMsg(`Berhasil menarik ${usd(v)}.`); setAmt(a => ({ ...a, [r.user_id]: '' })); qc.invalidateQueries({ queryKey: ['vusdt-recipients'] }); qc.invalidateQueries({ queryKey: ['owner-leaders'] });
  };
  return <div className="space-y-2">
    <p className="text-xs text-muted-foreground">Tarik saldo USDT virtual dari member/leader yang menerima transfer Owner 1. Nominal bebas, maksimal sisa saldo virtual yang belum dipakai staking.</p>
    <Input placeholder="Cari username / kode…" value={f} onChange={e => setF(e.target.value)}/>
    {msg && <p className="text-xs text-primary">{msg}</p>}
    {q.isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
    {q.error && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}
    {rows.length === 0 && !q.isLoading && <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">Belum ada penerima.</p>}
    {rows.map(r => { const max = Math.max(0, Math.min(Number(r.transfer_balance) + Number(r.leader_virtual), Number(r.wallet_balance)));
      return <div key={r.user_id} className="rounded-2xl border border-border bg-card/70 p-3">
        <div className="flex justify-between gap-2"><div className="min-w-0"><div className="truncate text-sm font-bold">{r.username || r.code || r.user_id.slice(0, 8)}</div><div className="text-[11px] text-muted-foreground">{r.code}{r.kind ? ` · ${r.kind === 'loan' ? 'Loan' : 'Leader'}` : ''} · diterima {usd(r.received)}</div></div>
          <div className="text-right"><div className="text-sm font-black text-primary">{usd(max)}</div><div className="text-[10px] text-muted-foreground">bisa ditarik</div></div></div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Input className="h-8 w-28 text-xs" inputMode="decimal" placeholder="Nominal" value={amt[r.user_id] ?? ''} onChange={e => setAmt(a => ({ ...a, [r.user_id]: e.target.value }))}/>
          <Button size="sm" disabled={max <= 0} onClick={() => pull(r, max, false)}>Tarik</Button>
          <Button size="sm" variant="outline" disabled={max <= 0} onClick={() => pull(r, max, true)}>Tarik semua</Button>
        </div>
      </div>; })}
  </div>;
}

function Expiry30({ userId }: { userId: string }) {
  const q = useQuery({ queryKey: ['leader-30d', userId], queryFn: async () => { const { data } = await supabase.rpc('bix_leader_30d_progress' as never, { p_user: userId } as never); return data as unknown as { deadline: string; required: number; achieved: number; expired_at: string | null } | null; } });
  const d = q.data; if (!d) return null;
  const met = Number(d.achieved) >= Number(d.required);
  const days = Math.ceil((new Date(d.deadline).getTime() - Date.now()) / 86400000);
  const label = d.expired_at ? 'HANGUS' : met ? 'Syarat 10% tercapai' : days > 0 ? `${days} hari lagi` : 'Menunggu proses hangus';
  return <div className={`mt-2 rounded-lg border px-2 py-1 text-[11px] ${d.expired_at || (!met && days <= 0) ? 'border-destructive/50 text-destructive' : met ? 'border-chart-2/40 text-chart-2' : 'border-border text-muted-foreground'}`}>
    Batas 30 hari: omset {usd(d.achieved)} / min {usd(d.required)} (10%) · <b>{label}</b>
  </div>;
}
