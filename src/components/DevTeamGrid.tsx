import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import m1 from '@/assets/alliance-avatar-sg.jpg';
import m2 from '@/assets/alliance-avatar-id.jpg';
import m3 from '@/assets/alliance-avatar-my.jpg';
import m4 from '@/assets/alliance-avatar-hk.jpg';
import m5 from '@/assets/alliance-avatar-ae.jpg';
import f1 from '@/assets/dev-f1.jpg';
import f2 from '@/assets/dev-f2.jpg';
import f3 from '@/assets/dev-f3.jpg';
import f4 from '@/assets/dev-f4.jpg';
import f5 from '@/assets/dev-f5.jpg';

const M = [m1, m2, m3, m4, m5];
const F = [f1, f2, f3, f4, f5];

const TEAMS: Array<[string, string, string, string]> = [
  ['JP', 'Japan', 'Smart Contract Engineering', 'Designs and reviews token contract logic and testnet deployments for the fixed 21M BIX supply.'],
  ['KR', 'South Korea', 'Mobile Experience', 'Builds the phone-first member interface, touch feedback and smooth app navigation.'],
  ['IN', 'India', 'Data Engineering', 'Maintains ledger reporting, staking statistics and reliable data pipelines.'],
  ['NG', 'Nigeria', 'Security Operations', 'Monitors access control, account protection and suspicious activity review.'],
  ['BR', 'Brazil', 'Product Design', 'Shapes the luxury Obsidian-Gold visual language across every page.'],
  ['DE', 'Germany', 'Quality Assurance', 'Tests staking, wallet and transfer flows before every release.'],
  ['GB', 'United Kingdom', 'Risk & Disclosure', 'Keeps risk notices, projections labels and terms clear and consistent.'],
  ['US', 'United States', 'Cloud Infrastructure', 'Runs global edge hosting, uptime monitoring and backups.'],
  ['FR', 'France', 'Localization', 'Coordinates multi-language content for members worldwide.'],
  ['TH', 'Thailand', 'Community Support', 'Answers member questions and supports regional leaders.'],
  ['VN', 'Vietnam', 'Frontend Engineering', 'Develops market tickers, charts and responsive layouts.'],
  ['PH', 'Philippines', 'Member Onboarding', 'Guides new members through registration and verification.'],
  ['TR', 'Türkiye', 'Payments Research', 'Studies future payment and merchant options; no live payment rail yet.'],
  ['SA', 'Saudi Arabia', 'Partnerships', 'Explores regional partners and institutional relationships.'],
  ['ZA', 'South Africa', 'Game Systems', 'Develops Fox Arena missions, quests and promo rewards.'],
  ['CA', 'Canada', 'AI Assistant', 'Trains FOX AI Live Chat with safe, factual answers.'],
  ['AU', 'Australia', 'Media Studio', 'Builds BIX Studio tools for posters, banners and presentations.'],
  ['CH', 'Switzerland', 'Treasury Research', 'Plans reserve policy and long-term token vesting concepts.'],
  ['NL', 'Netherlands', 'NFT Certificates', 'Creates staking certificate artwork and the NFT catalog.'],
  ['MX', 'Mexico', 'Marketing Content', 'Produces official posters, videos and campaign materials.'],
];

export function DevTeamGrid() {
  const [open, setOpen] = useState<number | null>(null);
  const t = open !== null ? TEAMS[open] : null;
  const img = (i: number) => (i % 2 === 0 ? F[(i / 2) % 5] : M[((i - 1) / 2) % 5]);
  return <section className="dev-team" aria-labelledby="dev-team-title">
    <div className="eyebrow justify-center">GLOBAL BUILDERS</div>
    <h2 id="dev-team-title" className="section-title text-center">20 <span>DEVELOPER TEAMS</span></h2>
    <p className="mt-2 text-center text-[11px] text-muted-foreground">Engineers and specialists from 20 countries building BIXLINK together.</p>
    <div className="dev-team-grid">
      {TEAMS.map(([code, name, role], i) => <button type="button" key={code} className="dev-tile" style={{ animationDelay: `${(i % 10) * 0.12}s` }} onClick={() => setOpen(i)} aria-label={`${name} — ${role}`}>
        <span className="dev-tile-img"><img src={img(i)} alt="" width={96} height={96} loading="lazy"/><i>{code}</i></span>
        <b>{name}</b><small>{role}</small>
      </button>)}
    </div>
    <p className="mt-3 text-center text-[10px] text-muted-foreground">Illustrative avatars and focus roles; official profiles are published after verification.</p>
    <Dialog open={open !== null} onOpenChange={v => !v && setOpen(null)}>
      <DialogContent className="max-w-sm">
        {t && open !== null && <DialogHeader className="items-center text-center">
          <span className="dev-tile-img dev-tile-img--lg"><img src={img(open)} alt="" width={96} height={96}/><i>{t[0]}</i></span>
          <DialogTitle>{t[1]}</DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-[.2em] text-chart-3">{t[2]}</DialogDescription>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">{t[3]}</p>
        </DialogHeader>}
      </DialogContent>
    </Dialog>
  </section>;
}
