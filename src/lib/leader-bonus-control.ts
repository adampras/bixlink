/** This focused control never grants the all-funds exemption. */
export function activeBonusAccess(enabled: boolean): 'active_bonus' | 'normal' {
  return enabled ? 'active_bonus' : 'normal';
}