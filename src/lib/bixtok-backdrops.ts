// LIVE "camera off" backgrounds: 29 built-in presets plus owner-added custom ones (bixtok_config.live_backdrops).
export type Backdrop = { id: string; name: string; css: string };
const g = (id: string, name: string, css: string): Backdrop => ({ id, name, css });
export const BACKDROPS: Backdrop[] = [
  g('obsidian-gold', 'Obsidian Gold', 'radial-gradient(circle at 30% 20%, #3a2e0a 0%, #0a0a0a 60%)'),
  g('royal-purple', 'Royal Purple', 'linear-gradient(160deg, #2a0845 0%, #6441a5 100%)'),
  g('fox-blue', 'Fox Blue', 'linear-gradient(160deg, #0b1d3a 0%, #1e5bd8 100%)'),
  g('matcha-lux', 'Matcha Lux', 'linear-gradient(160deg, #0b1f14 0%, #4f8f3a 100%)'),
  g('sunset', 'Sunset', 'linear-gradient(180deg, #ff7e5f 0%, #feb47b 100%)'),
  g('aurora', 'Aurora', 'linear-gradient(135deg, #00c9a7 0%, #845ec2 100%)'),
  g('ocean', 'Deep Ocean', 'linear-gradient(180deg, #00172d 0%, #005a8c 100%)'),
  g('rose-gold', 'Rose Gold', 'linear-gradient(135deg, #b76e79 0%, #f4c4c4 100%)'),
  g('neon-cyber', 'Neon Cyber', 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #ff00cc 100%)'),
  g('emerald', 'Emerald', 'radial-gradient(circle at 50% 30%, #0f9b58 0%, #03140b 70%)'),
  g('crimson', 'Crimson', 'linear-gradient(160deg, #200122 0%, #6f0000 100%)'),
  g('galaxy', 'Galaxy', 'radial-gradient(ellipse at top, #1b2735 0%, #090a0f 100%)'),
  g('champagne', 'Champagne', 'linear-gradient(160deg, #3b2f1e 0%, #d4b483 100%)'),
  g('mint', 'Mint Fresh', 'linear-gradient(160deg, #134e5e 0%, #71b280 100%)'),
  g('lava', 'Lava', 'radial-gradient(circle at 50% 80%, #ff4e00 0%, #1a0000 70%)'),
  g('midnight', 'Midnight', 'linear-gradient(180deg, #000000 0%, #1c2541 100%)'),
  g('peach', 'Peach', 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'),
  g('violet-gold', 'Violet Gold', 'linear-gradient(135deg, #a855f7 0%, #ffd700 100%)'),
  g('ice', 'Ice', 'linear-gradient(160deg, #e0f7ff 0%, #6dd5fa 100%)'),
  g('forest', 'Forest', 'linear-gradient(180deg, #0f2027 0%, #2c5364 100%)'),
  g('candy', 'Candy', 'linear-gradient(135deg, #ff6a88 0%, #ff99ac 50%, #fcb69f 100%)'),
  g('titanium', 'Titanium', 'linear-gradient(160deg, #232526 0%, #414345 100%)'),
  g('jade', 'Royal Jade', 'linear-gradient(135deg, #00261c 0%, #0e7c61 60%, #ffd700 140%)'),
  g('sky', 'Morning Sky', 'linear-gradient(180deg, #4facfe 0%, #00f2fe 100%)'),
  g('wine', 'Wine', 'linear-gradient(160deg, #3a0f1f 0%, #8e2de2 100%)'),
  g('desert', 'Desert', 'linear-gradient(180deg, #c79081 0%, #dfa579 100%)'),
  g('stripes', 'Gold Stripes', 'repeating-linear-gradient(135deg, #0a0a0a 0 22px, #1a1505 22px 44px)'),
  g('dots', 'Starlight', 'radial-gradient(#ffd70033 1.5px, transparent 1.5px) 0 0/22px 22px, linear-gradient(#0b0b14, #0b0b14)'),
  g('rainbow', 'Prism', 'linear-gradient(135deg, #f72585, #7209b7, #3a0ca3, #4361ee, #4cc9f0)'),
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
