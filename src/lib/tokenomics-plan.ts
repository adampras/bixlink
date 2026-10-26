export const tokenomicsSupply = 21_000_000;
export const tokenomicsPlan = [
  { title: 'Staking Rewards', percent: 35, amount: 7_350_000, releaseYears: 10, halvingYears: 2, schedule: '10 years · halving every 2 years', description: 'BIXCOIN staking reward reserve plan with phased distribution and periodic emission reductions.' },
  { title: 'Presale Allocation', percent: 15, amount: 3_150_000, schedule: 'Phased release over 180–365 days per package', description: 'Dedicated allocation for Genesis presale packages. BIX is locked and released linearly based on package duration; pool cap 3,150,000 BIX.' },
  { title: 'Liquidity Pool', percent: 15, amount: 3_150_000, lockMonths: 12, schedule: '12-month lockup plan', description: 'Allocation planned for DEX and CEX liquidity. Trading and listing are not yet active.' },
  { title: 'Treasury DAO Reserve', percent: 10, amount: 2_100_000, schedule: 'Subject to DAO voting approval', description: 'Reserve plan for emergency contingencies and buyback proposals via future DAO governance.' },
  { title: 'Network & Leader Rewards', percent: 10, amount: 2_100_000, schedule: 'Network volume-based rewards', description: 'Network bonus plan in BIX: leader rank rewards, leader virtual capital, and community development incentives.' },
  { title: 'Team & Founders', percent: 10, amount: 2_100_000, cliffMonths: 12, vestingMonths: 24, schedule: '12-month cliff + 24-month linear vesting', description: 'Zero distribution during the first 12 months, followed by linear release over the subsequent 24 months.' },
  { title: 'Marketing & Community', percent: 5, amount: 1_050_000, releaseMonths: 24, schedule: '24-month phased distribution', description: 'Plan for airdrops, bounties, referral activities, creator collaborations, and advertising for community growth.' },
] as const;
export const tokenomicsVision = 'Building a community-driven BIXCOIN ecosystem with a capped supply, transparency, and a path toward DAO governance.';
export const tokenomicsMissions = ['Developing BIXLINK utility and community participation.', 'Openly presenting allocations and distribution schedules.', 'Progressively building community governance toward a DAO.'];
