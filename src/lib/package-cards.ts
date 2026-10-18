import seed from '@/assets/cards/card-seed.png.asset.json';
import spark from '@/assets/cards/card-spark.png.asset.json';
import explorer from '@/assets/cards/card-explorer.png.asset.json';
import pioneer from '@/assets/cards/card-pioneer.png.asset.json';
import builder from '@/assets/cards/card-builder.png.asset.json';
import guardian from '@/assets/cards/card-guardian.png.asset.json';
import titan from '@/assets/cards/card-titan.png.asset.json';
import legend from '@/assets/cards/card-legend.png.asset.json';

/** Member pass card artwork per staking package ($10–$10,000). */
export const PACKAGE_CARDS: Record<string, { name: string; url: string }> = {
  SEED: { name: 'Seed Pass', url: seed.url },
  SPARK: { name: 'Spark Pass', url: spark.url },
  EXPLORER: { name: 'Explorer Tier', url: explorer.url },
  PIONEER: { name: 'Pioneer Tier', url: pioneer.url },
  BUILDER: { name: 'Builder Tier', url: builder.url },
  GUARDIAN: { name: 'Guardian VIP', url: guardian.url },
  TITAN: { name: 'Titan Elite', url: titan.url },
  LEGEND: { name: 'Sovereign Legend', url: legend.url },
};
export const packageCard = (id?: string | null) => (id ? PACKAGE_CARDS[id.toUpperCase()] : undefined);
