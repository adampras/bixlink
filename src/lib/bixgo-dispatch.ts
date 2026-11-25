import { z } from 'zod';

export const dispatchLocationSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().min(0).max(150),
});
export const DISPATCH_GPS_MAX_AGE_MS = 90_000;
export function freshDispatchFix(timestamp: number, now: number) {
  return Number.isFinite(timestamp) && timestamp <= now && now - timestamp <= DISPATCH_GPS_MAX_AGE_MS;
}