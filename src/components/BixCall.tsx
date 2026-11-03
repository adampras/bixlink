import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, SwitchCamera, Volume2, MessageCircle, VolumeX, ShieldCheck } from 'lucide-react';
import { openVoiceShield, type VoiceShield } from '@/lib/bix-voice';
import { supabase } from '@/integrations/supabase/client';
import { getBixCallToken } from '@/lib/bix-call.functions';
import foxLogo from '@/assets/bixlink-logo-gold.webp';
import { ensureBixPush, pushNotify } from '@/lib/bix-push';
import { startChosenRingtone, startRingback, playConnected, playEnded } from '@/lib/bix-tones';

type Kind = 'voice' | 'video';
type Active = { id: string; peerId: string; peerName: string; kind: Kind; role: 'caller' | 'callee'; status: string; whatsapp?: string | null };

/** Start a call from anywhere: dispatches to the global BixCallHost. */
export function startBixCall(peerId: string, peerName: string, kind: Kind) {
  window.dispatchEvent(new CustomEvent('bix-call', { detail: { peerId, peerName, kind } }));
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Ask once for phone notification permission (call from a user tap). */
export async function enableBixNotifications() {
  if (typeof Notification === 'undefined') return 'unsupported';
  const p = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (p === 'granted') await ensureBixPush();
  return p;
}

/** System notification shown when BIXLINK is in the background. */
function sysNotify(title: string, body: string, tag: string, ring: boolean, url = '/call') {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) return;
  const opts = { body, tag, icon: foxLogo, badge: foxLogo, requireInteraction: ring, vibrate: ring ? [400, 200, 400, 200, 400] : [120], data: { url } } as NotificationOptions;
  void navigator.serviceWorker?.getRegistration().then(reg => {
    if (reg) { void reg.showNotification(title, opts); return; }
    const n = new Notification(title, opts); n.onclick = () => { window.focus(); window.location.href = url; n.close(); };
  }).catch(() => { /* ignore */ });
}

/** Global host: watches incoming calls and renders the luxury BIXLINK BIXTOK call screen. */
export function BixCallHost() {
  const [me, setMe] = useState<string | null>(null);
  const [call, setCall] = useState<Active | null>(null);
  const [err, setErr] = useState('');
  const callRef = useRef<Active | null>(null); callRef.current = call;
  const lastChat = useRef(new Date().toISOString());

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((ev, s) => { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setMe(s?.user?.id ?? null); });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (me && typeof Notification !== 'undefined' && Notification.permission === 'granted') void ensureBixPush(); }, [me]);

  // Outgoing calls
  useEffect(() => {
    const on = async (e: Event) => {
      const d = (e as CustomEvent).detail as { peerId: string; peerName: string; kind: Kind };
      if (callRef.current) return;
      setErr('');
      const { data, error } = await supabase.rpc('bix_call_start' as never, { p_callee: d.peerId, p_kind: d.kind } as never);
      if (error) { setErr(error.message); setTimeout(() => setErr(''), 4000); return; }
      pushNotify('call', data as unknown as string);
      const peer = await supabase.rpc('bix_call_peer' as never, { p_user: d.peerId } as never);
      setCall({ id: data as unknown as string, peerId: d.peerId, peerName: d.peerName, kind: d.kind, role: 'caller', status: 'ringing', whatsapp: (peer.data as { whatsapp?: string } | null)?.whatsapp ?? null });
    };
    window.addEventListener('bix-call', on);
    return () => window.removeEventListener('bix-call', on);
  }, []);

  // Poll incoming + status of active call
  useEffect(() => {
    if (!me) return;
    let stop = false;
    const tick = async () => {
      const cur = callRef.current;
      if (cur) {
        const { data } = await supabase.from('bix_calls' as never).select('status').eq('id', cur.id).maybeSingle();
        const st = (data as { status?: string } | null)?.status;
        if (st && st !== cur.status && !stop) setCall(c => c && c.id === cur.id ? { ...c, status: st } : c);
        if (cur.role === 'caller' && cur.status === 'ringing' && st === 'ringing') { /* still ringing */ }
      } else {
        const since = new Date(Date.now() - 40000).toISOString();
        const { data } = await supabase.from('bix_calls' as never).select('id, caller_id, kind, status').eq('callee_id', me).eq('status', 'ringing').gte('created_at', since).order('created_at', { ascending: false }).limit(1);
        const row = (data as { id: string; caller_id: string; kind: Kind }[] | null)?.[0];
        if (row && !stop) {
          const peer = await supabase.rpc('bix_call_peer' as never, { p_user: row.caller_id } as never);
          const p = peer.data as { name?: string; whatsapp?: string } | null;
          setCall({ id: row.id, peerId: row.caller_id, peerName: p?.name ?? 'Member', kind: row.kind, role: 'callee', status: 'ringing', whatsapp: p?.whatsapp ?? null });
          try { navigator.vibrate?.([300, 200, 300]); } catch { /* unsupported */ }
          sysNotify(`📞 BIXCALL · ${row.kind === 'video' ? 'Video call' : 'Panggilan suara'} masuk`, `@${p?.name ?? 'Member'} memanggil Anda`, `call-${row.id}`, true);
        }
      }
      // Chat alerts while the app is in the background
      if (document.hidden) {
        const { data: msgs } = await supabase.from('bix_chat_messages' as never).select('id, sender_id, body, created_at').eq('recipient_id', me).is('read_at', null).gt('created_at', lastChat.current).order('created_at', { ascending: true }).limit(5);
        for (const m of (msgs as { id: string; sender_id: string; body: string; created_at: string }[] | null) ?? []) {
          lastChat.current = m.created_at;
          const peer = await supabase.rpc('bix_call_peer' as never, { p_user: m.sender_id } as never);
          sysNotify(`💬 BIX COMM · @${(peer.data as { name?: string } | null)?.name ?? 'Member'}`, m.body.slice(0, 120), `chat-${m.sender_id}`, false, `/call?chat=${m.sender_id}`);
        }
      } else lastChat.current = new Date().toISOString();
    };
    const t = setInterval(() => void tick(), 2500);
    void tick();
    return () => { stop = true; clearInterval(t); };
  }, [me]);

  // Caller timeout after 40s ringing
  useEffect(() => {
    if (!call || call.role !== 'caller' || call.status !== 'ringing') return;
    const t = setTimeout(() => void setStatus('ended'), 40000);
    return () => clearTimeout(t);
  }, [call?.id, call?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-close finished calls
  useEffect(() => {
    if (!call || !['ended', 'declined', 'missed'].includes(call.status)) return;
    const t = setTimeout(() => setCall(null), 2200);
    return () => clearTimeout(t);
  }, [call?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (s: 'accepted' | 'declined' | 'ended') => {
    const cur = callRef.current; if (!cur) return;
    const { data } = await supabase.rpc('bix_call_set' as never, { p_id: cur.id, p_status: s } as never);
    setCall(c => c ? { ...c, status: (data as unknown as string) || s } : c);
  };

  return <>
    {err && <div className="bixcall-toast" role="alert">{err}</div>}
    {call && <CallScreen call={call} onAccept={() => void setStatus('accepted')} onDecline={() => void setStatus('declined')} onEnd={() => void setStatus('ended')}/>}
  </>;
}

function CallScreen({ call, onAccept, onDecline, onEnd }: { call: Active; onAccept: () => void; onDecline: () => void; onEnd: () => void }) {
  const remoteV = useRef<HTMLVideoElement>(null);
  const backV = useRef<HTMLVideoElement>(null);
  const localV = useRef<HTMLVideoElement>(null);
  const audioBox = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(call.kind === 'video');
  const [secs, setSecs] = useState(0);
  const [link, setLink] = useState<'idle' | 'connecting' | 'on' | 'fail'>('idle');
  const [front, setFront] = useState(true);
  const [remoteVideo, setRemoteVideo] = useState(false);
  const [pip, setPip] = useState({ x: 0, y: 0 });
  const [fill, setFill] = useState(true);
  const [hideUi, setHideUi] = useState(false);
  const live = call.status === 'accepted';
  const done = ['ended', 'declined', 'missed'].includes(call.status);
  const [ringMuted, setRingMuted] = useState(false);
  const voiceRef = useRef<VoiceShield | null>(null);
  const [shield, setShield] = useState(true);
  const shieldRef = useRef(true);
  const ringing = !live && !done;
  useEffect(() => {
    if (!ringing || ringMuted) return;
    const stop = call.role === 'callee' ? startChosenRingtone() : startRingback();
    const vib = call.role === 'callee' ? setInterval(() => { try { navigator.vibrate?.([400, 200, 400]); } catch { /* unsupported */ } }, 2600) : undefined;
    return () => { stop(); if (vib) clearInterval(vib); try { navigator.vibrate?.(0); } catch { /* unsupported */ } };
  }, [ringing, ringMuted, call.role]);
  useEffect(() => { if (link === 'on') playConnected(); }, [link]);
  useEffect(() => { if (done) playEnded(); }, [done]);

  // Join room when accepted (caller joins as soon as callee accepts)
  useEffect(() => {
    if (!live) return;
    let room: Room | null = null; let cancelled = false;
    setLink('connecting');
    (async () => {
      try {
        const res = await getBixCallToken({ data: { callId: call.id } });
        if (!res.ok || cancelled) { setLink('fail'); return; }
        room = new Room({ adaptiveStream: false, dynacast: true });
        roomRef.current = room;
        room.on(RoomEvent.TrackSubscribed, (t: RemoteTrack) => {
          if (t.kind === Track.Kind.Video && remoteV.current) { t.attach(remoteV.current); if (backV.current) t.attach(backV.current); setRemoteVideo(true); }
          if (t.kind === Track.Kind.Audio && audioBox.current) { audioBox.current.querySelectorAll('audio').forEach(a => a.remove()); const el = t.attach() as HTMLAudioElement; el.volume = shieldRef.current ? 0.7 : 0.9; audioBox.current.appendChild(el); void el.play().catch(() => {}); }
        });
        room.on(RoomEvent.TrackUnsubscribed, (t: RemoteTrack) => { t.detach(); if (t.kind === Track.Kind.Video) setRemoteVideo(false); });
        room.on(RoomEvent.ParticipantDisconnected, () => onEnd());
        await room.connect(res.url, res.token);
        // Voice Shield: band filter + feedback notch + limiter + noise gate; falls back to the plain mic.
        try {
          const vs = await openVoiceShield(); if (cancelled) { vs.stop(); return; }
          voiceRef.current = vs;
          await room.localParticipant.publishTrack(vs.track, { source: Track.Source.Microphone, dtx: true, red: true, audioPreset: { maxBitrate: 40000 } });
        } catch {
          await room.localParticipant.setMicrophoneEnabled(true, { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } as never, { dtx: true, red: true });
        }
        if (call.kind === 'video') {
          await room.localParticipant.setCameraEnabled(true, { facingMode: 'user', resolution: { width: 1280, height: 720, frameRate: 30 } },
            { videoCodec: 'vp8', simulcast: true, degradationPreference: 'maintain-resolution', videoEncoding: { maxBitrate: 1_800_000, maxFramerate: 30 } });
          const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
          const mt = pub?.track?.mediaStreamTrack; if (mt && 'contentHint' in mt) mt.contentHint = 'detail';
          if (pub?.track && localV.current) pub.track.attach(localV.current);
        }
        if (!cancelled) setLink('on');
      } catch { if (!cancelled) setLink('fail'); }
    })();
    return () => { cancelled = true; void room?.disconnect(); roomRef.current = null; voiceRef.current?.stop(); voiceRef.current = null; };
  }, [live, call.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!live) return; const t = setInterval(() => setSecs(s => s + 1), 1000); return () => clearInterval(t); }, [live]);

  const toggleMic = async () => {
    const n = !mic; setMic(n);
    const pub = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (voiceRef.current && pub?.track) { if (n) await pub.track.unmute(); else await pub.track.mute(); return; }
    await roomRef.current?.localParticipant.setMicrophoneEnabled(n);
  };
  const toggleCam = async () => {
    const n = !cam; setCam(n);
    const lp = roomRef.current?.localParticipant; if (!lp) return;
    await lp.setCameraEnabled(n, { facingMode: front ? 'user' : 'environment' });
    const pub = lp.getTrackPublication(Track.Source.Camera);
    if (n && pub?.track && localV.current) pub.track.attach(localV.current);
  };
  const flip = async () => {
    const pub = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera);
    const tr = pub?.track as unknown as { restartTrack?: (o: object) => Promise<void> } | undefined;
    const nf = !front; setFront(nf);
    await tr?.restartTrack?.({ facingMode: nf ? 'user' : 'environment' }).catch(() => {});
  };
  const speaker = () => { audioBox.current?.querySelectorAll('audio').forEach(a => { a.volume = shieldRef.current ? 0.85 : 1; void a.play().catch(() => {}); }); };
  const toggleShield = () => {
    const n = !shield; setShield(n); shieldRef.current = n; voiceRef.current?.setShield(n);
    audioBox.current?.querySelectorAll('audio').forEach(a => { a.volume = n ? 0.7 : 0.9; });
  };

  const dragPip = (e: React.PointerEvent) => {
    const sx = e.clientX - pip.x, sy = e.clientY - pip.y;
    const move = (m: PointerEvent) => setPip({ x: m.clientX - sx, y: m.clientY - sy });
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };

  const statusText = done ? (call.status === 'declined' ? 'Panggilan ditolak' : call.status === 'missed' ? 'Tidak terjawab' : 'Panggilan berakhir')
    : live ? (link === 'on' ? fmt(secs) : link === 'fail' ? 'Gagal tersambung' : 'Menyambungkan…')
    : call.role === 'caller' ? 'Memanggil…' : call.kind === 'video' ? 'Panggilan video masuk' : 'Panggilan suara masuk';
  const wa = call.whatsapp?.replace(/[^0-9]/g, '');

  const showVideo = remoteVideo && call.kind === 'video';
  return <div className={`bixcall${showVideo ? ' is-video' : ''}${showVideo && hideUi ? ' is-hidden' : ''}`} role="dialog" aria-label="BIX CALL">
    <video ref={backV} className={`bixcall-back${showVideo && !fill ? " on" : ""}`} autoPlay playsInline muted aria-hidden="true"/>
    <video ref={remoteV} className={`bixcall-remote${showVideo ? ' on' : ''}${fill ? '' : ' fit'}`} autoPlay playsInline onClick={() => { if (showVideo) setHideUi(v => !v); }} onDoubleClick={() => setFill(v => !v)}/>
    {showVideo && <button type="button" className="bixcall-fit" onClick={() => setFill(v => !v)} aria-label={fill ? 'Tampilkan utuh' : 'Penuhi layar'}>{fill ? '⤡ Sudut lega' : '⤢ Layar penuh'}</button>}
    <div ref={audioBox} hidden/>
    <header className="bixcall-head">
      <img src={foxLogo} alt="" className="bixcall-fox"/>
      <span>✨ LAYANAN KHUSUS BIXLINK BIXTOK • ENCRYPTED SECURE CALL ✨</span>
    </header>
    {!(remoteVideo && call.kind === 'video') && <div className="bixcall-center">
      <div className={`bixcall-av${live && link === 'on' ? ' talking' : ''}${!live && !done ? ' ringing' : ''}`}><b>{call.peerName.slice(0, 1).toUpperCase()}</b></div>
      <h2>@{call.peerName}</h2>
      <p>{call.kind === 'video' ? '📹 Video Call' : '📞 Voice Call'}</p>
    </div>}
    <div className="bixcall-status"><i className={link === 'on' ? 'ok' : ''}/>{statusText}</div>
    {call.kind === 'video' && live && <video ref={localV} className="bixcall-pip" style={{ transform: `translate(${pip.x}px, ${pip.y}px) scaleX(${front ? -1 : 1})` }} onPointerDown={dragPip} autoPlay playsInline muted/>}
    <footer className="bixcall-ctl">
      {!live && !done && call.role === 'callee' && <>
        <button className="end" aria-label="Tolak" onClick={onDecline}><PhoneOff/></button>
        <button className="accept" aria-label="Terima" onClick={onAccept}>{call.kind === 'video' ? <Video/> : <Phone/>}</button>
      </>}
      {!live && !done && call.role === 'caller' && <>
        {wa && <a className="wa" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" aria-label="Hubungi via WhatsApp"><MessageCircle/></a>}
        <button className="end" aria-label="Batalkan" onClick={onEnd}><PhoneOff/></button>
      </>}
      {live && <>
        <button aria-label={mic ? 'Bisukan' : 'Nyalakan mikrofon'} className={mic ? '' : 'off'} onClick={() => void toggleMic()}>{mic ? <Mic/> : <MicOff/>}</button>
        {call.kind === 'video' && <button aria-label="Kamera" className={cam ? '' : 'off'} onClick={() => void toggleCam()}>{cam ? <Video/> : <VideoOff/>}</button>}
        {call.kind === 'video' && <button aria-label="Balik kamera" onClick={() => void flip()}><SwitchCamera/></button>}
        <button aria-label="Speaker" onClick={speaker}><Volume2/></button>
        <button aria-label={shield ? 'Perisai anti-storing aktif' : 'Aktifkan perisai anti-storing'} className={shield ? 'shield' : ''} onClick={toggleShield}><ShieldCheck/></button>
        <button className="end" aria-label="Akhiri" onClick={onEnd}><PhoneOff/></button>
      </>}
      {done && wa && <a className="wa" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" aria-label="Hubungi via WhatsApp"><MessageCircle/></a>}
    </footer>
  </div>;
}

/** Small voice + video buttons for any member card. */
export function CallButtons({ peerId, peerName, className = '' }: { peerId: string; peerName: string; className?: string }) {
  return <span className={`bixcall-btns ${className}`}>
    <button type="button" aria-label="Voice call" onClick={e => { e.stopPropagation(); startBixCall(peerId, peerName, 'voice'); }}><Phone size={15}/></button>
    <button type="button" aria-label="Video call" onClick={e => { e.stopPropagation(); startBixCall(peerId, peerName, 'video'); }}><Video size={15}/></button>
  </span>;
}
