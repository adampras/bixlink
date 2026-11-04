import { Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bell, Radio, Search, Users, Wallet, GitBranch } from 'lucide-react';
import { useMember } from '@/lib/useMember';
import { enableBixNotifications } from '@/components/BixCall';

type Node = { user_id: string; parent_id: string | null; depth: number; member_code?: string | null; username?: string | null; full_name?: string | null };
const label = (n: Node) => n.username || n.full_name || n.member_code || n.user_id.slice(0, 8);

/** COMMUNITY tab: the member's own referral team as a contact book, plus ecosystem shortcuts. */
export function CommunityTab({ render }: { render: (id: string, name: string) => ReactNode }) {
  const { user, data } = useMember();
  const tree = useMemo(() => ((data?.tree ?? []) as Node[]).filter(n => n.user_id !== user?.id), [data?.tree, user?.id]);
  const [q, setQ] = useState('');
  const [gen, setGen] = useState<number | null>(null);
  const [limit, setLimit] = useState(30);
  const gens = useMemo(() => [...new Set(tree.map(n => n.depth))].sort((a, b) => a - b).slice(0, 8), [tree]);
  const direct = tree.filter(n => n.parent_id === user?.id).length;
  const list = tree.filter(n => (gen == null || n.depth === gen) && (!q.trim() || `${label(n)} ${n.member_code ?? ''}`.toLowerCase().includes(q.trim().toLowerCase().replace(/^@/, ''))));
  return <>
    <section className="comm-card comm-team">
      <div className="comm-team-stats"><span><b>{tree.length}</b><small>Team members</small></span><span><b>{direct}</b><small>Langsung</small></span><span><b>{gens.length}</b><small>Generasi</small></span></div>
      <div className="comm-team-links">
        <Link to="/bixtok"><Radio size={15}/>LIVE BIXTOK</Link>
        <Link to="/network"><GitBranch size={15}/>Network</Link>
        <Link to="/pay"><Wallet size={15}/>BIX PAY</Link>
      </div>
    </section>
    <section className="comm-card">
      <h3 className="comm-h"><Users size={13} className="mr-1 inline"/>Network team contacts</h3>
      <div className="comm-search"><Search size={15}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search team name or BIX-ID"/>{q && <button type="button" className="comm-clear" aria-label="Delete" onClick={() => setQ('')}>✕</button>}</div>
      {gens.length > 1 && <div className="comm-chips"><button type="button" className={gen == null ? 'is-on' : ''} onClick={() => setGen(null)}>Semua</button>{gens.map(g => <button type="button" key={g} className={gen === g ? 'is-on' : ''} onClick={() => setGen(g)}>G{g}</button>)}</div>}
      {tree.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">No team members yet. Share your referral link from the Network page.</p>
        : list.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">No matches found.</p>
        : <ul className="comm-list mt-2">{list.slice(0, limit).map(n => <li key={n.user_id} className="comm-row">
          <span className="comm-ava">{label(n).slice(0, 1).toUpperCase()}</span>
          <span className="min-w-0 flex-1"><b className="block truncate text-sm">@{label(n)}</b><small className="text-muted-foreground">{n.member_code ?? 'Member'} · G{n.depth}</small></span>
          {render(n.user_id, label(n))}</li>)}</ul>}
      {list.length > limit && <button type="button" className="comm-more" onClick={() => setLimit(l => l + 30)}>Tampilkan lebih banyak ({list.length - limit})</button>}
    </section>
  </>;
}

/** SETTING tab: notification permission for chats and calls while BIXLINK is in the background. */
export function NotifyCard() {
  const [perm, setPerm] = useState('default');
  useEffect(() => { setPerm(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission); }, []);
  const txt = perm === 'granted' ? 'Active — chats & calls appear even when BIXLINK is closed.' : perm === 'denied' ? 'Blocked in browser/device settings. Allow notifications for this site.' : perm === 'unsupported' ? 'This device does not support notifications yet.' : 'Not active yet.';
  return <section className="comm-card comm-notify">
    <span className={`comm-notify-ic is-${perm}`}><Bell size={16}/></span>
    <span className="min-w-0 flex-1"><b className="block text-sm">Notifikasi BIX CALL</b><small className="text-muted-foreground">{txt}</small></span>
    {perm === 'default' && <button type="button" onClick={() => void enableBixNotifications().then(p => setPerm(String(p)))}>Aktifkan</button>}
  </section>;
}
