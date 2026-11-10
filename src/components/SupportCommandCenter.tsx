import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Op = { id: string; code: string | null; name: string; active: boolean };
type Thread = { peer: string; name: string; last: string; at: string; mine: boolean; unread: number; network: 'admin1' | 'admin2' };
type Msg = { id: string; mine: boolean; body: string; at: string };
const rpc = async <T,>(fn: string, args?: Record<string, unknown>) => { const { data, error } = await supabase.rpc(fn as never, args as never); if (error) throw error; return data as unknown as T; };

/** Owner 1 desk: one page to read and answer every official CS inbox, tagged by Admin 1 / Admin 2 network. */
export function SupportCommandCenter() {
  const qc = useQueryClient();
  const ops = useQuery({ queryKey: ['support-operators'], queryFn: () => rpc<Op[]>('bix_support_operators_list') });
  const [op, setOp] = useState<string | null>(null);
  const [peer, setPeer] = useState<Thread | null>(null);
  const [filter, setFilter] = useState<'all' | 'admin1' | 'admin2'>('all');
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const list = ops.data ?? [];
  const cur = op ?? list[0]?.id ?? null;
  const inboxes = useQuery({ queryKey: ['support-inboxes', list.map(o => o.id).join()], enabled: list.length > 0, refetchInterval: 8000,
    queryFn: async () => Object.fromEntries(await Promise.all(list.map(async o => [o.id, await rpc<Thread[]>('bix_support_inbox', { p_op: o.id }).catch(() => [])]))) as Record<string, Thread[]> });
  const thread = useQuery({ queryKey: ['support-thread', cur, peer?.peer], enabled: !!cur && !!peer, refetchInterval: 5000,
    queryFn: () => rpc<Msg[]>('bix_support_thread', { p_op: cur, p_peer: peer!.peer }) });
  const seen = useRef<Record<string, number>>({});
  useEffect(() => {
    const d = inboxes.data; if (!d) return;
    for (const o of list) {
      const n = (d[o.id] ?? []).reduce((s, t) => s + t.unread, 0); const prev = seen.current[o.id];
      if (prev !== undefined && n > prev) { navigator.vibrate?.(30); try { if (Notification.permission === 'granted') new Notification(`CS @${o.name}: ${n - prev} pesan baru`); } catch { /* optional */ } }
      seen.current[o.id] = n;
    }
  }, [inboxes.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [thread.data?.length]);

  const send = async () => {
    if (!cur || !peer || !text.trim()) return; setBusy(true); setErr('');
    try { await rpc('bix_support_reply', { p_op: cur, p_peer: peer.peer, p_body: text }); setText(''); await qc.invalidateQueries({ queryKey: ['support-thread'] }); await qc.invalidateQueries({ queryKey: ['support-inboxes'] }); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Gagal mengirim.'); } finally { setBusy(false); }
  };
  if (!list.length) return null;
  const threads = (inboxes.data?.[cur ?? ''] ?? []).filter(t => filter === 'all' || t.network === filter);
  const tag = (n: Thread['network']) => <span className={`csc-tag is-${n}`}>{n === 'admin1' ? 'Jaringan Admin 1' : 'Jaringan Admin 2'}</span>;

  return <section className="csc mt-6 grid gap-3 rounded-2xl border border-border p-3" aria-label="Pusat chat CS">
    <div className="flex items-center justify-between gap-2"><b className="text-sm">Pusat Chat CS (Admin 1)</b>
      {typeof Notification !== 'undefined' && Notification.permission === 'default' && <button type="button" className="text-xs text-primary underline" onClick={() => void Notification.requestPermission()}>Aktifkan notifikasi</button>}</div>
    <div className="csc-ops" role="tablist">{list.map(o => { const n = (inboxes.data?.[o.id] ?? []).reduce((s, t) => s + t.unread, 0);
      return <button key={o.id} type="button" role="tab" aria-selected={o.id === cur} className="csc-op" onClick={() => { setOp(o.id); setPeer(null); }}>
        <b>@{o.name}</b><small>{o.active ? 'Aktif' : 'Istirahat'}</small>{n > 0 && <em>{n}</em>}</button>; })}</div>
    {!peer ? <>
      <div className="flex gap-1 text-xs">{(['all', 'admin1', 'admin2'] as const).map(f => <button key={f} type="button" aria-pressed={filter === f} className="csc-filter" onClick={() => setFilter(f)}>{f === 'all' ? 'Semua' : f === 'admin1' ? 'Admin 1' : 'Admin 2'}</button>)}</div>
      <div className="grid max-h-[55vh] gap-1 overflow-y-auto">
        {threads.map(t => <button key={t.peer} type="button" className="csc-thread" onClick={() => setPeer(t)}>
          <span className="min-w-0 text-left"><b className="block truncate">@{t.name}</b><small className="block truncate text-muted-foreground">{t.mine ? 'Anda: ' : ''}{t.last}</small></span>
          <span className="grid shrink-0 justify-items-end gap-1">{tag(t.network)}{t.unread > 0 && <em className="csc-badge">{t.unread}</em>}</span>
        </button>)}
        {inboxes.isSuccess && threads.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Belum ada chat masuk.</p>}
      </div>
    </> : <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2"><button type="button" className="text-xs text-primary" onClick={() => setPeer(null)}>← Kembali</button><b className="truncate text-sm">@{peer.name}</b>{tag(peer.network)}</div>
      <div className="csc-log">{(thread.data ?? []).map(m => <p key={m.id} className={m.mine ? 'is-mine' : ''}>{m.body}<time>{new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></p>)}<div ref={end}/></div>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void send(); }}>
        <input className="form-input flex-1" value={text} onChange={e => setText(e.target.value)} placeholder="Balas sebagai CS…" maxLength={1000}/>
        <button type="submit" disabled={busy || !text.trim()} aria-label="Kirim" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Send size={16}/></button>
      </form>{err && <p className="text-xs text-destructive">{err}</p>}
    </div>}
  </section>;
}
