/** Local, on-device interest profile for the "For You" feed (no tracking leaves the phone). */
const KEY = 'bixtok:affinity:v1';
type Affinity = { creators: Record<string, number>; tags: Record<string, number>; seen: Record<string, number> };

export function readAffinity(): Affinity {
  try { const a = JSON.parse(localStorage.getItem(KEY) || '{}'); return { creators: a.creators ?? {}, tags: a.tags ?? {}, seen: a.seen ?? {} }; } catch { return { creators: {}, tags: {}, seen: {} }; }
}
function write(a: Affinity) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* storage full */ } }

export const tagsOf = (caption: string) => (caption.match(/#[\p{L}\d_]+/gu) ?? []).map(t => t.toLowerCase());

/** Record an interaction: like=3, save=4, share=3, watch=1. */
export function noteInterest(v: { id: string; creator_id: string | null; caption: string }, weight: number, seen = false) {
  const a = readAffinity();
  if (v.creator_id) a.creators[v.creator_id] = Math.min(50, (a.creators[v.creator_id] ?? 0) + weight);
  for (const t of tagsOf(v.caption)) a.tags[t] = Math.min(50, (a.tags[t] ?? 0) + weight);
  if (seen) a.seen[v.id] = Date.now();
  const ids = Object.keys(a.seen); if (ids.length > 400) for (const k of ids.sort((x, y) => a.seen[x]! - a.seen[y]!).slice(0, ids.length - 400)) delete a.seen[k];
  write(a);
}

type V = { id: string; creator_id: string | null; caption: string; likes: number };
/** Rank: popularity + creator/tag interest + following, with already-watched posts pushed down. Order-stable for ties. */
export function rankForYou<T extends V>(videos: T[], a: Affinity, following: Set<string>, now = Date.now()): T[] {
  const score = (v: T) => {
    let s = Math.log10(1 + Math.max(0, Number(v.likes) || 0)) * 2;
    if (v.creator_id) { s += (a.creators[v.creator_id] ?? 0) * 0.4; if (following.has(v.creator_id)) s += 3; }
    for (const t of tagsOf(v.caption)) s += (a.tags[t] ?? 0) * 0.25;
    const seenAt = a.seen[v.id]; if (seenAt && now - seenAt < 3 * 86_400_000) s -= 6;
    return s;
  };
  return videos.map((v, i) => ({ v, i, s: score(v) })).sort((x, y) => y.s - x.s || x.i - y.i).map(x => x.v);
}
