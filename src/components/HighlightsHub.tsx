import { Link } from '@tanstack/react-router';
import launch from '@/assets/hub-launch.jpg';
import stake from '@/assets/hub-stake.jpg';
import p2p from '@/assets/hub-p2p.jpg';
import arena from '@/assets/hub-arena.jpg';
import { usePublicConfig } from '@/lib/useMember';

export const HUB_IMAGES = { launch, stake, p2p, arena } as const;
export const HUB_COLORS = ['gold', 'emerald', 'cyan', 'violet', 'crimson'] as const;
export type HubItem = { title: string; tag: string; body: string; color: typeof HUB_COLORS[number]; image: keyof typeof HUB_IMAGES; href: string; enabled?: boolean };
export const defaultHub: HubItem[] = [
  { title: 'Genesis Launch Hub', tag: 'PRESALE', body: '21M supply · $0.50 / BIX', color: 'gold', image: 'launch', href: '/presale' },
  { title: 'Yield & Staking', tag: 'STAKE', body: 'Hybrid USDT/BIX · Booster 100% BIX', color: 'emerald', image: 'stake', href: '/stake' },
  { title: 'P2P & Dev Buyback', tag: 'MARKET', body: 'Buyback locked $0.35 · P2P free', color: 'cyan', image: 'p2p', href: '/p2p' },
  { title: 'Fox Arena Quest', tag: 'GAMEFI', body: 'Daily missions · BIXP rewards', color: 'violet', image: 'arena', href: '/arena' },
];

export function HighlightsHub() {
  const { data: cfg } = usePublicConfig();
  const hub = (cfg?.readiness as { hub?: { enabled?: boolean; items?: HubItem[] } } | undefined)?.hub;
  if (hub?.enabled === false) return null;
  const items = (hub?.items?.length ? hub.items : defaultHub).filter(i => i.enabled !== false);
  if (!items.length) return null;
  return <nav aria-label="Highlights" className="hub-strip">{items.map((i, n) => {
    const inner = <><img src={HUB_IMAGES[i.image] ?? launch} alt="" loading={n < 2 ? 'eager' : 'lazy'} width={992} height={672}/><span className="hub-shade"/><span className="hub-text"><small>{i.tag}</small><b>{i.title}</b><em>{i.body}</em></span></>;
    return /^https:\/\//.test(i.href) ? <a key={n} href={i.href} target="_blank" rel="noopener noreferrer" className={`hub-card hub-${i.color}`}>{inner}</a> : <Link key={n} to={i.href as '/'} className={`hub-card hub-${i.color}`}>{inner}</Link>;
  })}</nav>;
}
