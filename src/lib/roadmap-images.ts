import launch from '@/assets/phase-launch.jpg';
import staking from '@/assets/phase-staking-beta.jpg';
import rwa from '@/assets/phase-rwa-listing.jpg';
import ecosystem from '@/assets/phase-ecosystem.jpg';
import dao from '@/assets/phase-dao.jpg';
import milestone from '@/assets/phase-milestone.jpg';

const phases = [launch, staking, rwa, ecosystem, dao, milestone];
const byTitle: Record<string, string> = { LAUNCH: launch, 'STAKING APP BETA': staking, 'RWA LISTING': rwa, ECOSYSTEM: ecosystem, DAO: dao, '21 JUTA MILESTONE': milestone };
export function roadmapImage(title: string, index: number) {
  return byTitle[title.trim().toUpperCase()] ?? phases[index];
}