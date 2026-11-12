import { describe, expect, it } from 'vitest';
import { callFcmData, nativeCapabilities, validGps } from './native-capabilities';
describe('native foundations', () => {
  it('never treats browser plugins as locked-screen capabilities', () => {
    expect(nativeCapabilities('web', false, () => true)).toEqual({ platform: 'web', push: false, backgroundGps: false });
  });
  it('requires the actual background GPS plugin, not only Capacitor', () => {
    expect(nativeCapabilities('android', true, n => n === 'PushNotifications')).toEqual({ platform: 'android', push: true, backgroundGps: false });
  });
  it('rejects invalid GPS coordinates', () => {
    expect(validGps(-5.14, 119.43)).toBe(true);
    expect(validGps(91, 119)).toBe(false);
    expect(validGps(0, NaN)).toBe(false);
  });
  it('expires a call push after the 75 second ringing window', () => {
    expect(callFcmData('call-id', 'voice', '2026-11-10T07:34:00Z').expiresAt).toBe(String(Date.parse('2026-11-10T07:34:40Z')));
  });
});