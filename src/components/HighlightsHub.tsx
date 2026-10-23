import { useRef } from 'react';
import { Link } from '@tanstack/react-router';
import launch from '@/assets/hub-launch.jpg';
import stake from '@/assets/hub-stake.jpg';
import p2p from '@/assets/hub-p2p.jpg';
import arena from '@/assets/hub-arena.jpg';
import market from '@/assets/hub-market.jpg';
import nft from '@/assets/hub-nft.jpg';
import { usePublicConfig } from '@/lib/useMember';
import { RailDots, useRailDots } from '@/components/EcosystemRail';

export const HUB_IMAGES = { launch, stake, p2p, arena, market, nft } as const;
export const HUB_COLORS = ['gold', 'emerald', 'cyan', 'violet', 'crimson'] as const;
export type HubItem = { title: string; tag: string; body: string; color: typeof HUB_COLORS[number]; image: keyof typeof HUB_IMAGES; href: string; enabled?: boolean };
export const defaultHub: HubItem[] = [
  { title: 'Genesis Launch Hub', tag: 'PRESALE', body: '21M supply · $0.50 / BIX', color: 'gold', image: 'launch', href: '/presale' },
  { title: 'BIX Booster APY', tag: 'BOOSTER', body: 'Tier ladder · dividends 100% BIX', color: 'emerald', image: 'stake', href: '/boost' },
  { title: 'Yield & Staking', tag: 'STAKE', body: 'Hybrid USDT/BIX · Booster 100% BIX', color: 'emerald', image: 'stake', href: '/stake' },
  { title: 'P2P & Dev Buyback', tag: 'MARKET', body: 'Buyback locked $0.35 · P2P free', color: 'cyan', image: 'p2p', href: '/p2p' },
  { title: 'Fox Arena Quest', tag: 'GAMEFI', body: 'Daily missions · BIXP rewards', color: 'violet', image: 'arena', href: '/arena' },
  { title: 'BIX Studio', tag: 'STUDIO', body: 'Poster · banner · presentasi', color: 'gold', image: 'launch', href: '/studio' },
  { title: 'Official Marketplace', tag: 'STORE', body: 'Luxury merchandise · Member bazaar', color: 'crimson', image: 'market', href: '/nft-marketplace' },
  { title: 'NFT Collection', tag: 'NFT', body: 'Glass reactor & gold bullion cards', color: 'violet', image: 'nft', href: '/nft-marketplace' },
];

export function HighlightsHub() {
  const { data: cfg } = usePublicConfig();
  const ref = useRef<HTMLElement>(null);
  const hub = (cfg?.readiness as { hub?: { enabled?: boolean; items?: HubItem[] } } | undefined)?.hub;
  const base = hub?.items?.length ? hub.items : defaultHub;
  const withPresale = base.some(i => i.href === '/presale') ? base : [defaultHub[0], ...base] as HubItem[];
  const withBooster = withPresale.some(i => i.href === '/boost') ? withPresale : [withPresale[0], defaultHub[1], ...withPresale.slice(1)].filter(Boolean) as HubItem[];
  const studio = defaultHub.find(i => i.href === '/studio')!;
  const withStudio = withBooster.some(i => i.href === '/studio') ? withBooster : [...withBooster, studio];
  const items = hub?.enabled === false ? [] : withStudio.filter(i => i.enabled !== false);
  const { active, goTo } = useRailDots(ref, items.length, 3200);
  if (!items.length) return null;
  return <div className="hub-wrap"><nav ref={ref} aria-label="Highlights" className="hub-strip">{items.map((i, n) => {
    const inner = <><img src={HUB_IMAGES[i.image] ?? launch} alt="" loading={n < 2 ? 'eager' : 'lazy'} width={992} height={672}/><span className="hub-shade"/><span className="hub-text"><small>{i.tag}</small><b>{i.title}</b><em>{i.body}</em></span></>;
    return /^https:\/\//.test(i.href) ? <a key={n} href={i.href} target="_blank" rel="noopener noreferrer" className={`hub-card hub-${i.color}`}>{inner}</a> : <Link key={n} to={i.href as '/'} className={`hub-card hub-${i.color}`}>{inner}</Link>;
  })}</nav><RailDots count={items.length} active={active} goTo={goTo} label="Highlights"/></div>;
}
