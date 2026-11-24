import coin from '@/assets/bixtok-gifts/coin.webp';
import rose from '@/assets/bixtok-gifts/rose.webp';
import car from '@/assets/bixtok-gifts/car.webp';
import crown from '@/assets/bixtok-gifts/crown.webp';
import diamond from '@/assets/bixtok-gifts/diamond.webp';
import star from '@/assets/bixtok-gifts/star.webp';
import heart from '@/assets/bixtok-gifts/heart.webp';
import prism from '@/assets/bixtok-gifts/prism.webp';
import coffee from '@/assets/bixtok-gifts/coffee.webp';
import matcha from '@/assets/bixtok-gifts/matcha.webp';
import rocket from '@/assets/bixtok-gifts/rocket.webp';
import dragon from '@/assets/bixtok-gifts/dragon.webp';
import fox from '@/assets/bixtok-gifts/fox.webp';
import vault from '@/assets/bixtok-gifts/vault.webp';
import yacht from '@/assets/bixtok-gifts/yacht.webp';
import jet from '@/assets/bixtok-gifts/jet.webp';
import castle from '@/assets/bixtok-gifts/castle.webp';

// Specific names first; generic "bix" coin match last so BIX Coffee / BIXLINK Fox get their own art.
const ART: [RegExp, string][] = [
  [/coffee|☕/i, coffee], [/matcha|🍵/i, matcha], [/rocket|🚀/i, rocket], [/dragon|🐉/i, dragon],
  [/fox|🦊/i, fox], [/vault|safe|🏦/i, vault], [/yacht|🛥|⛵/i, yacht], [/jet|plane|✈/i, jet],
  [/castle|palace|🏰/i, castle], [/lambo|ferrari|supercar|car|🏎|🚗/i, car], [/crown|king|queen|👑/i, crown],
  [/diamond|💎/i, diamond], [/rose|flower|🌹/i, rose], [/star|⭐|🌟/i, star], [/heart|love|❤|💜/i, heart],
  [/prism|gem|crystal|🔮/i, prism], [/coin|token|bix|🪙/i, coin],
];
const ORDER = [coin, rose, car, crown, diamond, star, heart, prism];

/** Presentation-only artwork for a gift; the gift row (price, currency) is unchanged. */
export function giftArt(g: { name: string; emoji: string }, i: number): string {
  const hit = ART.find(([re]) => re.test(g.name) || re.test(g.emoji));
  return hit ? hit[1] : ORDER[i % ORDER.length]!;
}
