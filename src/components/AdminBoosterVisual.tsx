import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useServerFn } from '@tanstack/react-start';
import { updateSetting } from '@/lib/bixlink.functions';
import { Button } from '@/components/ui/button';
import { usePublicConfig } from '@/lib/useMember';
import { boosterMaximum } from '@/lib/booster-apy';
import { BOOSTER_VIDEOS, resolveBoosterVisual, type BoosterVisual } from '@/lib/booster-visual';
import { ReactorVideo } from '@/components/ReactorVideo';
import { useQueryClient } from '@tanstack/react-query';
import { STAKE_LAYOUTS, STAKE_LAYOUT_LABEL, type StakeLayout } from '@/components/StakePackageLayouts';

export type { BoosterVisual } from '@/lib/booster-visual';

export function AdminBoosterVisual({ initialVisual, enabled, onMessage, onSaved }: { initialVisual: BoosterVisual; enabled: boolean; onMessage: (message: string) => void; onSaved: () => Promise<void> }) {
  const [visual, setVisual] = useState(() => resolveBoosterVisual(initialVisual));
  const qc = useQueryClient();
  const saveSetting = useServerFn(updateSetting);
  const [saving, setSaving] = useState(false);
  const { data: cfg } = usePublicConfig();
  const [maximum, setMaximum] = useState<number | null>(null);
  const [active, setActive] = useState(enabled);
  const [wd, setWd] = useState({ bix: false, usdt: false });
  useEffect(() => { supabase.rpc('bix_booster_withdraw_config').then(({ data }) => { if (data) setWd(data as { bix: boolean; usdt: boolean }); }); }, []);
  const saveWd = async (next: { bix: boolean; usdt: boolean }) => { try { await saveSetting({ data: { key: 'booster_withdraw', value: next } }); setWd(next); onMessage(`Booster withdraw — BIX ${next.bix ? 'OPEN' : 'CLOSED'} · USDT ${next.usdt ? 'OPEN' : 'CLOSED'}.`); } catch { onMessage('Could not save withdraw setting.'); } };
  const cap = maximum ?? boosterMaximum(cfg?.booster.maxApy);

  const [layout, setLayout] = useState<StakeLayout | null>(null);
  const curLayout: StakeLayout = layout ?? cfg?.boosterVisual.stakeLayout ?? 'auric';
  const saveLayout = async (next: StakeLayout) => { setLayout(next); try { await saveSetting({ data: { key: 'booster_visual', value: { visual, stakeLayout: next } } }); await onSaved(); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage(`Tampilan paket Staking: ${STAKE_LAYOUT_LABEL[next]}.`); } catch { onMessage('Tampilan staking gagal disimpan.'); } };

  return <div className="mt-8 max-w-4xl space-y-5">
    <section className="border-b border-border pb-6"><h2 className="font-display text-xl font-bold">Tampilan paket STAKING</h2><p className="mt-1 text-xs text-muted-foreground">Pilih model tampilan halaman Stake. Langsung berlaku untuk semua member.</p><div className="mt-4 flex flex-wrap gap-2">{STAKE_LAYOUTS.map(l => <Button key={l} variant={curLayout === l ? 'default' : 'outline'} aria-pressed={curLayout === l} onClick={() => saveLayout(l)}>{STAKE_LAYOUT_LABEL[l]}</Button>)}</div></section>
    <section className="border-b border-border pb-6"><h2 className="font-display text-xl font-bold">Video BOOSTER APY</h2><div className="mt-4 flex flex-wrap gap-2">{BOOSTER_VIDEOS.map(v => <Button key={v} variant={visual === v ? 'default' : 'outline'} aria-pressed={visual === v} onClick={() => setVisual(v)}>{{ video: 'Video pengganti lama', reactor: 'Video reactor', orbital: 'Video pengganti 1', crystal: 'Video pengganti 2', rocket: 'Video roket presale' }[v]}</Button>)}</div><div className="max-w-lg"><ReactorVideo maximum={cap} visual={visual}/></div><Button disabled={saving} onClick={async () => { setSaving(true); try { await saveSetting({ data: { key: 'booster_visual', value: { visual } } }); await onSaved(); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage('Video BOOSTER dan landing tersimpan.'); } catch { onMessage('Video gagal disimpan.'); } finally { setSaving(false); } }}>Simpan video BOOSTER</Button></section>
    <div className="rounded-[20px] border border-chart-2 bg-card p-6">
      <h2 className="font-display text-xl font-black">BIXCOIN yield engine</h2>
      <p className="my-5 text-sm leading-6 text-muted-foreground">When active, every eligible BIXCOIN staking position receives a live second-by-second profit projection. Package volume and lock duration set a monthly rate from 8% to the owner-selected maximum, allocated 70% BIX and 30% USDT. Existing stakes and USDT packages do not change.</p>
      <label className="flex items-center gap-3"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)}/> APY BOOSTER ACTIVE</label>
      <label className="mt-4 block text-sm">Maximum monthly BIX rate (% per month)<input aria-label="Maximum annual BIX APY" type="number" min={8} max={45} step={0.01} value={cap} onChange={event => setMaximum(Number(event.target.value))} className="mt-2 block w-36 rounded-lg border border-border bg-background p-3"/></label>
      <Button className="mt-4" disabled={saving || !Number.isFinite(cap) || cap < 8 || cap > 45} onClick={async () => { setSaving(true); try { await saveSetting({ data: { key: 'booster', value: { enabled: active, rate: cfg?.booster.rate ?? 25, maxApy: cap } } }); await onSaved(); onMessage('BIX Booster maximum saved. Existing contracts and USDT packages are unchanged.'); } catch { onMessage('Could not save BIX Booster maximum.'); } finally { setSaving(false); } }}>Save Booster APY</Button>

    </div>
    <div className="rounded-[20px] border border-chart-3 bg-card p-6">
      <h2 className="font-display text-xl font-black">Booster profit withdraw</h2>
      <p className="mt-2 text-sm text-muted-foreground">Members withdraw profit only (minimum 10% of stake value), paid from the owner BIX reserve. Principal returns after the contract ends.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Button variant={wd.bix ? 'default' : 'outline'} onClick={() => saveWd({ ...wd, bix: !wd.bix })}>Withdraw BIX: {wd.bix ? 'OPEN' : 'CLOSED'}</Button>
        <Button variant={wd.usdt ? 'default' : 'outline'} onClick={() => saveWd({ ...wd, usdt: !wd.usdt })}>Withdraw USDT: {wd.usdt ? 'OPEN' : 'CLOSED'}</Button>
      </div>
    </div>
  </div>;
}
