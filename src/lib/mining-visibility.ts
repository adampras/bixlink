import { z } from 'zod';
export const miningVisibilitySchema = z.object({ visible: z.boolean() }).strict();
export function isMiningVisible(setting?: { visible?: boolean } | null) {
  return setting?.visible !== false;
}
