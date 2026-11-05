import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, type RemoteTrack, type Participant } from 'livekit-client';
import { useServerFn } from '@tanstack/react-start';
import { Users, Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Check, Hand } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getBixRoomToken } from '@/lib/bix-call.functions';
import { copyText } from '@/lib/copy-text';
import { openVoiceShield, type VoiceShield } from '@/lib/bix-voice';

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
  return <section className="comm-group mt-4">
    <div className="comm-group-head"><Users size={16}/><b>Group Call</b><small>Voice/video meeting with the team</small></div>
    <div className="comm-group-form">
      <input className="form-input" placeholder="Room name, e.g. Jakarta Team Meeting" value={title} onChange={e => setTitle(e.target.value)} maxLength={60}/>
      <label className="comm-group-check"><input type="checkbox" checked={video} disabled={!tier?.video} onChange={e => setVideo(e.target.checked)}/> Video {tier?.video ? '' : '(tier PRO)'}</label>
      <button type="button" className="comm-group-btn" onClick={() => void create()}>+ Buat room</button>
    </div>
    <div className="comm-group-form">
      <input className="form-input" placeholder="Room code (6 letters)" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}/>
      <button type="button" className="comm-group-btn is-alt" disabled={code.length !== 6} onClick={() => setActive(code)}>Gabung</button>
    </div>
    {msg && <p className="comm-group-msg">{msg}</p>}
    {rooms.length > 0 && <ul className="comm-group-list">{rooms.map(r => <li key={r.id}>
      <span><b>{r.title}</b><small>{r.video ? '🎥 Video' : '🎙️ Voice'} · {r.code}{r.host_id === me ? ' · Host' : ''}</small></span>
      <button type="button" onClick={() => setActive(r.code)}>Join</button>
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

function Tile({ p, hand, self }: { p: Participant; hand: boolean; self: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const pub = p.getTrackPublication(Track.Source.Camera);
  const track = pub && !pub.isMuted ? pub.track : undefined;
  useEffect(() => { const el = ref.current; if (track && el) { track.attach(el); return () => { track.detach(el); }; } return undefined; }, [track]);
  const muted = p.getTrackPublication(Track.Source.Microphone)?.isMuted ?? true;
  const name = p.name || 'Member';
  return <div className={`comm-meet-tile ${p.isSpeaking ? 'is-speaking' : ''}`}>
    {track ? <video ref={ref} autoPlay playsInline muted={self}/> : <i>{name.slice(0, 1).toUpperCase()}</i>}
    <span>{hand && '✋ '}{name}{self ? ' (Anda)' : ''}{muted ? ' 🔇' : ''}</span>
  </div>;
}
