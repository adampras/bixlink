import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@tanstack/react-router';
import { ChevronDown, Menu, X } from 'lucide-react';

type Item = { label: string; anchor?: string; to?: string };
const GROUPS: Array<{ title: string; items: Item[] }> = [
  { title: 'Layanan Ekosistem', items: [{ label: 'Sovereign Staking', anchor: 'lx-bento' }, { label: 'Ekosistem Premium', anchor: 'lx-ecosystem' }, { label: 'Kategori Pengembangan', anchor: 'lx-spaces' }] },
  { title: 'BIXCOIN & Tokenomics', items: [{ label: 'Official BIXCOIN', anchor: 'lx-coin' }, { label: 'Tokenomics 21 Juta BIX', anchor: 'lx-tokenomics' }, { label: 'Roadmap', anchor: 'lx-roadmap' }] },
  { title: 'Transparansi & Keamanan', items: [{ label: 'Trust Center', anchor: 'lx-trust' }, { label: 'Tim & Kemitraan', anchor: 'lx-team' }, { label: 'Berita Kripto', anchor: 'lx-news' }, { label: 'FAQ', anchor: 'lx-faq' }] },
];

export function LandingHeroMenu() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState(0);
  useEffect(() => { if (!open) return; const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', k); return () => { document.body.style.overflow = o; window.removeEventListener('keydown', k); }; }, [open]);
  const go = (id: string) => { setOpen(false); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); };
  return <>
    <button type="button" className="lhm-trigger" aria-label="Buka menu informasi" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20}/></button>
    {open && typeof document !== 'undefined' && createPortal(<div className="lhm-backdrop" onClick={() => setOpen(false)}>
      <aside className="lhm-panel" role="dialog" aria-modal="true" aria-label="Menu BIXLINK" onClick={e => e.stopPropagation()}>
        <header><b>BIX<span>LINK</span></b><button type="button" aria-label="Tutup menu" onClick={() => setOpen(false)}><X size={20}/></button></header>
        <nav>{GROUPS.map((g, i) => <div key={g.title} className={`lhm-group ${section === i ? 'is-open' : ''}`}>
          <button type="button" aria-expanded={section === i} onClick={() => setSection(section === i ? -1 : i)}>{g.title}<ChevronDown size={16}/></button>
          {section === i && <ul>{g.items.map(it => <li key={it.label}><button type="button" onClick={() => it.anchor && go(it.anchor)}>{it.label}<span>→</span></button></li>)}</ul>}
        </div>)}</nav>
        <div className="lhm-cta"><Link to="/register" onClick={() => setOpen(false)}>Daftar sekarang</Link><Link to="/auth" onClick={() => setOpen(false)}>Launch App</Link></div>
        <p>Imbal hasil yang ditampilkan adalah proyeksi, bukan jaminan.</p>
      </aside>
    </div>, document.body)}
  </>;
}
