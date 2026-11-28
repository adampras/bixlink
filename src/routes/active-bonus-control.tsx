import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Crown, LockKeyhole, RefreshCw } from 'lucide-react';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useMember } from '@/lib/useMember';
import { getAdminLeaders, setLeaderAccess } from '@/lib/bixlink.functions';
import { activeBonusAccess } from '@/lib/leader-bonus-control';
import { getActiveBonusAuto, setActiveBonusAuto } from '@/lib/active-bonus-auto.functions';

export const Route = createFileRoute('/active-bonus-control')({
  head: () => ({ meta: [
    { title: 'Kontrol Bonus Aktif — BIXLINK Admin 1' },
    { name: 'description', content: 'Kontrol khusus Admin 1 untuk bonus aktif leader dan loan dengan perlindungan modal dan profit bantuan.' },
    { property: 'og:title', content: 'Kontrol Bonus Aktif — BIXLINK Admin 1' },
    { property: 'og:description', content: 'Pengelolaan pelepasan bonus aktif bersumber staking riil.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Page,
});

function Page() {
  const { user, ready } = useMember();
  const owner = useQuery({ queryKey: ['is-owner1', user?.id], enabled: Boolean(user), queryFn: async () => {
    const { data, error } = await supabase.rpc('bix_is_owner1' as never);
    if (error) throw error;
    return data === true;
  } });
  return <BixShell><MemberGate ready={ready} signedIn={Boolean(user)} title="Kontrol Bonus Aktif">
    <main className="mx-auto max-w-3xl space-y-5 px-5 py-6">
      <Button asChild size="sm" variant="ghost"><Link to="/profile"><ArrowLeft size={16}/> Profil</Link></Button>
      <header><div className="eyebrow">ADMIN 1</div><h1 className="font-display text-xl font-bold text-primary">Kontrol Bonus Aktif</h1></header>
      {owner.isPending ? <p role="status">Memeriksa akses…</p> : owner.error ? <p role="alert" className="text-destructive">Akses belum dapat diperiksa.</p> : owner.data ? <Controls/> : <p>Halaman ini khusus Admin 1.</p>}
    </main>
  </MemberGate></BixShell>;
}

function Controls() {
  const load = useServerFn(getAdminLeaders);
  const save = useServerFn(setLeaderAccess);
  const loadAuto = useServerFn(getActiveBonusAuto);
  const saveAuto = useServerFn(setActiveBonusAuto);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['owner-leaders'], queryFn: () => load() });
  const auto = useQuery({ queryKey: ['owner-active-bonus-auto'], queryFn: () => loadAuto() });
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const rows = (q.data?.leaders ?? []).filter(l => `${l.username} ${l.full_name} ${l.user_id}`.toLowerCase().includes(search.replace(/^@/, '').trim().toLowerCase()));
  const toggleAuto = async (enabled: boolean) => {
    if (!window.confirm(enabled ? 'Buka otomatis bonus aktif staking USDT riil untuk semua leader dan loan yang disetujui? Akun Closed, modal/profit bantuan dan bonus campuran tetap terkunci. Pembayaran WD tetap ditinjau.' : 'Matikan pembukaan bonus riil otomatis? Saklar per akun tetap berlaku.')) return;
    setBusy('auto'); setNotice(''); setFailure('');
    try {
      const saved = await saveAuto({ data: { enabled } });
      const readback = await auto.refetch();
      if (readback.error || readback.data?.enabled !== enabled) throw new Error('Saklar belum dapat dikonfirmasi. Muat ulang sebelum mencoba kembali.');
      await Promise.all([
        q.refetch(),
        qc.invalidateQueries({ queryKey: ['my-balance-ledger'] }),
        qc.invalidateQueries({ queryKey: ['my-bixlink'] }),
      ]);
      setNotice(enabled ? `Bonus riil otomatis dibuka; ${saved.released ?? 0} bonus tertunda dilepas. Pembayaran WD tetap ditinjau.` : 'Bonus otomatis dimatikan; saklar per akun tetap berlaku.');
    } catch (e) { setFailure(e instanceof Error ? e.message : 'Gagal menyimpan saklar otomatis.'); }
    finally { setBusy(null); }
  };
  const toggle = async (id: string, name: string, enabled: boolean) => {
    if (!window.confirm(enabled ? `Buka bonus aktif ${name} dari staking riil saja? Modal, profit bantuan dan bonus dari staking campuran vUSDT tetap mengikuti kunci yang berlaku.` : `Kembalikan bonus ${name} ke aturan target?`)) return;
    setBusy(id); setNotice(''); setFailure('');
    try {
      const access = activeBonusAccess(enabled);
      await save({ data: { userId: id, access } });
      const result = await q.refetch();
      const row = result.data?.leaders.find(l => l.user_id === id);
      if (result.error || !row || row.owner_access !== access) throw new Error('Perubahan belum dapat dikonfirmasi. Muat ulang sebelum mencoba kembali.');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['my-balance-ledger'] }),
        qc.invalidateQueries({ queryKey: ['my-bixlink'] }),
      ]);
      setNotice(`${name}: ${enabled ? 'bonus aktif staking riil dibuka' : 'aturan target dipulihkan'}.`);
    } catch (e) { setFailure(e instanceof Error ? e.message : 'Gagal menyimpan saklar.'); }
    finally { setBusy(null); }
  };
  return <>
    <section className="border-y border-border py-4" aria-labelledby="auto-bonus-title">
      <div className="flex items-center justify-between gap-4"><h2 id="auto-bonus-title" className="font-bold">Approve WD Bonus Aktif</h2><Switch aria-label="Approve WD Bonus Aktif semua leader" checked={auto.data?.enabled ?? false} disabled={busy !== null || auto.isPending || Boolean(auto.error)} onCheckedChange={enabled => void toggleAuto(enabled)}/></div>
      <p role="status" className="mt-2 text-sm text-primary">{auto.isPending ? 'Memuat saklar…' : auto.data?.enabled ? 'ON · Bonus staking riil otomatis terbuka' : 'OFF · Mengikuti saklar per akun'}</p>
      <p className="mt-2 text-sm text-muted-foreground">Semua leader/loan disetujui · hanya bonus staking USDT riil. Modal/profit bantuan, bonus campuran dan akun Closed tetap mengikuti kunci lama. Pembayaran WD tetap ditinjau.</p>
      {auto.error && <p role="alert" className="mt-2 text-sm text-destructive">Saklar otomatis belum dapat dimuat.</p>}
    </section>
    <div className="flex items-start gap-3 border-y border-border py-4 text-sm text-muted-foreground"><LockKeyhole className="shrink-0 text-primary" size={20}/><p>Bonus aktif bersumber staking riil dapat dibuka. Modal dan profit bantuan tetap mengikuti target. Staking campuran vUSDT tidak diubah menjadi staking riil.</p></div>
    <div className="flex gap-2"><Input aria-label="Cari leader atau loan" placeholder="Cari username / nama…" value={search} onChange={e => setSearch(e.target.value)}/><Button variant="outline" size="icon" title="Muat ulang" disabled={q.isFetching || busy !== null} onClick={() => void q.refetch()}><RefreshCw size={16}/></Button></div>
    {notice && <p role="status" className="text-sm text-chart-2">{notice}</p>}
    {(failure || q.error) && <p role="alert" className="text-sm text-destructive">{failure || (q.error instanceof Error ? q.error.message : 'Daftar gagal dimuat.')}</p>}
    {q.isPending && <p role="status">Memuat akun…</p>}
    {!q.isPending && !q.error && rows.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada akun yang cocok.</p>}
    <div className="space-y-3">{rows.map(l => {
      const access = l.owner_access ?? 'normal';
      const special = access === 'open' || access === 'closed';
      const name = l.username ? `@${l.username}` : l.full_name || l.user_id;
      return <article key={l.user_id} className="rounded-lg border border-border bg-card p-4">
        <div className="min-w-0"><h2 className="flex items-center gap-2 break-all font-bold"><Crown size={16} className="shrink-0 text-primary"/>{name}</h2><p className="mt-1 text-xs text-muted-foreground">{l.support_kind === 'loan' || l.loan_package_id ? 'Loan' : 'Leader bersponsor'} · {l.status}</p></div>
        <div className="mt-4 flex items-center gap-3"><Switch aria-label={`Buka bonus aktif ${name}`} checked={access === 'active_bonus'} disabled={busy !== null || l.status !== 'approved' || special} onCheckedChange={enabled => void toggle(l.user_id, name, enabled)}/><span className="text-sm">Buka bonus aktif</span></div>
        <p className="mt-3 text-sm text-muted-foreground">{special ? `Akses khusus: ${access}` : l.status === 'approved' && auto.data?.enabled ? 'Bonus aktif riil: otomatis terbuka' : access === 'active_bonus' ? 'Bonus aktif riil: terbuka' : 'Bonus aktif: aturan target'}</p>
        {special && <Button asChild variant="link" size="sm"><Link to="/leader-control">Kelola akses khusus</Link></Button>}
      </article>;
    })}</div>
  </>;
}