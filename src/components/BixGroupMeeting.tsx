import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, type RemoteTrack, type Participant } from 'livekit-client';
import { useServerFn } from '@tanstack/react-start';
import { Users, Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Check, Hand, AudioLines, UserPlus, MoreHorizontal, ShieldCheck, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getBixRoomToken } from '@/lib/bix-call.functions';
import { copyText } from '@/lib/copy-text';
import { openVoiceShield, type VoiceShield } from '@/lib/bix-voice';
import { Button } from '@/components/ui/button';

type RoomRow = { id: string; title: string; code: string; video: boolean; host_id: string; created_at: string };
type Tier = { voice?: boolean; video?: boolean } | null;
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

/** BIX Group Meeting: create or join a voice/video room by 6-character code (LiveKit). */
export function BixGroupMeeting({ me, tier }: { me: string; tier: Tier }) {
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [title, setTitle] = useState(''); const [video, setVideo] = useState(false);
  const [code, setCode] = useState(''); const [msg, setMsg] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const load = async () => {
    const { data } = await supabase.from('bix_call_rooms').select('id,title,code,video,host_id,created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(20);
    setRooms((data as RoomRow[] | null) ?? []);
  };
  useEffect(() => { void load(); const t = setInterval(() => void load(), 15000); return () => clearInterval(t); }, []);
  const create = async () => {
    setMsg('');
    if (!tier?.voice) { setMsg('Group calls require CALLER tier ($30 active staking).'); return; }
    if (title.trim().length < 2) { setMsg('Isi nama room dulu.'); return; }
    const c = newCode();
    const { error } = await supabase.from('bix_call_rooms').insert({ host_id: me, title: title.trim().slice(0, 60), code: c, video: video && !!tier.video });
    if (error) { setMsg('Failed to create room.'); return; }
    setTitle(''); await load(); setActive(c);
  };
  if (active) return <MeetingStage code={active} me={me} onLeave={() => { setActive(null); void load(); }}/>;
  return <section className="comm-group mt-4 bx-board-lobby">
    <div className="comm-group-head"><Users size={16}/><b>Ruangan Anda</b><small>{rooms.length} room terbuka</small></div>
    <div className="comm-group-form bx-board-create">
      <label htmlFor="bx-board-title">Buat ruangan</label>
      <input id="bx-board-title" className="form-input" placeholder="Nama ruangan" value={title} onChange={e => setTitle(e.target.value)} maxLength={60}/>
      <label className="comm-group-check"><Video size={16}/><span>Mode Video<small>{tier?.video ? 'Video tersedia' : 'Memerlukan tier PRO'}</small></span><input type="checkbox" role="switch" aria-label="Mode Video" checked={video} disabled={!tier?.video} onChange={e => setVideo(e.target.checked)}/><i aria-hidden="true"/></label>
      <Button variant="ghost" type="button" className="comm-group-btn" onClick={() => void create()}>+ Buat Room</Button>
    </div>
    <div className="comm-group-form bx-board-join">
      <label htmlFor="bx-board-code">Gabung dengan kode</label>
      <input id="bx-board-code" className="form-input" placeholder="Kode room" autoComplete="off" spellCheck={false} maxLength={6} value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}/>
      <Button variant="ghost" type="button" className="comm-group-btn is-alt" disabled={code.length !== 6} onClick={() => setActive(code)}>Gabung</Button>
    </div>
    {msg && <p className="comm-group-msg">{msg}</p>}
    {rooms.length > 0 && <ul className="comm-group-list">{rooms.map(r => <li key={r.id}>
      <span className="bx-board-room-icon">{r.video ? <Video size={18}/> : <Mic size={18}/>}</span>
      <span className="bx-board-room-info"><b>{r.title}</b><small>{r.video ? 'Video' : 'Suara'} · {r.code}{r.host_id === me ? ' · Host' : ''}</small><em className="bx-board-open"><i/>Terbuka</em></span>
      <Button variant="ghost" size="sm" type="button" onClick={() => setActive(r.code)}>Masuk</Button>
    </li>)}</ul>}
  </section>;
}

export function MeetingStage({ code, me, onLeave }: { code: string; me: string; onLeave: () => void }) {
  const getToken = useServerFn(getBixRoomToken);
  const roomRef = useRef<Room | null>(null); const shield = useRef<VoiceShield | null>(null);
  const [info, setInfo] = useState<{ title: string; isHost: boolean; id: string; video: boolean } | null>(null);
  const [people, setPeople] = useState<Participant[]>([]);
  const [mic, setMic] = useState(true); const [cam, setCam] = useState(false);
  const [err, setErr] = useState(''); const [copied, setCopied] = useState(false);
  const [hands, setHands] = useState<Record<string, boolean>>({});
  const audioBox = useRef<HTMLDivElement>(null);
  const [lux, setLux] = useState(false); const [t0] = useState(() => Date.now()); const [now, setNow] = useState(() => Date.now());
  const [more, setMore] = useState(false);
  useEffect(() => { setLux(document.documentElement.hasAttribute('data-bc-lux')); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    let room: Room | null = null; let dead = false;
    void (async () => {
      try {
        const res = await getToken({ data: { code } }); if (dead) return;
        setInfo({ title: res.title, isHost: res.isHost, id: res.id, video: res.video });
        room = new Room({ adaptiveStream: false, dynacast: true }); roomRef.current = room;
        const sync = () => setPeople([room!.localParticipant, ...Array.from(room!.remoteParticipants.values())]);
        room.on(RoomEvent.ParticipantConnected, sync).on(RoomEvent.ParticipantDisconnected, sync)
          .on(RoomEvent.TrackMuted, sync).on(RoomEvent.TrackUnmuted, sync).on(RoomEvent.LocalTrackPublished, sync).on(RoomEvent.TrackUnsubscribed, sync)
          .on(RoomEvent.TrackSubscribed, (t: RemoteTrack) => { if (t.kind === Track.Kind.Audio) { const el = t.attach(); el.volume = 0.8; audioBox.current?.appendChild(el); } sync(); })
          .on(RoomEvent.DataReceived, (p, who) => { try { const m = JSON.parse(new TextDecoder().decode(p)) as { hand?: boolean; muteAll?: boolean }; if (m.muteAll) { void room?.localParticipant.setMicrophoneEnabled(false); setMic(false); } if (who && typeof m.hand === 'boolean') setHands(h => ({ ...h, [who.identity]: m.hand! })); } catch { /* ignore */ } });
        await room.connect(res.url, res.token);
        try { const vs = await openVoiceShield(); shield.current = vs; await room.localParticipant.publishTrack(vs.track, { source: Track.Source.Microphone, dtx: true, red: true }); }
        catch { await room.localParticipant.setMicrophoneEnabled(true, { echoCancellation: true, noiseSuppression: true, autoGainControl: true }); }
        sync();
      } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to join room'); }
    })();
    return () => { dead = true; void room?.disconnect(); shield.current?.stop(); roomRef.current = null; };
  }, [code, getToken]);

  const send = (o: object) => void roomRef.current?.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(o)), { reliable: true });
  const toggleMic = async () => { const n = !mic; const pub = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Microphone); if (pub?.track) { if (n) await pub.track.unmute(); else await pub.track.mute(); } setMic(n); };
  const toggleCam = async () => { const n = !cam; await roomRef.current?.localParticipant.setCameraEnabled(n, { resolution: { width: 640, height: 480, frameRate: 24 } }); setCam(n); };
  const hand = () => { const n = !hands[me]; setHands(h => ({ ...h, [me]: n })); send({ hand: n }); };
  const close = async () => { if (info) await supabase.from('bix_call_rooms').update({ status: 'closed' }).eq('id', info.id); onLeave(); };

  if (lux && !err) {
    const sec = Math.floor((now - t0) / 1000); const dur = [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60].map(n => String(n).padStart(2, '0')).join(':');
    const speaking = people.filter(p => p.isSpeaking);
    const center = speaking[0] ?? people[0];
    const ring = people.filter(p => p !== center).slice(0, 6);
    const audience = people.filter(p => p !== center && !ring.includes(p));
    const unmuted = people.filter(p => !(p.getTrackPublication(Track.Source.Microphone)?.isMuted ?? true)).length;
    const queue = people.filter(p => p.isSpeaking || hands[p.identity]);
    const nm = (p: Participant) => (p.name || 'Member') + (p.identity === me ? ' (Anda)' : '');
    const copy = async () => { if (await copyText(code)) { setCopied(true); setTimeout(() => setCopied(false), 1800); } };
    return <section className="bbr">
      <div ref={audioBox} hidden/>
      <header className="bbr-top"><button type="button" aria-label="Keluar" onClick={onLeave} className="bbr-ic">⌄</button><div><b>{info?.title ?? 'Menghubungkan…'}</b><small>{people.length} di ruangan</small></div><span className="bbr-live"><i/>Live</span></header>
      <div className="bbr-orbit" aria-label="Panggung pembicara">
        <span className="bbr-halo" aria-hidden/>
        {center && <div className={`bbr-core ${center.isSpeaking ? 'is-speaking' : ''}`}><Tile p={center} hand={!!hands[center.identity]} self={center.identity === me} lux/><b>{nm(center)}</b><small>{center.isSpeaking ? 'Active Speaker' : info?.isHost && center.identity === me ? 'Host' : 'Di panggung'}</small><span className="bbr-wave" aria-hidden>{Array.from({ length: 15 }, (_, i) => <i key={i} style={{ animationDelay: `${(i % 5) * 0.12}s` }}/>)}</span></div>}
        {ring.map((p, i) => <div key={p.identity} className={`bbr-seat ${p.isSpeaking ? 'is-speaking' : ''}`} style={{ ['--a' as string]: `${(360 / Math.max(ring.length, 1)) * i - 90}deg` }}><Tile p={p} hand={!!hands[p.identity]} self={p.identity === me} lux/><small>{nm(p)}</small></div>)}
      </div>
      <div className="bbr-dock">
        <button type="button" className={hands[me] ? 'is-on' : ''} onClick={hand}><Hand size={18}/><span>Raise</span></button>
        <button type="button" className={mic ? '' : 'is-off'} onClick={() => void toggleMic()}>{mic ? <Mic size={18}/> : <MicOff size={18}/>}<span>{mic ? 'Mute' : 'Unmute'}</span></button>
        <button type="button" className={`is-speak ${mic ? 'is-live' : ''}`} onClick={() => void toggleMic()} aria-label="Bicara"><AudioLines size={26}/><span>Speak</span></button>
        <button type="button" onClick={() => void copy()}>{copied ? <Check size={18}/> : <UserPlus size={18}/>}<span>{copied ? 'Tersalin' : 'Invite'}</span></button>
        <button type="button" className={more ? 'is-on' : ''} onClick={() => setMore(v => !v)}><MoreHorizontal size={18}/><span>More</span></button>
      </div>
      {more && <div className="bbr-more">
        {info?.video && <button type="button" onClick={() => void toggleCam()}>{cam ? <VideoOff size={16}/> : <Video size={16}/>} {cam ? 'Matikan kamera' : 'Nyalakan kamera'}</button>}
        {info?.isHost && <button type="button" onClick={() => send({ muteAll: true })}><MicOff size={16}/> Mute semua</button>}
        <button type="button" onClick={onLeave}><PhoneOff size={16}/> Keluar ruangan</button>
        {info?.isHost && <button type="button" className="is-danger" onClick={() => void close()}><PhoneOff size={16}/> Tutup ruangan</button>}
      </div>}
      <div className="bbr-card"><div className="bbr-card-h"><Crown size={14}/><b>Leader Boardroom</b><span className="bbr-live"><i/>Live</span></div>
        <dl className="bbr-stats"><div><dt>Members</dt><dd>{people.length}</dd></div><div><dt>Mic aktif</dt><dd>{unmuted}</dd></div><div><dt>Audience</dt><dd>{audience.length}</dd></div><div><dt>Duration</dt><dd>{dur}</dd></div></dl></div>
      <div className="bbr-card"><div className="bbr-card-h"><b>Speaking Queue</b></div>
        {queue.length === 0 ? <p className="bbr-empty">Belum ada yang angkat tangan.</p> : <ol className="bbr-queue">{queue.map((p, i) => <li key={p.identity}><em>{i + 1}</em><span className="bbr-av">{(p.name || 'M').slice(0, 1).toUpperCase()}</span><b>{nm(p)}</b><small className={p.isSpeaking ? 'is-speak' : 'is-next'}>{p.isSpeaking ? 'Speaking' : 'Angkat tangan'}</small></li>)}</ol>}</div>
      <div className="bbr-card bbr-secure"><ShieldCheck size={18}/><div><b>Kode ruangan {code}</b><small>Hanya member dengan kode yang bisa bergabung</small></div><button type="button" onClick={() => void copy()} aria-label="Salin kode">{copied ? <Check size={14}/> : <Copy size={14}/>}</button></div>
    </section>;
  }
  if (err) return <section className="comm-group mt-4"><p className="comm-group-msg">{err}</p><button type="button" className="comm-group-btn" onClick={onLeave}>Back</button></section>;
  return <section className="comm-meet mt-4">
    <div ref={audioBox} hidden/>
    <header><div><b>{info?.title ?? 'Menghubungkan…'}</b><small>{people.length} peserta · kode {code}</small></div>
      <button type="button" aria-label="Copy room code" onClick={async () => { if (await copyText(code)) { setCopied(true); setTimeout(() => setCopied(false), 1800); } }}>{copied ? <Check size={14}/> : <Copy size={14}/>}</button></header>
    <div className="comm-meet-grid">{people.map(p => <Tile key={p.identity} p={p} hand={!!hands[p.identity]} self={p.identity === me}/>)}</div>
    <div className="comm-meet-bar">
      <button type="button" className={mic ? '' : 'is-off'} onClick={() => void toggleMic()} aria-label="Mikrofon">{mic ? <Mic size={18}/> : <MicOff size={18}/>}</button>
      {info?.video && <button type="button" className={cam ? '' : 'is-off'} onClick={() => void toggleCam()} aria-label="Camera">{cam ? <Video size={18}/> : <VideoOff size={18}/>}</button>}
      <button type="button" className={hands[me] ? 'is-hand' : ''} onClick={hand} aria-label="Angkat tangan"><Hand size={18}/></button>
      {info?.isHost && <button type="button" onClick={() => send({ muteAll: true })} className="is-text">Mute all</button>}
      <button type="button" className="is-end" onClick={onLeave} aria-label="Leave"><PhoneOff size={18}/></button>
      {info?.isHost && <button type="button" className="is-text is-danger" onClick={() => void close()}>Close room</button>}
    </div>
  </section>;
}

function Tile({ p, hand, self, lux }: { p: Participant; hand: boolean; self: boolean; lux?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const pub = p.getTrackPublication(Track.Source.Camera);
  const track = pub && !pub.isMuted ? pub.track : undefined;
  useEffect(() => { const el = ref.current; if (track && el) { track.attach(el); return () => { track.detach(el); }; } return undefined; }, [track]);
  const muted = p.getTrackPublication(Track.Source.Microphone)?.isMuted ?? true;
  const name = p.name || 'Member';
  if (lux) return <span className="bbr-face">{track ? <video ref={ref} autoPlay playsInline muted={self}/> : <i>{name.slice(0, 1).toUpperCase()}</i>}{hand && <em className="bbr-hand">✋</em>}{muted && <em className="bbr-mute"><MicOff size={10}/></em>}</span>;
  return <div className={`comm-meet-tile ${p.isSpeaking ? 'is-speaking' : ''}`}>
    {track ? <video ref={ref} autoPlay playsInline muted={self}/> : <i>{name.slice(0, 1).toUpperCase()}</i>}
    <span>{hand && '✋ '}{name}{self ? ' (Anda)' : ''}{muted ? ' 🔇' : ''}</span>
  </div>;
}
