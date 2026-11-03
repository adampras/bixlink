import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { Json } from '@/integrations/supabase/types';
import { normalizeWdMatching, wdMatchingError, wdSplit, type WdMatchingConfig } from '@/lib/wd-matching';

export function WdMatchingPanel() {
  const [cfg, setCfg] = useState<WdMatchingConfig | null>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { supabase.rpc('bix_wd_matching_config').then(r => setCfg(normalizeWdMatching(r.data))); }, []);
  if (!cfg) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  const err = wdMatchingError(cfg);
  const ex = wdSplit(100, cfg);
  const save = async () => {
    setMsg('');
    const r = await supabase.rpc('bix_wd_matching_save', { p_config: cfg as unknown as Json });
    if (r.error) setMsg(r.error.message); else { setCfg(normalizeWdMatching(r.data)); setMsg('Tersimpan.'); }
  };
  const field = (k: 'feePct' | 'matchPct' | 'minStakeUsd', label: string, step: number) => <label className="text-[11px] text-muted-foreground">{label}
    <input type="number" step={step} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" value={cfg[k]} onChange={e => setCfg({ ...cfg, [k]: Number(e.target.value) })}/></label>;
  return <section className="mt-4 grid gap-4 rounded-xl border border-border p-4">
    <div>
      <h2 className="font-display text-lg font-black">WD MATCHING ROYALTY</h2>
      <p className="text-xs text-muted-foreground">Saat penarikan member disetujui, sebagian fee WD masuk ke sponsor langsungnya.</p>
    </div>
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <span className="text-sm font-bold">Program {cfg.enabled ? 'BUKA' : 'TUTUP'}</span>
      <Switch checked={cfg.enabled} onCheckedChange={v => setCfg({ ...cfg, enabled: v })}/>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {field('feePct', 'Fee WD %', 0.5)}{field('matchPct', 'Ke sponsor %', 0.5)}{field('minStakeUsd', 'Min staking aktif $', 50)}
    </div>
    <div className="rounded-lg border border-border bg-card/50 p-3 text-xs">
      <b>Contoh WD $100:</b> fee ${ex.fee.toFixed(2)} → sponsor ${ex.match.toFixed(2)}, kas platform ${ex.platform.toFixed(2)}; member terima ${ex.net.toFixed(2)}.
      <p className="mt-1 text-muted-foreground">Syarat: sponsor punya staking aktif ≥ ${cfg.minStakeUsd}. Leader bersponsor yang belum lolos target omzet tidak menerima. Akun clone tidak ikut. Saat TUTUP, fee kembali ke $1 + 0,5%.</p>
    </div>
    {err && <p className="text-sm text-destructive">{err}</p>}
    <Button disabled={!!err} onClick={save} className="rounded-full">Simpan</Button>
    {msg && <p className="text-sm text-chart-3">{msg}</p>}
  </section>;
}
