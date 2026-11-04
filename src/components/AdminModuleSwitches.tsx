import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateSetting } from '@/lib/bixlink.functions';
import { defaultReadiness, moduleOpen, MODULE_KEYS, type ModuleKey, type Readiness } from '@/lib/readiness';

type Simple = { key: 'swap' | 'bix_pay' | 'usdt_transfer'; label: string; detail: string };
const SIMPLE: Simple[] = [
  { key: 'swap', label: 'Swap BIX ⇄ USDT', detail: 'Swap balance in the Wallet menu.' },
  { key: 'bix_pay', label: 'BIX PAY', detail: 'Send BIX between members.' },
  { key: 'usdt_transfer', label: 'Transfer USDT', detail: 'Send USDT between members.' },
];
const MODULES: Record<ModuleKey, [string, string]> = {
  p2p: ['P2P Desk', 'Member-to-member BIX buy/sell page.'],
  arena: ['Fox Arena', 'Games, missions, and BIXP claims.'],
  nft: ['Marketplace & NFT', 'Merchandise store and NFT collections.'],
  register: ['Pendaftaran umum', 'Self-registration page. OFF: only Leaders/Admins can register members.'],
  trade: ['Trade Terminal', 'Halaman TRADE BIX/USDT (pasar internal).'],
};

/** One screen of ON/OFF switches; each switch writes its existing owner-verified setting. */
export function AdminModuleSwitches({ readiness, simple, onMessage, onSaved }: { readiness?: Readiness | undefined; simple: Record<Simple['key'], boolean>; onMessage: (s: string) => void; onSaved: () => Promise<void> }) {
  const save = useServerFn(updateSetting);
  const qc = useQueryClient();
  const [ready, setReady] = useState<Readiness>({ ...defaultReadiness, ...readiness });
  const [flags, setFlags] = useState(simple);
  const [busy, setBusy] = useState(false);
  async function run(task: () => Promise<unknown>, note: string) {
    setBusy(true);
    try { await task(); await onSaved(); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage(note); }
    catch (e) { onMessage(e instanceof Error ? e.message : 'Failed to save.'); }
    finally { setBusy(false); }
  }
  const row = (key: string, label: string, detail: string, on: boolean, toggle: () => void) => <div key={key} className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-card px-4 py-3">
    <div className="min-w-0"><b className="text-sm">{label}</b><p className="text-xs text-muted-foreground">{detail}</p></div>
    <Button size="sm" variant={on ? 'default' : 'outline'} aria-pressed={on} disabled={busy} className="w-16 shrink-0 rounded-full" onClick={toggle}>{on ? 'ON' : 'OFF'}</Button>
  </div>;
  return <section className="mt-8 grid gap-3">
    <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Power size={18} className="text-primary"/>Saklar Sentral</h2>
    <p className="text-xs text-muted-foreground">One toggle to enable/disable features for members. Admins can still view all pages.</p>
    <div className="grid gap-2 md:grid-cols-2">
      {MODULE_KEYS.map(k => { const on = moduleOpen(ready, k); const [label, detail] = MODULES[k]; return row(k, label, detail, on, () => {
        const next = { ...ready, modules: { ...ready.modules, [k]: !on } };
        run(async () => { await save({ data: { key: 'readiness', value: next as unknown as Record<string, unknown> } }); setReady(next); }, `${label} ${on ? 'ditutup' : 'dibuka'}.`);
      }); })}
      {([['consortiumVaultEnabled','Consortium Vault $2M','Private /consortium-vault page with PIN.'],['web3WalletEnabled','Web3 Connect Wallet','TokenPocket/MetaMask connect button in STAKE, WALLET, PRESALE.']] as const).map(([k,label,detail]) => { const on = Boolean(ready[k]); return row(k, label, detail, on, () => {
        const next = { ...ready, [k]: !on };
        run(async () => { await save({ data: { key: 'readiness', value: next as unknown as Record<string, unknown> } }); setReady(next); }, `${label} ${on ? 'ditutup' : 'dibuka'}.`);
      }); })}
      {SIMPLE.map(s => row(s.key, s.label, s.detail, flags[s.key], () => {
        const on = !flags[s.key];
        run(async () => { await save({ data: { key: s.key, value: { enabled: on } } }); setFlags(f => ({ ...f, [s.key]: on })); }, `${s.label} ${on ? 'dibuka' : 'ditutup'}.`);
      }))}
    </div>
  </section>;
}
