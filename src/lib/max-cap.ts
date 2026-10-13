/**
 * Tiered max cap for staking/presale packages (final blueprint).
 * Accumulated earnings (daily profit + network bonuses) stop at the cap;
 * the package completes and a re-stake is required to continue.
 * Display/enforcement reference — settlement stays owner-reviewed.
 */
export function maxCapPct(usd: number): number {
  if (usd > 20_000) return 400;
  if (usd >= 1_000) return 350;
  return 300;
}

export function maxCapLabel(usd: number): string {
  return `Max cap ${maxCapPct(usd)}%`;
}
