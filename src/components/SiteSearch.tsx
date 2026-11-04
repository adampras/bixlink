import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PUBLIC = [
  { to: '/', label: 'Home', k: 'beranda landing' },
  { to: '/auth', label: 'Sign in', k: 'login to account' },
  { to: '/register', label: 'Register', k: 'register new account' },
  { to: '/whitepaper', label: 'Whitepaper', k: 'tokenomics dokumen 21m' },
  { to: '/about', label: 'About', k: 'tentang' },
  { to: '/risk', label: 'Risk disclosure', k: 'risiko' },
  { to: '/terms', label: 'Terms', k: 'syarat ketentuan' },
  { to: '/privacy', label: 'Privacy', k: 'privasi' },
] as const;
const MEMBER = [
  { to: '/wallet', label: 'Wallet', k: 'wallet balance deposit withdraw' },
  { to: '/stake', label: 'Stake', k: 'staking paket' },
  { to: '/profit', label: 'Profit', k: 'keuntungan' },
  { to: '/boost', label: 'Boost APY', k: 'booster tier' },
  { to: '/network', label: 'Network', k: 'team referral network' },
  { to: '/presale', label: 'Presale & Sovereign', k: 'genesis 100000' },
  { to: '/market', label: 'Market & Updates', k: 'price market' },
  { to: '/nft-marketplace', label: 'NFT Marketplace', k: 'toko merchandise shop' },
  { to: '/arena', label: 'Fox Arena', k: 'game quest' },
  { to: '/pay', label: 'BIX PAY', k: 'transfer send' },
  { to: '/profile', label: 'Profile', k: 'account profile' },
  { to: '/settings', label: 'Settings', k: 'pengaturan' },
] as const;

export function SiteSearch({ member }: { member: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(true); } if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  const items = [...(member ? MEMBER : []), ...PUBLIC].filter(i => `${i.label} ${i.k}`.toLowerCase().includes(q.toLowerCase().trim()));
  return <>
    <Button type="button" variant="ghost" size="icon" className="header-icon" aria-label="Search" title="Search" onClick={() => setOpen(true)}><Search/></Button>
    {open && <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 px-4 pt-20 backdrop-blur-md" onClick={() => setOpen(false)}>
      <div role="dialog" aria-label="Search" className="w-full max-w-md rounded-2xl border border-primary/40 bg-card p-3 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 rounded-full border border-border px-3"><Search size={16} className="text-primary"/><input autoFocus className="w-full bg-transparent py-3 text-sm outline-none" placeholder="Search pages…" value={q} onChange={e => setQ(e.target.value)}/><button type="button" aria-label="Close" onClick={() => setOpen(false)}><X size={16}/></button></div>
        <div className="mt-2 max-h-[60vh] overflow-y-auto">{items.map(i => <Link key={i.to} to={i.to} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm hover:bg-muted">{i.label}</Link>)}{!items.length && <p className="px-3 py-4 text-sm text-muted-foreground">No results.</p>}</div>
      </div>
    </div>}
  </>;
}
