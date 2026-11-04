import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@tanstack/react-router';
import { ChevronDown, Menu, X } from 'lucide-react';

type Item = { label: string; anchor?: string; to?: string };
const GROUPS: Array<{ title: string; items: Item[] }> = [
  { title: 'Ecosystem Services', items: [{ label: 'Sovereign Staking', anchor: 'lx-bento' }, { label: 'Premium Ecosystem', anchor: 'lx-ecosystem' }, { label: 'Development Categories', anchor: 'lx-spaces' }] },
  { title: 'BIXCOIN & Tokenomics', items: [{ label: 'Official BIXCOIN', anchor: 'lx-coin' }, { label: '21 Million BIX Tokenomics', anchor: 'lx-tokenomics' }, { label: 'Roadmap', anchor: 'lx-roadmap' }] },
  { title: 'Transparency & Security', items: [{ label: 'Trust Center', anchor: 'lx-trust' }, { label: 'Team & Partnerships', anchor: 'lx-team' }, { label: 'Crypto News', anchor: 'lx-news' }, { label: 'FAQ', anchor: 'lx-faq' }] },
];

export function LandingHeroMenu() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState(0);
  useEffect(() => { if (!open) return; const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', k); return () => { document.body.style.overflow = o; window.removeEventListener('keydown', k); }; }, [open]);
  const go = (id: string) => { setOpen(false); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); };
  return <>
    <button type="button" className="lhm-trigger" aria-label="Open info menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20}/></button>
    {open && typeof document !== 'undefined' && createPortal(<div className="lhm-backdrop" onClick={() => setOpen(false)}>
      <aside className="lhm-panel" role="dialog" aria-modal="true" aria-label="Menu BIXLINK" onClick={e => e.stopPropagation()}>
        <header><b>BIX<span>LINK</span></b><button type="button" aria-label="Close menu" onClick={() => setOpen(false)}><X size={20}/></button></header>
        <nav>{GROUPS.map((g, i) => <div key={g.title} className={`lhm-group ${section === i ? 'is-open' : ''}`}>
          <button type="button" aria-expanded={section === i} onClick={() => setSection(section === i ? -1 : i)}>{g.title}<ChevronDown size={16}/></button>
          {section === i && <ul>{g.items.map(it => <li key={it.label}><button type="button" onClick={() => it.anchor && go(it.anchor)}>{it.label}<span>→</span></button></li>)}</ul>}
        </div>)}</nav>
        <div className="lhm-cta"><Link to="/register" onClick={() => setOpen(false)}>Register now</Link><Link to="/auth" onClick={() => setOpen(false)}>Launch App</Link></div>
        <p>Yields shown are projections, not guarantees.</p>
      </aside>
    </div>, document.body)}
  </>;
}
