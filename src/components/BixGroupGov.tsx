import { useEffect, useState } from 'react';
import { FileText, Hexagon, Check, X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Prop = { id: string; title: string; body: string; ends_at: string; closed: boolean; yes: number; no: number; mine: boolean | null; members: number };
type Tx = { id: string; direction: 'in' | 'out'; asset: 'BIX' | 'USDT'; amount: number; note: string; created_at: string };
const errMsg = (e: { message: string } | null) => e?.message ?? '';
const left = (iso: string) => { const ms = new Date(iso).getTime() - Date.now(); if (ms <= 0) return 'Ended'; const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24; return d ? `${d}d ${h}h left` : `${h}h ${Math.floor(ms / 6e4) % 60}m left`; };

export function ProposalsTab({ group, manage, onMsg }: { group: string; manage: boolean; onMsg: (m: string) => void }) {
  const [list, setList] = useState<Prop[]>([]); const [form, setForm] = useState(false);
  const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [days, setDays] = useState(3);
  const load = async () => { const { data } = await supabase.rpc('bix_group_proposals_list' as never, { p_group: group } as never); setList((data as Prop[] | null) ?? []); };
  useEffect(() => { void load(); }, [group]); // eslint-disable-line react-hooks/exhaustive-deps
  const create = async () => {
    const { error } = await supabase.rpc('bix_group_proposal_create' as never, { p_group: group, p_title: title, p_body: body, p_days: days } as never);
    if (error) onMsg(errMsg(error)); else { setTitle(''); setBody(''); setForm(false); onMsg('Proposal dibuat.'); void load(); }
  };
  const vote = async (id: string, yes: boolean) => { const { error } = await supabase.rpc('bix_group_vote' as never, { p_proposal: id, p_yes: yes } as never); if (error) onMsg(errMsg(error)); else void load(); };
  const close = async (id: string) => { const { error } = await supabase.rpc('bix_group_proposal_close' as never, { p_proposal: id } as never); if (error) onMsg(errMsg(error)); else void load(); };
  return <div className="bx-gov">
    {manage && (form ? <div className="bx-gov-form">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Judul proposal" maxLength={120} aria-label="Judul proposal"/>
      <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Deskripsi (opsional)" maxLength={1000} aria-label="Deskripsi"/>
      <label>Durasi voting <select value={days} onChange={e => setDays(Number(e.target.value))}>{[1, 3, 7, 14, 30].map(d => <option key={d} value={d}>{d} hari</option>)}</select></label>
      <div className="bx-gov-row"><button type="button" className="bx-grp-lux-wide" disabled={title.trim().length < 3} onClick={() => void create()}>Buat Proposal</button><button type="button" className="bx-gov-ghost" onClick={() => setForm(false)}>Batal</button></div>
    </div> : <button type="button" className="bx-grp-lux-wide" onClick={() => setForm(true)}><Plus size={15}/> New Proposal</button>)}
    <ul className="bx-gov-list">{list.map(p => { const tot = p.yes + p.no; const pct = tot ? Math.round(p.yes / tot * 100) : 0; return <li key={p.id}>
      <div className="bx-gov-top"><FileText size={15} className="is-gold"/><b>{p.title}</b><em className={p.closed ? 'is-muted' : 'is-cyan'}>{p.closed ? (p.yes > p.no ? 'PASSED' : 'REJECTED') : 'ACTIVE'}</em></div>
      {p.body && <p>{p.body}</p>}
      <div className="bx-gov-bar"><i style={{ width: `${pct}%` }}/></div>
      <small>{p.yes} Yes · {p.no} No · {tot}/{p.members} voted · {p.closed ? 'Closed' : left(p.ends_at)}</small>
      {!p.closed && <div className="bx-gov-row">
        <button type="button" className={`bx-gov-vote${p.mine === true ? ' is-on' : ''}`} onClick={() => void vote(p.id, true)}><Check size={14}/> Yes</button>
        <button type="button" className={`bx-gov-vote is-no${p.mine === false ? ' is-on' : ''}`} onClick={() => void vote(p.id, false)}><X size={14}/> No</button>
        {manage && <button type="button" className="bx-gov-ghost" onClick={() => void close(p.id)}>Tutup</button>}
      </div>}
    </li>; })}
      {!list.length && <li className="bx-grp-lux-empty">Belum ada proposal.</li>}
    </ul>
  </div>;
}

export function TreasuryTab({ group, manage, onMsg }: { group: string; manage: boolean; onMsg: (m: string) => void }) {
  const [rows, setRows] = useState<Tx[]>([]); const [form, setForm] = useState(false);
  const [dir, setDir] = useState<'in' | 'out'>('in'); const [asset, setAsset] = useState<'BIX' | 'USDT'>('BIX'); const [amt, setAmt] = useState(''); const [note, setNote] = useState('');
  const load = async () => { const { data } = await supabase.from('bix_group_treasury' as never).select('id,direction,asset,amount,note,created_at').eq('group_id', group).order('created_at', { ascending: false }).limit(100); setRows((data as Tx[] | null) ?? []); };
  useEffect(() => { void load(); }, [group]); // eslint-disable-line react-hooks/exhaustive-deps
  const bal = (a: 'BIX' | 'USDT') => rows.filter(r => r.asset === a).reduce((s, r) => s + (r.direction === 'in' ? 1 : -1) * Number(r.amount), 0);
  const add = async () => {
    const { error } = await supabase.rpc('bix_group_treasury_add' as never, { p_group: group, p_direction: dir, p_asset: asset, p_amount: Number(amt), p_note: note } as never);
    if (error) onMsg(errMsg(error)); else { setAmt(''); setNote(''); setForm(false); onMsg('Catatan kas tersimpan.'); void load(); }
  };
  return <div className="bx-gov">
    <div className="bx-gov-bal"><div><Hexagon size={16} className="is-purple"/><b>{bal('BIX').toLocaleString('en-US', { maximumFractionDigits: 4 })}</b><small>BIX recorded</small></div><div><Hexagon size={16} className="is-gold"/><b>{bal('USDT').toLocaleString('en-US', { maximumFractionDigits: 4 })}</b><small>USDT recorded</small></div></div>
    <p className="bx-gov-note">Buku kas komunitas: hanya pencatatan oleh Founder/Moderator, tidak memindahkan saldo wallet siapa pun.</p>
    {manage && (form ? <div className="bx-gov-form">
      <div className="bx-gov-row"><select value={dir} onChange={e => setDir(e.target.value as 'in' | 'out')} aria-label="Arah"><option value="in">Masuk</option><option value="out">Keluar</option></select>
        <select value={asset} onChange={e => setAsset(e.target.value as 'BIX' | 'USDT')} aria-label="Aset"><option>BIX</option><option>USDT</option></select></div>
      <input inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="Jumlah" aria-label="Jumlah"/>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Keterangan" maxLength={200} aria-label="Keterangan"/>
      <div className="bx-gov-row"><button type="button" className="bx-grp-lux-wide" disabled={!(Number(amt) > 0)} onClick={() => void add()}>Simpan</button><button type="button" className="bx-gov-ghost" onClick={() => setForm(false)}>Batal</button></div>
    </div> : <button type="button" className="bx-grp-lux-wide" onClick={() => setForm(true)}><Plus size={15}/> Record Entry</button>)}
    <ul className="bx-gov-list">{rows.map(r => <li key={r.id} className="bx-gov-tx">
      <b className={r.direction === 'in' ? 'is-green' : 'is-red'}>{r.direction === 'in' ? '+' : '−'}{Number(r.amount).toLocaleString('en-US')} {r.asset}</b>
      <small>{r.note || '—'} · {new Date(r.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</small>
    </li>)}
      {!rows.length && <li className="bx-grp-lux-empty">Belum ada catatan kas.</li>}
    </ul>
  </div>;
}
