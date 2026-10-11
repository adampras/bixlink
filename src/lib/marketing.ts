import copy from './marketing-copy.json';
import { z } from 'zod';
import type { Language } from './i18n';
export const marketingLocaleSchema = z.object({ intro: z.string().trim().max(500), sections: z.array(z.object({ title: z.string().trim().min(1).max(80), body: z.string().trim().max(900) })).length(4) }).strict();
export const marketingSchema = z.object({ enabled: z.boolean(), locales: z.object({ en: marketingLocaleSchema, id: marketingLocaleSchema, ms: marketingLocaleSchema, vi: marketingLocaleSchema, th: marketingLocaleSchema, zh: marketingLocaleSchema, ja: marketingLocaleSchema, ko: marketingLocaleSchema }).strict() }).strict();
export type MarketingPlan = z.infer<typeof marketingSchema>;
export const marketingCopy = (language: Language) => copy[language];
export const defaultMarketing = (): MarketingPlan => ({ enabled: true, locales: Object.fromEntries(Object.entries(copy).map(([lang, c]) => [lang, { intro: c[1], sections: [2,4,6,8].map(i => ({ title: c[i] ?? '', body: c[i+1] ?? '' })) }])) as MarketingPlan['locales'] });
export function poolAvailability(cap: number, used: number) { return { remaining: Math.max(0, cap - used), percent: cap > 0 ? Math.min(100, Math.max(0, used / cap * 100)) : 0 }; }