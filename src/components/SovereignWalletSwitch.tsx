import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { updateSetting } from '@/lib/bixlink.functions';
import { usePublicConfig } from '@/lib/useMember';
import { defaultReadiness } from '@/lib/readiness';

/** Owner-only open/close switch for the standalone BIXLINK wallet; writes the existing owner-verified readiness setting. */
export function SovereignWalletSwitch() {
  const { data: cfg } = usePublicConfig();
  const save = useServerFn(updateSetting);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const open = cfg?.readiness.sovereignWalletEnabled !== false;
  const toggle = async () => {
    if (!cfg || busy) return;
    setBusy(true); setNote('');
    try {
      const next = { ...defaultReadiness, ...cfg.readiness, sovereignWalletEnabled: !open };
      await save({ data: { key: 'readiness', value: next as unknown as Record<string, unknown> } });
      await qc.invalidateQueries({ queryKey: ['bix-public-config'] });
      setNote(!open ? 'Wallet dibuka untuk member.' : 'Wallet ditutup (maintenance).');
    } catch (e) { setNote(e instanceof Error ? e.message : 'Gagal menyimpan.'); }
    setBusy(false);
  };
  return <div className="rounded-2xl border border-border bg-card p-3">
    <div className="flex items-center gap-3">
      <span className="profile-action-icon profile-action-icon--admin"><Wallet /></span>
      <div className="min-w-0 flex-1"><b className="block text-sm">BIXLINK Wallet (Open Apps)</b><small className="text-xs text-muted-foreground">{open ? 'BUKA · member bisa membuka wallet' : 'TUTUP · member melihat maintenance'}</small></div>
      <button type="button" role="switch" aria-checked={open} aria-label="Buka / tutup BIXLINK Wallet" disabled={busy || !cfg} onClick={() => void toggle()}
        className={`relative h-7 w-12 shrink-0 rounded-full border border-border transition-colors ${open ? 'bg-chart-2' : 'bg-muted'}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-foreground transition-all ${open ? 'left-6' : 'left-0.5'}`} />
      </button>
    </div>
    {note && <p role="status" className="mt-2 text-xs text-chart-3">{note}</p>}
  </div>;
}
