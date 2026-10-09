import { z } from 'zod';

export const splashSettingsSchema = z.object({ durationSeconds: z.number().finite().min(0.5).max(60) }).strict();
export function splashDuration(value: unknown) {
  const result = splashSettingsSchema.safeParse(value);
  return result.success ? result.data.durationSeconds * 1000 : 500;
}