import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Lock, X, ScrollText, CreditCard, Zap, Download } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useMember } from '@/lib/useMember';
import { number } from '@/lib/bixlink';

/** Staking accumulation that unlocks the Black Titanium VIP Pass. */
export const VIP_PASS_THRESHOLD = 500;

export function vipPassStatus(activeUsd: number) {
  const unlocked = activeUsd >= VIP_PASS_THRESHOLD;
  return { unlocked, remaining: unlocked ? 0 : VIP_PASS_THRESHOLD - activeUsd, percent: Math.min(100, (activeUsd / VIP_PASS_THRESHOLD) * 100) };
}

export function passTierName(usd: number) {
  return usd >= 5000 ? 'Sovereign Founder Dynasty Card' : usd >= 1000 ? 'Gold Reserve VIP Key' : 'Obsidian Member Pass';
}

/** Reads the signed-in member's own active staking total (RLS: own rows only). */
export function useActiveStakeUsd() {
  const { user } = useMember();
  return useQuery({
    queryKey: ['vip-pass-active', user?.id], enabled: !!user, staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase.from('stakes').select('amount_usd,status').eq('user_id', user!.id).eq('status', 'active');
      return (data ?? []).reduce((n, s: { amount_usd: number | null }) => n + Number(s.amount_usd ?? 0), 0);
    },
  });
}

function serialFrom(seed: string) {
  let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return String(Math.abs(h) % 100000).padStart(5, '0');
}

type Props = { principal: number; days: number; apy?: number; label: string; kind?: 'stake' | 'presale'; onClose: () => void };

export function VaultFacilityDialog({ principal, days, apy, label, kind = 'stake', onClose }: Props) {
  const { user } = useMember();
  const active = useActiveStakeUsd();
  const total = Number(active.data ?? 0);
  const status = vipPassStatus(Math.max(total, kind === 'presale' ? principal : 0));
  const [face, setFace] = useState<'deed' | 'card'>('deed');
  const serial = serialFrom(`${user?.id ?? 'guest'}-${label}-${principal}-${days}`);
  const bixId = (user?.id ?? '').slice(0, 8).toUpperCase() || 'MEMBER';
  const maturity = new Date(Date.now() + days * 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const deedTitle = kind === 'presale' ? 'Genesis Founder Allocation Deed' : 'Genesis Vault Bond Deed';

  return createPortal(<div className="vf-overlay" role="dialog" aria-modal="true" aria-label="Vault Bond and VIP Pass" onClick={onClose}>
    <div className="vf-stage" onClick={e => e.stopPropagation()}>
      <Button variant="outline" size="icon" className="vf-close" aria-label="Close" onClick={onClose}><X/></Button>
      <div className="vf-tabs" role="tablist">
        <button role="tab" aria-selected={face === 'deed'} className={face === 'deed' ? 'is-on' : ''} onClick={() => setFace('deed')}><ScrollText size={14}/> Bond Deed</button>
        <button role="tab" aria-selected={face === 'card'} className={face === 'card' ? 'is-on' : ''} onClick={() => setFace('card')}><CreditCard size={14}/> VIP Pass {!status.unlocked && <Lock size={12}/>}</button>
      </div>

      {face === 'deed' ? <article className="vf-deed" id="vf-deed-print">
        <p className="vf-seal">BIXLINK GENESIS ECOSYSTEM · LEDGER RECORD</p>
        <h3>{deedTitle}</h3>
        <p className="vf-reg numeric">BX-BOND-{new Date().getFullYear()}-{serial}</p>
        <dl>
          <div><dt>Holder · BIX-ID</dt><dd className="numeric">{bixId}</dd></div>
          <div><dt>Package</dt><dd>{label}</dd></div>
          <div><dt>{kind === 'presale' ? 'Allocation paid' : 'Staked principal'}</dt><dd className="numeric">${number(principal, { maximumFractionDigits: 2 })}</dd></div>
          {apy !== undefined && <div><dt>Contracted APY</dt><dd className="numeric">{number(apy, { maximumFractionDigits: 2 })}%</dd></div>}
          <div><dt>Lock period</dt><dd className="numeric">{days} days</dd></div>
          <div><dt>Maturity horizon</dt><dd className="numeric">{maturity}</dd></div>
        </dl>
        <div className="vf-stamp" aria-hidden><span>BIXLINK</span><small>LEDGER SEAL</small></div>
        <p className="vf-note">Internal ledger record of your position. Returns are projections, not guaranteed. Not a security, bank instrument or on-chain token.</p>
        <Button variant="outline" className="vf-dl" onClick={() => window.print()}><Download size={14}/> Save / print deed</Button>
      </article> : <article className="vf-card-wrap">
        <div className={`vf-card ${status.unlocked ? '' : 'is-locked'}`}>
          <div className="vf-chip" aria-hidden/>
          <p className="vf-card-brand">BIXLINK</p>
          <p className="vf-card-tier">{passTierName(Math.max(total, principal))}</p>
          <p className="vf-card-no numeric">5429 •••• •••• {serial.slice(1)}</p>
          <div className="vf-card-foot"><span>{bixId}</span><span>BLACK TITANIUM</span></div>
          {!status.unlocked && <div className="vf-lock"><Lock size={28}/><b>VIP Pass locked</b></div>}
        </div>
        {status.unlocked ? <p className="vf-ok">Unlocked — your active staking is {'≥'} ${VIP_PASS_THRESHOLD}. Long-press the card to save it.</p> : <div className="vf-progress">
          <p>Reach ${VIP_PASS_THRESHOLD} in active staking to unlock the Black Titanium VIP Pass.</p>
          <div className="apy-meter mt-2"><i style={{ width: `${status.percent}%` }}/></div>
          <p className="numeric mt-1">${number(total, { maximumFractionDigits: 0 })} / ${VIP_PASS_THRESHOLD} · ${number(status.remaining, { maximumFractionDigits: 0 })} to go</p>
          <Button asChild className="mt-3 w-full"><Link to="/stake" onClick={onClose}><Zap size={14}/> Upgrade staking</Link></Button>
        </div>}
      </article>}
    </div>
  </div>, document.body);
}
