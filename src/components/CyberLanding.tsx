import { Link } from '@tanstack/react-router';
import { ArrowUpRight, BadgeCheck, Cpu, Lock, Radar, Send, Sparkles } from 'lucide-react';

export function CyberHud({ bixPrice }: { bixPrice: number }) {
  const cells = [
    ['PROTOCOL', 'ONLINE', true],
    ['BIX REF', `$${bixPrice.toFixed(6)}`, false],
    ['SUPPLY', '21,000,000', false],
    ['MODEL', 'NON-CUSTODIAL', false],
  ] as const;
  return <div className="cyber-hud" aria-label="Protocol telemetry">
    {cells.map(([k, v, live]) => <div key={k} className="cyber-hud-cell"><span>{k}</span><b className="numeric">{live && <i aria-hidden />}{v}</b></div>)}
  </div>;
}

export function CyberCtas() {
  return <div className="cyber-ctas">
    <Link to="/auth" className="cyber-btn cyber-btn--primary">LAUNCH APP <ArrowUpRight size={16} /></Link>
    <Link to="/register" className="cyber-btn">CREATE ACCOUNT</Link>
  </div>;
}

const MODULES = [
  { icon: Lock, tag: 'LIVE MODULE', title: 'Sovereign Vault', text: 'Owner-reviewed reserve with server-verified access controls.', span: 'wide' },
  { icon: Sparkles, tag: 'LEDGER PROJECTION', title: 'Staking Yield', text: 'Display-only projections from active stakes. Not guaranteed.', span: '' },
  { icon: Radar, tag: 'SIMULATION', title: 'Trade Terminal', text: 'Candlestick radar, depth heatmap and AI risk sentinel.', span: '' },
  { icon: BadgeCheck, tag: 'INSTITUTIONAL PASS', title: 'VIP Certificates', text: 'Black titanium e-certificates with unique registration numbers.', span: '' },
  { icon: Send, tag: 'LIVE MODULE', title: 'BIX PAY', text: 'Instant member-to-member transfers on the internal ledger.', span: '' },
  { icon: Cpu, tag: 'ROADMAP 2026–2030', title: 'zk-Rollup · DePIN · RWA', text: 'Vision milestones, labeled by status — not implementation claims.', span: 'wide' },
];

export function CyberBento() {
  return <section className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
    <div className="eyebrow">INSTITUTIONAL CYBER TERMINAL</div>
    <h2 className="section-title">CORE <span>MODULES</span></h2>
    <div className="cyber-bento mt-5">
      {MODULES.map(({ icon: Icon, tag, title, text, span }) => <article key={title} className={`cyber-panel ${span === 'wide' ? 'is-wide' : ''}`}>
        <div className="flex items-center justify-between gap-2"><Icon className="cyber-panel-icon" size={20} /><span className="cyber-tag">{tag}</span></div>
        <h3>{title}</h3><p>{text}</p>
      </article>)}
    </div>
  </section>;
}
