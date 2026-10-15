import common from '@/assets/nft-common.jpg';
import rare from '@/assets/nft-rare.jpg';
import epic from '@/assets/nft-epic.jpg';
import legendary from '@/assets/nft-legendary.jpg';
import mythic from '@/assets/nft-mythic.jpg';
import goldIngot from '@/assets/nft-gold-ingot.jpg';

export type NftTier = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
export const NFT_TIERS: NftTier[] = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];
export const NFT_ART: Record<NftTier, string> = { COMMON: goldIngot, RARE: goldIngot, EPIC: goldIngot, LEGENDARY: goldIngot, MYTHIC: goldIngot };
export const LEGACY_REACTOR_ART = { common, rare, epic, legendary, mythic };
export const NFT_NAME: Record<NftTier, string> = { COMMON: 'Aurum Mint Ingot 10g', RARE: 'Electrum Bullion 50g', EPIC: 'Damascus Gold Bar 100g', LEGENDARY: 'Digital Gold Bullion 250g', MYTHIC: 'Imperial Vault Master Ingot 1Kg' };

/** Mirrors SQL public.bix_nft_tier — bigger package + longer lock = better card. */
export function nftTier(usd: number, days: number): NftTier {
  const p = usd >= 10000 ? 4 : usd >= 3000 ? 3 : usd >= 500 ? 2 : usd >= 100 ? 1 : 0;
  const d = days >= 360 ? 4 : days >= 180 ? 3 : days >= 90 ? 2 : days >= 60 ? 1 : 0;
  const s = p + d;
  return s >= 8 ? 'MYTHIC' : s >= 6 ? 'LEGENDARY' : s >= 4 ? 'EPIC' : s >= 2 ? 'RARE' : 'COMMON';
}
/** BIX received when the owner buys back a card: card value ÷ BIX price at that moment. */
export function nftBuybackBix(valueUsd: number, priceUsd: number): number {
  return priceUsd > 0 ? Math.round(valueUsd / priceUsd * 1e6) / 1e6 : 0;
}
/** Annual APY stored in packages → monthly and daily display rates. */
export const monthlyRate = (annual: number) => annual / 12;
export const dailyRate = (annual: number) => annual / 365;

/** Unique visual signature per package value (grade 1–8) and lock period (power 1–5): 40 distinct combinations. */
const GRADE_STEPS = [50, 100, 500, 1000, 3000, 5000, 10000];
const POWER_DAYS = [30, 60, 90, 180, 360];
export function nftSignature(usd: number, days: number) {
  const grade = 1 + GRADE_STEPS.filter(v => usd >= v).length;
  const power = Math.max(1, POWER_DAYS.filter(d => days >= d).length);
  return { grade, power, hue: (grade - 1) * 42, code: `G${grade}-P${power}` };
}
