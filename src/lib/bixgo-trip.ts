export const RIDER_CANCEL_REASONS = ['Change pickup or destination', 'Driver taking too long', 'Driver not moving toward pickup', 'Driver asked me to cancel', 'Wrong vehicle or payment method', 'Other'] as const;
export const DRIVER_CANCEL_REASONS = ['Vehicle breakdown', 'Passenger unreachable', 'Pickup road inaccessible', 'Passenger or luggage exceeds capacity', 'Other'] as const;
export function canCancelTrip(status: string) { return status === 'pending' || status === 'assigned'; }
export function validCancelReason(role: 'rider' | 'driver', reason: string, note: string) {
  const choices: readonly string[] = role === 'driver' ? DRIVER_CANCEL_REASONS : RIDER_CANCEL_REASONS;
  return choices.includes(reason) && note.length <= 240 && (reason !== 'Other' || note.trim().length > 0);
}
export function locationFresh(at: string | null | undefined, now = Date.now()) {
  const time = at ? Date.parse(at) : NaN;
  return Number.isFinite(time) && now - time >= 0 && now - time < 60_000;
}