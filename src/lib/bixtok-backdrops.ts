// LIVE "camera off" backgrounds: 10 luxury + 10 avatar presets plus owner-added custom ones (bixtok_config.live_backdrops).
export type Backdrop = { id: string; name: string; css: string; avatar?: string };
const g = (id: string, name: string, css: string): Backdrop => ({ id, name, css });
const av = (id: string, name: string, avatar: string, css: string): Backdrop => ({ id, name, css, avatar });
export const BACKDROPS: Backdrop[] = [
  g('obsidian-gold', 'Obsidian Gold', 'radial-gradient(circle at 30% 20%, #3a2e0a 0%, #0a0a0a 60%)'),
  g('royal-purple', 'Royal Purple', 'radial-gradient(circle at 50% 25%, #6b2fb3 0%, #1a0630 70%)'),
  g('fox-blue', 'Fox Blue', 'radial-gradient(circle at 50% 20%, #1e5bd8 0%, #050d1f 70%)'),
  g('jade', 'Royal Jade', 'linear-gradient(135deg, #00261c 0%, #0e7c61 60%, #ffd700 140%)'),
  g('titanium', 'Titanium Silver', 'linear-gradient(160deg, #1b1c1e 0%, #4a4d52 55%, #1b1c1e 100%)'),
  g('champagne', 'Champagne', 'linear-gradient(160deg, #2a2114 0%, #b8955a 100%)'),
  g('violet-gold', 'Violet Gold', 'linear-gradient(145deg, #1a0630 0%, #a855f7 55%, #ffd700 120%)'),
  g('midnight', 'Midnight Navy', 'linear-gradient(180deg, #000000 0%, #121c38 100%)'),
  g('stripes', 'Gold Pinstripe', 'repeating-linear-gradient(135deg, #0a0a0a 0 22px, #1a1505 22px 44px)'),
  g('dots', 'Starlight', 'radial-gradient(#ffd70033 1.5px, transparent 1.5px) 0 0/22px 22px, linear-gradient(#0b0b14, #0b0b14)'),
  av('av-fox', 'Sovereign Fox', '🦊', 'radial-gradient(circle at 50% 40%, #3a2e0a 0%, #0a0a0a 65%)'),
  av('av-holo', 'Hologram Fox', '🦊', 'radial-gradient(circle at 50% 40%, #1e5bd8 0%, #050d1f 65%)'),
  av('av-exec', 'Executive', '🤵', 'linear-gradient(160deg, #1b1c1e 0%, #6b5520 100%)'),
  av('av-queen', 'Diamond Queen', '👸', 'radial-gradient(circle at 50% 40%, #6b2fb3 0%, #12041f 70%)'),
  av('av-robot', 'AI Robot', '🤖', 'radial-gradient(circle at 50% 40%, #0e7c61 0%, #02110b 70%)'),
  av('av-astro', 'Astronaut', '👨‍🚀', 'radial-gradient(ellipse at top, #1b2735 0%, #090a0f 100%)'),
  av('av-lion', 'Golden Lion', '🦁', 'radial-gradient(circle at 50% 40%, #b8955a 0%, #1a1205 70%)'),
  av('av-dragon', 'Jade Dragon', '🐉', 'linear-gradient(135deg, #00261c 0%, #0e7c61 70%, #ffd700 140%)'),
  av('av-crown', 'Royal Crown', '👑', 'radial-gradient(circle at 50% 40%, #a855f7 0%, #1a0630 55%, #000 100%)'),
  av('av-mic', 'Studio Voice', '🎙️', 'radial-gradient(circle at 50% 40%, #4a4d52 0%, #0a0a0a 70%)'),
];
export type CustomBackdrop = { id: string; name: string; url?: string; css?: string };
export function allBackdrops(custom: unknown): Backdrop[] {
  const extra = (Array.isArray(custom) ? custom as CustomBackdrop[] : [])
    .filter(c => c && c.id && (c.url || c.css))
    .map(c => ({ id: `c:${c.id}`, name: c.name || 'Custom', css: c.url && /^https:\/\//.test(c.url) ? `center/cover no-repeat url("${c.url.replace(/["\\]/g, '')}")` : String(c.css ?? '') }));
  return [...BACKDROPS, ...extra];
}
export function backdropCss(id: string | null | undefined, custom: unknown): string {
  const all = allBackdrops(custom);
  return (all.find(b => b.id === id) ?? all[0]!).css;
}
