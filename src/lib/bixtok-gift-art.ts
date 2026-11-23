import coin from '@/assets/bixtok-gifts/coin.webp';
import rose from '@/assets/bixtok-gifts/rose.webp';
import car from '@/assets/bixtok-gifts/car.webp';
import crown from '@/assets/bixtok-gifts/crown.webp';
import diamond from '@/assets/bixtok-gifts/diamond.webp';
import star from '@/assets/bixtok-gifts/star.webp';
import heart from '@/assets/bixtok-gifts/heart.webp';
import prism from '@/assets/bixtok-gifts/prism.webp';

const ART: [RegExp, string][] = [
  [/coin|bix|🪙/i, coin], [/rose|flower|🌹/i, rose], [/car|lambo|ferrari|🏎|🚗/i, car], [/crown|king|queen|👑/i, crown],
  [/diamond|💎/i, diamond], [/star|⭐|🌟/i, star], [/heart|love|❤|💜/i, heart], [/prism|gem|crystal|🔮/i, prism],
];
const ORDER = [coin, rose, car, crown, diamond, star, heart, prism];

/** Presentation-only artwork for a gift; the gift row (price, currency) is unchanged. */
export function giftArt(g: { name: string; emoji: string }, i: number): string {
  const hit = ART.find(([re]) => re.test(g.name) || re.test(g.emoji));
  return hit ? hit[1] : ORDER[i % ORDER.length]!;
}
