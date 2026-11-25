import { describe, expect, it } from 'vitest';
import { chatCanSend, shouldAlertNewOrders, tripNavigation, validDriverApplication } from './bixgo-friendly';

const valid = { full_name: 'Driver Test', phone: '+62 81234567890', vehicle_model: 'Honda Vario', plate: 'DR 1234 AB' };
describe('BIXGO friendly access', () => {
  it('accepts complete lightweight registration without a vehicle age or premium-model requirement', () => {
    expect(validDriverApplication(valid, true)).toBe(true);
    expect(validDriverApplication({ ...valid, vehicle_model: 'Motor lama' }, true)).toBe(true);
  });
  it('requires a safety declaration', () => { expect(validDriverApplication(valid, false)).toBe(false); });
  it('requires name, reachable phone, vehicle model and plate', () => {
    for (const field of ['full_name', 'phone', 'vehicle_model', 'plate'] as const) expect(validDriverApplication({ ...valid, [field]: '' }, true)).toBe(false);
    expect(validDriverApplication({ ...valid, phone: '123' }, true)).toBe(false);
  });
  it('opens navigation at precise pickup coordinates, including zero', () => {
    expect(new URL(tripNavigation('Other city', 0, 0)).searchParams.get('destination')).toBe('0,0');
    expect(new URL(tripNavigation('West gate', null, null)).searchParams.get('destination')).toBe('West gate');
  });
  it('allows chat only during assigned or in-transit trips', () => {
    expect(['pending', 'assigned', 'in_transit', 'completed', 'cancelled'].map(chatCanSend)).toEqual([false, true, true, false, false]);
  });
  it('alerts only fresh orders after initial loading while online', () => {
    expect(shouldAlertNewOrders(true, true, 1)).toBe(true);
    expect(shouldAlertNewOrders(false, true, 1)).toBe(false);
    expect(shouldAlertNewOrders(true, false, 1)).toBe(false);
    expect(shouldAlertNewOrders(true, true, 0)).toBe(false);
  });
});