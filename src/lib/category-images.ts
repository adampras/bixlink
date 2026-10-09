import forex from '@/assets/category-forex.jpg';
import crypto from '@/assets/category-crypto.jpg';
import rwa from '@/assets/category-rwa.jpg';
import advertising from '@/assets/category-advertising.jpg';
import marketplace from '@/assets/category-marketplace.jpg';

const images: Record<string, string> = { FOREX: forex, CRYPTO: crypto, RWA: rwa, ADVERTISING: advertising, MARKETPLACE: marketplace };
export const categoryImage = (title: string) => images[title.trim().toUpperCase()];
