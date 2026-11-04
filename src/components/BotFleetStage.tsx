import { X, Check } from 'lucide-react';
import { BIXTRADE_STRATEGIES, type BixtradeStrategy } from '@/lib/bixtrade';
import { BixtradeBot3D, BOT_PERSONA } from '@/components/BixtradeBot3D';

const TRAITS: Record<BixtradeStrategy, string[]> = {
  core: ['Low-drawdown shield', 'BTC · ETH prioritas', 'Eksekusi selektif'],
  active: ['Momentum seimbang', 'Multi-pair BTC · ETH · SOL · BNB', 'Frekuensi menengah'],
  triangular: ['Arbitrase segitiga kilat', 'Lintas 6 bursa', 'Latensi mikro'],
};

/** Full-screen standalone stage for choosing the BIXTRADE bot; selection only, no funds move. */
export function BotFleetStage({ value, onPick, onClose, inline }: { value: BixtradeStrategy; onPick: (s: BixtradeStrategy) => void; onClose?: () => void; inline?: boolean }) {
  return <div className={inline ? 'fleet-stage fleet-inline' : 'fleet-stage'} {...(inline ? { 'aria-label': 'Neural Bot Arsenal' } : { role: 'dialog', 'aria-modal': true, 'aria-label': 'Neural Bot Arsenal' })}>
    <header className="fleet-head">
      <div><p>QUANTUM MATRIX · AUTONOMOUS FLEET</p><h2>NEURAL BOT <span>ARSENAL</span></h2></div>
      {onClose && <button type="button" onClick={onClose} aria-label="Close"><X size={20}/></button>}
    </header>
    <div className="fleet-list">
      {BIXTRADE_STRATEGIES.map(s => { const pz = BOT_PERSONA[s.key]; const on = value === s.key; return <article key={s.key} data-variant={pz.variant} className={`fleet-card ${on ? 'is-on' : ''}`}>
        <div className="fleet-art"><BixtradeBot3D mini mood="scan" strategy={s.key}/></div>
        <div className="fleet-body">
          <b>{pz.name}</b><span>{s.name}</span>
          <ul>{(TRAITS[s.key] ?? [s.pairs]).map(t => <li key={t}>{t}</li>)}</ul>
          <em>Risiko {s.risk}</em>
          <button type="button" onClick={() => { navigator.vibrate?.([14, 30, 14]); onPick(s.key); }}>{on ? <><Check size={15}/> Active bot</> : 'Select this bot'}</button>
        </div>
      </article>; })}
    </div>
    <p className="fleet-note">Selecting a bot only determines the strategy for your next request; results are not guaranteed and balances do not change.</p>
  </div>;
}
