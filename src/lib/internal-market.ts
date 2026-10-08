import { z } from 'zod';

export const movementInputSchema = z.object({
  enabled: z.boolean(), lower: z.number().positive().max(1_000_000), upper: z.number().positive().max(1_000_000),
  intervalSeconds: z.number().int().min(2).max(300), intensity: z.number().min(1).max(100),
  bias: z.enum(['balanced', 'up', 'down']),
}).strict().refine(v => v.upper > v.lower, 'Upper price must exceed lower price');
export type MovementInput = z.infer<typeof movementInputSchema>;
export type InternalMovement = MovementInput & { base: number; startedAt: number; pausedAt: number | null };
export function resolveMovement(value: unknown): InternalMovement | null {
  const schema = z.object({ enabled: z.boolean(), lower: z.number().positive(), upper: z.number().positive(), intervalSeconds: z.number().int().min(2).max(300), intensity: z.number().min(1).max(100), bias: z.enum(['balanced','up','down']), base: z.number().positive(), startedAt: z.number().finite(), pausedAt: z.number().finite().nullable() });
  const result = schema.safeParse(value);
  if (!result.success || result.data.upper <= result.data.lower) return null;
  return result.data;
}
/** Display-only deterministic reference simulation. Never used for settlement. */
export function simulatedQuote(config: InternalMovement, now: number): number {
  const effective = config.enabled ? now : config.pausedAt ?? config.startedAt;
  const tick = Math.max(0, Math.floor((effective - config.startedAt) / (config.intervalSeconds * 1000)));
  const span = config.upper - config.lower;
  const center = config.bias === 'up' ? config.lower + span * .7 : config.bias === 'down' ? config.lower + span * .3 : (config.lower + config.upper) / 2;
  const wave = Math.sin(tick * .73) * .65 + Math.sin(tick * 1.91) * .35;
  const settling = 1 - Math.exp(-tick / 12);
  const raw = config.base + (center - config.base) * settling + wave * span * .45 * config.intensity / 100;
  return Math.min(config.upper, Math.max(config.lower, raw));
}
export function simulationHistory(config: InternalMovement, now: number) {
  const end = config.enabled ? now : config.pausedAt ?? config.startedAt;
  const tick = Math.max(0, Math.floor((end - config.startedAt) / (config.intervalSeconds * 1000)));
  const start = Math.max(0, tick - 39);
  return Array.from({ length: tick - start + 1 }, (_, i) => {
    const time = config.startedAt + (start + i) * config.intervalSeconds * 1000;
    return { time, price: simulatedQuote({ ...config, enabled: true }, time) };
  });
}