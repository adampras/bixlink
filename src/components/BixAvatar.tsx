import { useEffect, useState } from 'react';
import { AVATAR_EVENT, loadCard, signedUrl, type BixCard } from '@/lib/bix-avatar';

/** Hook: live member card (photo + status + story state), refreshed when a profile changes. */
export function useBixCard(userId?: string | null) {
  const [card, setCard] = useState<BixCard | null>(null);
  useEffect(() => {
    if (!userId) { setCard(null); return; }
    let alive = true;
    const run = (fresh = false) => void loadCard(userId, fresh).then(c => { if (alive) setCard(c); });
    run();
    const on = (e: Event) => { const id = (e as CustomEvent).detail?.userId; if (!id || id === userId) run(); };
    window.addEventListener(AVATAR_EVENT, on);
    return () => { alive = false; window.removeEventListener(AVATAR_EVENT, on); };
  }, [userId]);
  return card;
}

export function useSignedUrl(bucket: 'bix-avatars' | 'bix-stories', path?: string | null) {
  const [url, setUrl] = useState('');
  useEffect(() => { if (!path) { setUrl(''); return; } let alive = true; void signedUrl(bucket, path).then(u => { if (alive) setUrl(u); }); return () => { alive = false; }; }, [bucket, path]);
  return url;
}

type Props = { userId?: string | null | undefined; name: string; path?: string | null | undefined; className?: string | undefined; online?: boolean | undefined; ring?: boolean | undefined; story?: 'new' | 'seen' | null | undefined; onStory?: (() => void) | undefined };

/** Member photo with initial fallback; shows a gold story ring when the member has a visible story. */
export function BixAvatar({ userId, name, path, className = 'comm-ava', online, ring = true, story, onStory }: Props) {
  const card = useBixCard(path === undefined ? userId : null);
  const p = path === undefined ? card?.avatar_path : path;
  const url = useSignedUrl('bix-avatars', p);
  const st = story === undefined ? card?.story ?? null : story;
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  const cls = `${className} bx-ava${online ? ' is-online' : ''}${ring && st ? ` has-story is-${st}` : ''}`;
  const inner = url && !broken ? <img src={url} alt={`Photo of @${name}`} loading="lazy" onError={() => setBroken(true)}/> : <b>{(name || 'M').slice(0, 1).toUpperCase()}</b>;
  if (st && onStory) return <span role="button" tabIndex={0} aria-label={`View @${name}'s story`} className={cls} onClick={e => { e.stopPropagation(); onStory(); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onStory(); } }}>{inner}</span>;
  return <span className={cls}>{inner}</span>;
}
