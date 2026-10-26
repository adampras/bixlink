export const QUEST_KEYS = ['welcome', 'checkin', 'quiz', 'streak', 'referral', 'stake7', 'follow_x', 'join_telegram', 'sub_youtube'] as const;
export const SOCIAL_KEYS = ['follow_x', 'join_telegram', 'sub_youtube'] as const;
export type SocialKey = typeof SOCIAL_KEYS[number];
export type QuestKey = typeof QUEST_KEYS[number];
export const QUEST_LABELS: Record<QuestKey, { title: string; hint: string; period: 'daily' | 'weekly' | 'one-time' }> = {
  welcome: { title: 'Welcome bonus', hint: 'New verified members claim their welcome BIXP once.', period: 'one-time' },
  follow_x: { title: 'Follow BIXLINK on X', hint: 'Open the official X account, follow, then claim.', period: 'one-time' },
  join_telegram: { title: 'Join BIXLINK Telegram', hint: 'Join the official Telegram community, then claim.', period: 'one-time' },
  sub_youtube: { title: 'Subscribe on YouTube', hint: 'Subscribe to the official YouTube channel, then claim.', period: 'one-time' },
  checkin: { title: 'Daily check-in', hint: 'Open the Arena and check in once a day.', period: 'daily' },
  quiz: { title: 'Crypto quiz', hint: 'Answer today\'s question correctly. One try per day.', period: 'daily' },
  streak: { title: '7-day streak bonus', hint: 'Check in 7 days in a row.', period: 'daily' },
  referral: { title: 'Invite a member', hint: 'A member you invited verifies their email this week.', period: 'weekly' },
  stake7: { title: 'Steady staker', hint: 'Keep a stake active for at least 7 days.', period: 'weekly' },
};
export const VBIX_CAP = 100;
export function welcomeReward(rewards?: Partial<Record<QuestKey, number>>): number {
  return rewards?.welcome ?? 100;
}

/** Detect a stale read-back instead of reporting an unsaved reward as saved. */
export function arenaRewardsMatch(expected: { rewards: Partial<Record<QuestKey, number | undefined>>; cap?: number | undefined }, actual: { rewards: Partial<Record<QuestKey, number | undefined>>; cap?: number | undefined }) {
  return (expected.cap ?? 0) === (actual.cap ?? 0) && QUEST_KEYS.every(key => expected.rewards[key] === undefined || expected.rewards[key] === actual.rewards[key]);
}

/** Reward actually granted: never above the remaining per-account cap or pool. */
export function questPayout(reward: number, accountTotal: number, poolUsed: number, cap = VBIX_CAP, pool = 1_000_000) {
  return Math.max(0, Math.min(reward, cap - accountTotal, pool - poolUsed));
}

export type DenTier = { name: string; level: number };
/** Cosmetic Fox Den tier from real progress only. Pays nothing. */
export function denTier(p: { streak: number; mining: boolean; hasStake: boolean }): DenTier {
  const score = Math.min(p.streak, 30) + (p.mining ? 10 : 0) + (p.hasStake ? 20 : 0);
  if (score >= 45) return { name: 'Royal Jade', level: 4 };
  if (score >= 25) return { name: 'Gold', level: 3 };
  if (score >= 10) return { name: 'Silver', level: 2 };
  return { name: 'Bronze', level: 1 };
}
