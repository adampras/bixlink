import { useSyncExternalStore } from 'react';

// Global BIXTOK LIVE session so a LIVE keeps running (mini floating window) while members browse other pages.
export type MiniRoom = {
  live: any; me: string; cfg: any; following: boolean;
  onFollow: () => void; onGift: (r: { id: string; name: string }[]) => void;
};
export type MiniFeed = { src: string; kind: 'iframe' | 'video' | 'img'; title: string; id?: string };
let lastId: string | null = null;
type State = { room: MiniRoom | null; mini: boolean; feed: MiniFeed | null };
let state: State = { room: null, mini: false, feed: null };
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
export const bixtokMini = {
  open(room: MiniRoom) { state = { room, mini: false, feed: null }; emit(); },
  update(p: Partial<MiniRoom>) { if (!state.room) return; state = { ...state, room: { ...state.room, ...p } }; emit(); },
  setMini(mini: boolean) { state = { ...state, mini }; emit(); },
  close() { state = { ...state, room: null, mini: false }; emit(); },
  setFeed(feed: MiniFeed | null) { if (feed?.id) lastId = feed.id; state = { ...state, feed }; emit(); },
  peekLastId() { return lastId; },
  rememberId(id: string) { lastId = id; },
  takeLastId() { const v = lastId; lastId = null; return v; },
};
export function useBixtokMini(): State {
  return useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);
}
