import foundation from '@/assets/cards/nft-foundation-20k.png.asset.json';
import signature from '@/assets/cards/nft-signature-25k.png.asset.json';
import prestige from '@/assets/cards/nft-prestige-30k.png.asset.json';
import elite from '@/assets/cards/nft-elite-50k.png.asset.json';
import sovereign from '@/assets/cards/nft-sovereign-70k.png.asset.json';
import apex from '@/assets/cards/nft-apex-100k.png.asset.json';

/** Premium NFT artwork for packages above $10,000, matched to the highest step the value reaches. */
const STEPS = [
  { min: 100000, name: 'Apex', url: apex.url },
  { min: 70000, name: 'Sovereign', url: sovereign.url },
  { min: 50000, name: 'Elite', url: elite.url },
  { min: 30000, name: 'Prestige', url: prestige.url },
  { min: 25000, name: 'Signature', url: signature.url },
  { min: 10001, name: 'Foundation', url: foundation.url },
];
export const valueCard = (usd: number) => STEPS.find(s => usd >= s.min);
