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
      setNote(!open ? 'Wallet opened for members.' : 'Wallet ditutup (maintenance).');
    } catch (e) { setNote(e instanceof Error ? e.message : 'Failed to save.'); }
    setBusy(false);
  };
  const matcha = cfg?.readiness.walletTheme === 'matcha';
  const theme = cfg?.readiness.walletTheme ?? 'gold';
  const toggleTheme = async (nextTheme: 'gold' | 'matcha' | 'midnight' = matcha ? 'gold' : 'matcha') => {
    if (!cfg || busy) return;
    setBusy(true); setNote('');
    try {
      const next = { ...defaultReadiness, ...cfg.readiness, walletTheme: nextTheme };
      await save({ data: { key: 'readiness', value: next as unknown as Record<string, unknown> } });
      await qc.invalidateQueries({ queryKey: ['bix-public-config'] });
      setNote(`Tema wallet: ${nextTheme === 'midnight' ? 'Midnight Obsidian' : nextTheme === 'matcha' ? 'Black Matcha' : 'Obsidian Gold'}.`);
    } catch (e) { setNote(e instanceof Error ? e.message : 'Failed to save.'); }
    setBusy(false);
  };
  return <div className="rounded-2xl border border-border bg-card p-3">
    <div className="flex items-center gap-3">
      <span className="profile-action-icon profile-action-icon--admin"><Wallet /></span>
      <div className="min-w-0 flex-1"><b className="block text-sm">BIXLINK Wallet (Open Apps)</b><small className="text-xs text-muted-foreground">{open ? 'OPEN · members can open wallet' : 'CLOSED · members see maintenance'}</small></div>
      <button type="button" role="switch" aria-checked={open} aria-label="Open / close BIXLINK Wallet" disabled={busy || !cfg} onClick={() => void toggle()}
        className={`relative h-7 w-12 shrink-0 rounded-full border border-border transition-colors ${open ? 'bg-chart-2' : 'bg-muted'}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-foreground transition-all ${open ? 'left-6' : 'left-0.5'}`} />
      </button>
    </div>
    <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
      <div className="min-w-0 flex-1"><b className="block text-sm">Tema Black Matcha</b><small className="text-xs text-muted-foreground">{matcha ? 'ACTIVE · black, white & matcha green' : 'OFF · Obsidian Gold theme'}</small></div>
      <button type="button" role="switch" aria-checked={matcha} aria-label="Tema Black Matcha wallet" disabled={busy || !cfg} onClick={() => void toggleTheme(matcha ? 'gold' : 'matcha')}
        className={`relative h-7 w-12 shrink-0 rounded-full border border-border transition-colors ${matcha ? 'bg-chart-2' : 'bg-muted'}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-foreground transition-all ${matcha ? 'left-6' : 'left-0.5'}`} />
      </button>
    </div>
    <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
      <div className="min-w-0 flex-1"><b className="block text-sm">Tema Midnight Obsidian</b><small className="text-xs text-muted-foreground">{theme === 'midnight' ? 'ACTIVE · night obsidian & champagne gold' : 'OFF'}</small></div>
      <button type="button" role="switch" aria-checked={theme === 'midnight'} aria-label="Tema Midnight Obsidian wallet" disabled={busy || !cfg} onClick={() => void toggleTheme(theme === 'midnight' ? 'gold' : 'midnight')}
        className={`relative h-7 w-12 shrink-0 rounded-full border border-border transition-colors ${theme === 'midnight' ? 'bg-chart-2' : 'bg-muted'}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-foreground transition-all ${theme === 'midnight' ? 'left-6' : 'left-0.5'}`} />
      </button>
    </div>
    {note && <p role="status" className="mt-2 text-xs text-chart-3">{note}</p>}
  </div>;
}
