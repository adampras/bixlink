import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowRight, ChevronDown, Cpu, Menu, Phone, Repeat, ShieldCheck, Wallet, X, Layers } from 'lucide-react';

const SERVICES = [
  { to: '/stake', icon: Layers, name: 'Staking', desc: 'Paket staking dengan durasi pilihan dan riwayat tercatat.' },
  { to: '/bixtrade', icon: Cpu, name: 'BIXTRADE', desc: 'Bot AI pemindai selisih harga lintas bursa referensi.' },
  { to: '/trade', icon: Repeat, name: 'P2P Market', desc: 'Jual beli BIX antar member dengan escrow internal.' },
  { to: '/call', icon: Phone, name: 'BIX CALL', desc: 'Chat, panggilan suara dan video untuk komunitas.' },
  { to: '/pay', icon: Wallet, name: 'BIX PAY', desc: 'Transfer BIX instan antar member di ledger internal.' },
] as const;

/** Owner-switchable corporate landing (iak.id-inspired): announcement bar, burger drawer, centered hero. Presentation only. */
export function LandingTradeStyle({ bixPrice }: { bixPrice?: number | undefined }) {
  const [open, setOpen] = useState(false);
  const [svc, setSvc] = useState(true);
  const [notice, setNotice] = useState(true);
  return <section className="lci">
    <header className="lci-bar">
      <b className="font-display">BIX<span>LINK</span></b>
      <button type="button" className="lci-burger" aria-label={open ? 'Tutup menu' : 'Buka menu'} aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? <X size={22}/> : <Menu size={22}/>}</button>
    </header>
    {open && <div className="lci-drawer-wrap" onClick={() => setOpen(false)}>
      <nav className="lci-drawer" onClick={e => e.stopPropagation()} aria-label="Menu BIXLINK">
        <button type="button" className="lci-row" aria-expanded={svc} onClick={() => setSvc(v => !v)}>Layanan <ChevronDown size={18} className={svc ? 'rotate-180' : ''}/></button>
        {svc && <div className="lci-sub">{SERVICES.map(s => <Link key={s.to} to={s.to} onClick={() => setOpen(false)}>{s.name}</Link>)}</div>}
        <Link className="lci-row" to="/risk" onClick={() => setOpen(false)}>Bantuan & Risiko</Link>
        <Link className="lci-row" to="/whitepaper" onClick={() => setOpen(false)}>Whitepaper</Link>
        <Link className="lci-row" to="/about" onClick={() => setOpen(false)}>Tentang Kami</Link>
        <div className="lci-auth"><Link to="/auth" className="lci-ghost">Login</Link><Link to="/register" className="lci-go">Daftar</Link></div>
      </nav>
    </div>}
    {notice && <div className="lci-notice"><AlertTriangle size={22}/><div><b>Waspada penipuan yang mengatasnamakan BIXLINK</b><Link to="/risk">Baca pengumuman <ArrowRight size={14}/></Link></div><button type="button" aria-label="Tutup pengumuman" onClick={() => setNotice(false)}><X size={18}/></button></div>}
    <div className="lci-hero">
      <h1 className="font-display">Solusi terintegrasi untuk <span>ekosistem digital</span> Anda</h1>
      <i className="lci-line" aria-hidden/>
      <p>Mulai dari staking, bot AI, pasar P2P hingga komunikasi komunitas — semua terhubung dalam satu platform.</p>
      <Link to="/register" className="lci-go lci-cta">Daftar sekarang</Link>
      {bixPrice ? <small>Harga referensi internal BIX · ${bixPrice.toFixed(4)}</small> : null}
    </div>
    <div className="lci-grid">{SERVICES.map(({ to, icon: I, name, desc }) => <Link key={to} to={to} className="lci-card"><I size={22}/><b>{name}</b><span>{desc}</span><em>Lihat <ArrowRight size={13}/></em></Link>)}</div>
    <p className="lci-note"><ShieldCheck size={13}/> Proyeksi tidak dijamin. Saldo internal bukan aset yang diperdagangkan di bursa eksternal.</p>
  </section>;
}
