import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Cpu } from 'lucide-react';
import { updateSetting } from '@/lib/bixlink.functions';
import { usePublicConfig } from '@/lib/useMember';
import { defaultReadiness } from '@/lib/readiness';

/** Owner-only switch: landing page in BIXTRADE style (open) or standard (closed); writes the owner-verified readiness setting. */
export function LandingStyleSwitch() {
  const { data: cfg } = usePublicConfig();
  const save = useServerFn(updateSetting);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const on = cfg?.readiness.landingTradeStyle === true;
  const toggle = async () => {
    if (!cfg || busy) return;
    setBusy(true); setNote('');
    try {
      await save({ data: { key: 'readiness', value: { ...defaultReadiness, ...cfg.readiness, landingTradeStyle: !on } as unknown as Record<string, unknown> } });
      await qc.invalidateQueries({ queryKey: ['bix-public-config'] });
      setNote(!on ? 'Landing gaya BIXTRADE aktif.' : 'Landing kembali standar.');
    } catch (e) { setNote(e instanceof Error ? e.message : 'Gagal menyimpan.'); }
    setBusy(false);
  };
  return <div className="rounded-2xl border border-border bg-card p-3">
    <div className="flex items-center gap-3">
      <span className="profile-action-icon profile-action-icon--admin"><Cpu /></span>
      <div className="min-w-0 flex-1"><b className="block text-sm">Landing gaya BIXTRADE</b><small className="text-xs text-muted-foreground">{on ? 'BUKA · beranda tampil gaya BIXTRADE' : 'TUTUP · beranda standar BIXLINK'}</small></div>
      <button type="button" role="switch" aria-checked={on} aria-label="Buka / tutup landing gaya BIXTRADE" disabled={busy || !cfg} onClick={() => void toggle()}
        className={`relative h-7 w-12 shrink-0 rounded-full border border-border transition-colors ${on ? 'bg-chart-2' : 'bg-muted'}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-foreground transition-all ${on ? 'left-6' : 'left-0.5'}`} />
      </button>
    </div>
    {note && <p className="mt-2 text-xs text-chart-3">{note}</p>}
  </div>;
}
