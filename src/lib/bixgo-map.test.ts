import { describe, expect, it } from 'vitest';
import { contributorRank, mapPointSchema, mapSettingsSchema } from './bixgo-map';
const point = { name: 'Gerbang Melati', category: 'entrance', lat: -8.58, lng: 116.1, detail: '', note: '', photo: null, public: false };
describe('community map rules', () => {
  it('rejects coordinates outside earth bounds', () => { expect(mapPointSchema.safeParse({ ...point, lat: 91 }).success).toBe(false); expect(mapPointSchema.safeParse(point).success).toBe(true); });
  it('retains explicit private publication choice', () => { expect(mapPointSchema.parse(point).public).toBe(false); expect(mapPointSchema.safeParse({ ...point, public: undefined }).success).toBe(false); });
  it('rejects budgets above the 1,000,000 BIX marketing pool', () => { expect(mapSettingsSchema.safeParse({ enabled: true, reward: 1, limit: 5, budget: 1000001 }).success).toBe(false); });
  it('assigns contributor tiers using approved points only', () => { expect(contributorRank(0)).toBe('Community Contributor'); expect(contributorRank(5)).toBe('New Contributor'); expect(contributorRank(6)).toBe('Local Explorer'); expect(contributorRank(20)).toBe('Local Explorer'); expect(contributorRank(21)).toBe('Master Mapper'); });
});