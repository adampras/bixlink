import { describe, expect, it } from 'vitest';
import { radarFlags, flashActive, queueTrips, defaultGrowth, growthSchema, type RadarMember } from '../lib/growth';
const now = Date.UTC(2026,9,25);
const member: RadarMember = { code:'BIX-123456',name:'Member',joined_at:new Date(now).toISOString(),deposit_usd:0,last_activity:new Date(now).toISOString(),kind:'loan',target:5000,turnover:3000 };
describe('growth rules', () => {
  it('potential means no verified deposit',()=>{ expect(radarFlags(member,now).potential).toBe(true); expect(radarFlags({...member,deposit_usd:100},now).potential).toBe(false); });
  it('near qualification includes 60–90 percent',()=>{ expect(radarFlags(member,now).near).toBe(true); expect(radarFlags({...member,turnover:4500},now).near).toBe(true); expect(radarFlags({...member,turnover:4501},now).near).toBe(false); expect(radarFlags({...member,turnover:2999},now).near).toBe(false); });
  it('dormant requires more than three days without recorded activity',()=>{ expect(radarFlags({...member,last_activity:new Date(now-3*86400000).toISOString()},now).dormant).toBe(false); expect(radarFlags({...member,last_activity:new Date(now-3*86400000-1).toISOString()},now).dormant).toBe(true); });
  it('default queue breaker trips above 5000 within a 120 minute window',()=>{ expect(defaultGrowth.window_minutes).toBe(120); expect(queueTrips(5000)).toBe(false); expect(queueTrips(5000.01)).toBe(true); });
  it('flash expires and cannot imply an ongoing event',()=>{ expect(flashActive({flash_enabled:true,flash_ends_at:new Date(now+1).toISOString()},now)).toBe(true); expect(flashActive({flash_enabled:true,flash_ends_at:new Date(now).toISOString()},now)).toBe(false); });
  it('rejects invalid queue safety bounds',()=>{ expect(growthSchema.safeParse({...defaultGrowth,threshold_usd:0}).success).toBe(false); expect(growthSchema.safeParse({...defaultGrowth,window_minutes:1441}).success).toBe(false); });
});