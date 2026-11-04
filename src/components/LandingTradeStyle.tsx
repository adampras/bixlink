import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowRight, ChevronDown, Cpu, Menu, Phone, Repeat, ShieldCheck, Wallet, X, Layers } from 'lucide-react';

const SERVICES = [
  { to: '/stake', icon: Layers, name: 'Staking', desc: 'Staking packages with choice of duration and recorded history.' },
  { to: '/bixtrade', icon: Cpu, name: 'BIXTRADE', desc: 'AI bot scanning price differences across reference exchanges.' },
  { to: '/trade', icon: Repeat, name: 'P2P Market', desc: 'Buy and sell BIX between members with internal escrow.' },
  { to: '/call', icon: Phone, name: 'BIX CALL', desc: 'Chat, voice, and video calls for the community.' },
  { to: '/pay', icon: Wallet, name: 'BIX PAY', desc: 'Instant BIX transfers between members on internal ledger.' },
] as const;

/** Owner-switchable corporate landing (iak.id-inspired): announcement bar, burger drawer, centered hero. Presentation only. */
export function LandingTradeStyle({ bixPrice }: { bixPrice?: number | undefined }) {
  const [open, setOpen] = useState(false);
  const [svc, setSvc] = useState(true);
  const [notice, setNotice] = useState(true);
  return <section className="lci">
    <header className="lci-bar">
      <b className="font-display">BIX<span>LINK</span></b>
      <button type="button" className="lci-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? <X size={22}/> : <Menu size={22}/>}</button>
    </header>
    {open && <div className="lci-drawer-wrap" onClick={() => setOpen(false)}>
      <nav className="lci-drawer" onClick={e => e.stopPropagation()} aria-label="Menu BIXLINK">
        <button type="button" className="lci-row" aria-expanded={svc} onClick={() => setSvc(v => !v)}>Services <ChevronDown size={18} className={svc ? 'rotate-180' : ''}/></button>
        {svc && <div className="lci-sub">{SERVICES.map(s => <Link key={s.to} to={s.to} onClick={() => setOpen(false)}>{s.name}</Link>)}</div>}
        <Link className="lci-row" to="/risk" onClick={() => setOpen(false)}>Help & Risks</Link>
        <Link className="lci-row" to="/whitepaper" onClick={() => setOpen(false)}>Whitepaper</Link>
        <Link className="lci-row" to="/about" onClick={() => setOpen(false)}>About Us</Link>
        <div className="lci-auth"><Link to="/auth" className="lci-ghost">Login</Link><Link to="/register" className="lci-go">Register</Link></div>
      </nav>
    </div>}
    {notice && <div className="lci-notice"><AlertTriangle size={22}/><div><b>Beware of scams impersonating BIXLINK</b><Link to="/risk">Read announcement <ArrowRight size={14}/></Link></div><button type="button" aria-label="Close announcement" onClick={() => setNotice(false)}><X size={18}/></button></div>}
    <div className="lci-hero">
      <h1 className="font-display">Integrated solution for <span>digital ecosystem</span> You</h1>
      <i className="lci-line" aria-hidden/>
      <p>From staking, AI bots, P2P market to community communication — all connected in one platform.</p>
      <Link to="/register" className="lci-go lci-cta">Register now</Link>
      {bixPrice ? <small>Harga referensi internal BIX · ${bixPrice.toFixed(4)}</small> : null}
    </div>
    <div className="lci-grid">{SERVICES.map(({ to, icon: I, name, desc }) => <Link key={to} to={to} className="lci-card"><I size={22}/><b>{name}</b><span>{desc}</span><em>View <ArrowRight size={13}/></em></Link>)}</div>
    <p className="lci-note"><ShieldCheck size={13}/> Projections are not guaranteed. Internal balance is not an asset traded on external exchanges.</p>
  </section>;
}
