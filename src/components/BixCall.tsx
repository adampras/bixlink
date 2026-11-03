import { useEffect, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from 'react';
import { useRouter } from '@tanstack/react-router';
import { Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, SwitchCamera, Volume2, MessageCircle, VolumeX, X } from 'lucide-react';
import { syncBixCallTheme } from '@/lib/bix-call-theme';
import { openVoiceShield, type VoiceShield } from '@/lib/bix-voice';
import { supabase } from '@/integrations/supabase/client';
import { getBixCallToken } from '@/lib/bix-call.functions';
import foxLogo from '@/assets/bixlink-logo-gold.webp';
import { ensureBixPush, pushNotify } from '@/lib/bix-push';
import { startChosenRingtone, startRingback, playConnected, playEnded } from '@/lib/bix-tones';
import { useBixCard, useSignedUrl } from '@/components/BixAvatar';
import { INCOMING_VIBE, VIBE_EVERY_MS, pickRoute, tiltOf, type Route, type Tilt } from '@/lib/bix-call-route';

/** Large caller/callee photo inside the call ring; falls back to the gold initial. */
function CallPeerPhoto({ peerId, name }: { peerId: string; name: string }) {
  const card = useBixCard(peerId);
  const url = useSignedUrl('bix-avatars', card?.avatar_path);
  return <>{url ? <img className="bixcall-av-photo" src={url} alt={`Foto @${name}`}/> : <b>{name.slice(0, 1).toUpperCase()}</b>}{card?.status_text && <em className="bixcall-av-status">{card.status_text}</em>}</>;
}

type Kind = 'voice' | 'video';
/** rang = callee's device acknowledged the call ("Berdering"); offline = no acknowledgement within OFFLINE_MS. */
type Active = { id: string; peerId: string; peerName: string; kind: Kind; role: 'caller' | 'callee'; status: string; whatsapp?: string | null; rang?: boolean; offline?: boolean };
/** Caller phases: "Memanggil" until the callee device acks, then "Berdering"; no ack after 25 s means offline. */
export const OFFLINE_MS = 25000;
export const RING_TIMEOUT_MS = 40000;
export function callerPhase(c: { rang?: boolean; offline?: boolean }): 'calling' | 'ringing' | 'offline' {
  return c.offline ? 'offline' : c.rang ? 'ringing' : 'calling';
}

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
  useEffect(() => { syncBixCallTheme(); }, []);
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
    let stop = false; let n = 0;
    const tick = async () => {
      const cur = callRef.current;
      // Mark incoming chat as reached this device (double tick) whenever the app is open.
      if (n++ % 4 === 0) void supabase.rpc('bix_chat_delivered' as never);
      if (cur) {
        const { data } = await supabase.from('bix_calls' as never).select('status, rang_at').eq('id', cur.id).maybeSingle();
        const row = data as { status?: string; rang_at?: string | null } | null;
        const st = row?.status; const rang = !!row?.rang_at;
        if (!stop && ((st && st !== cur.status) || (rang && !cur.rang))) {
          if (rang && !cur.rang && cur.role === 'caller') { try { navigator.vibrate?.(25); } catch { /* optional */ } }
          setCall(c => c && c.id === cur.id ? { ...c, status: c.offline ? c.status : (st ?? c.status), rang: c.rang || rang } : c);
        }
      } else {
        const since = new Date(Date.now() - 40000).toISOString();
        const { data } = await supabase.from('bix_calls' as never).select('id, caller_id, kind, status').eq('callee_id', me).eq('status', 'ringing').gte('created_at', since).order('created_at', { ascending: false }).limit(1);
        const row = (data as { id: string; caller_id: string; kind: Kind }[] | null)?.[0];
        if (row && !stop) {
          // Acknowledge: caller switches from "Memanggil" to "Berdering".
          void supabase.rpc('bix_call_ring' as never, { p_id: row.id } as never);
          const peer = await supabase.rpc('bix_call_peer' as never, { p_user: row.caller_id } as never);
          const p = peer.data as { name?: string; whatsapp?: string } | null;
          setCall({ id: row.id, peerId: row.caller_id, peerName: p?.name ?? 'Member', kind: row.kind, role: 'callee', status: 'ringing', whatsapp: p?.whatsapp ?? null, rang: true });
          try { navigator.vibrate?.([300, 200, 300]); } catch { /* unsupported */ }
          sysNotify(`📞 BIXCALL · ${row.kind === 'video' ? 'Video call' : 'Panggilan suara'} masuk`, `@${p?.name ?? 'Member'} memanggil Anda`, `call-${row.id}`, true);
        }
      }
      // Chat alerts while the app is in the background
      if (document.hidden) {
        const { data: msgs } = await supabase.from('bix_messages' as never).select('id, sender_id, body, created_at').eq('recipient_id', me).is('read_at', null).gt('created_at', lastChat.current).order('created_at', { ascending: true }).limit(5);
        for (const m of (msgs as { id: string; sender_id: string; body: string; created_at: string }[] | null) ?? []) {
          lastChat.current = m.created_at;
          const peer = await supabase.rpc('bix_call_peer' as never, { p_user: m.sender_id } as never);
          sysNotify(`💬 BIX COMM · @${(peer.data as { name?: string } | null)?.name ?? 'Member'}`, (m.body ?? '').slice(0, 120), `chat-${m.sender_id}`, false, `/call?chat=${m.sender_id}`);
        }
      } else lastChat.current = new Date().toISOString();
    };
    const t = setInterval(() => void tick(), 2500);
    void tick();
    return () => { stop = true; clearInterval(t); };
  }, [me]);

  // Caller: no device ack after 25 s → offline screen; ringing but unanswered after 40 s → end.
  useEffect(() => {
    if (!call || call.role !== 'caller' || call.status !== 'ringing' || call.offline) return;
    const t = call.rang
      ? setTimeout(() => void setStatus('ended'), RING_TIMEOUT_MS)
      : setTimeout(() => { setCall(c => c ? { ...c, offline: true } : c); void setStatus('ended'); }, OFFLINE_MS);
    return () => clearTimeout(t);
  }, [call?.id, call?.status, call?.rang, call?.offline]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-close finished calls (the offline screen stays until the caller closes it)
  useEffect(() => {
    if (!call || call.offline || !['ended', 'declined', 'missed'].includes(call.status)) return;
    const t = setTimeout(() => setCall(null), 2200);
    return () => clearTimeout(t);
  }, [call?.status, call?.offline]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (s: 'accepted' | 'declined' | 'ended') => {
    const cur = callRef.current; if (!cur) return;
    const { data } = await supabase.rpc('bix_call_set' as never, { p_id: cur.id, p_status: s } as never);
    setCall(c => c ? { ...c, status: (data as unknown as string) || s } : c);
  };

  return <>
    {err && <div className="bixcall-toast" role="alert">{err}</div>}
    {call && <CallScreen call={call} onAccept={() => void setStatus('accepted')} onDecline={() => void setStatus('declined')} onEnd={() => void setStatus('ended')} onClose={() => setCall(null)}/>}
  </>;
}

function CallScreen({ call, onAccept, onDecline, onEnd, onClose }: { call: Active; onAccept: () => void; onDecline: () => void; onEnd: () => void; onClose: () => void }) {
  const router = useRouter();
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
  const [swapped, setSwapped] = useState(false);
  const [hideUi, setHideUi] = useState(false);
  const live = call.status === 'accepted';
  const done = ['ended', 'declined', 'missed'].includes(call.status);
  const [ringMuted, setRingMuted] = useState(false);
  const voiceRef = useRef<VoiceShield | null>(null);
  const shieldRef = useRef(true);
  const ringing = !live && !done;
  const phase = callerPhase(call);
  const [quality, setQuality] = useState<'excellent' | 'good' | 'poor' | 'unknown'>('unknown');
  const [level, setLevel] = useState(0);
  const ear = false;
  const nearRef = useRef(false);
  const [howl, setHowl] = useState(false);
  const howlRef = useRef(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const quickReply = async (text: string) => {
    setReplyOpen(false);
    await supabase.rpc('bix_chat_send' as never, { p_to: call.peerId, p_body: text, p_reply: null } as never);
    onDecline();
  };
  const [loud, setLoud] = useState(false);
  const loudRef = useRef(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  /** Remote volume: earpiece mode is softer; loudspeaker is full; lowered while a howl is detected. */
  const applyVolume = () => {
    const base = loudRef.current ? 1 : shieldRef.current ? 0.8 : 0.9;
    audioBox.current?.querySelectorAll('audio').forEach(a => { a.muted = false; a.volume = howlRef.current ? base * 0.75 : base; });
  };
  const attachAudio = (t: RemoteTrack) => {
    const box = audioBox.current; if (!box) return;
    box.querySelectorAll(`audio[data-sid="${t.sid}"]`).forEach(a => a.remove());
    const el = t.attach() as HTMLAudioElement; el.dataset['sid'] = t.sid ?? ''; el.autoplay = true; el.setAttribute('playsinline', '');
    box.appendChild(el); applyVolume();
    void el.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
  };
  const unlockAudio = () => {
    void roomRef.current?.startAudio().catch(() => {});
    audioBox.current?.querySelectorAll('audio').forEach(a => void a.play().catch(() => {}));
    setAudioBlocked(false);
  };
  // Remote voice level: drives the waveform and the "Ruang Dekat" half-duplex duck.
  useEffect(() => {
    if (link !== 'on') return;
    let hang = 0;
    const t = setInterval(() => {
      const r = roomRef.current; if (!r) return;
      let m = 0; r.remoteParticipants.forEach(p => { m = Math.max(m, p.audioLevel ?? 0); });
      if (!ear) setLevel(m);
      if (m > 0.04) hang = 4; else if (hang > 0) hang--;
      voiceRef.current?.setDuck(nearRef.current && hang > 0);
    }, 150);
    return () => clearInterval(t);
  }, [link, ear]);
  // Callee rings at once; caller hears the ringback only after the callee device acknowledges ("Berdering").
  useEffect(() => {
    if (!ringing || ringMuted) return;
    if (call.role === 'caller' && phase !== 'ringing') return;
    const stop = call.role === 'callee' ? startChosenRingtone() : startRingback();
    return () => { stop(); };
  }, [ringing, ringMuted, call.role, phase]);
  // Incoming call vibration: keeps buzzing in a WA-style rhythm until answered/declined, even if the ringtone is muted.
  useEffect(() => {
    if (!ringing || call.role !== 'callee') return;
    const buzz = () => { try { navigator.vibrate?.(INCOMING_VIBE); } catch { /* unsupported */ } };
    buzz(); const t = setInterval(buzz, VIBE_EVERY_MS);
    return () => { clearInterval(t); try { navigator.vibrate?.(0); } catch { /* unsupported */ } };
  }, [ringing, call.role]);
  useEffect(() => { if (link === 'on') { playConnected(); try { navigator.vibrate?.(60); } catch { /* unsupported */ } } }, [link]);
  useEffect(() => { if (done && !call.offline) playEnded(); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

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
          if (t.kind === Track.Kind.Audio) attachAudio(t);
        });
        room.on(RoomEvent.AudioPlaybackStatusChanged, () => setAudioBlocked(!room?.canPlaybackAudio));
        // Remote camera on/off mid-call (voice → video upgrade without redialing).
        room.on(RoomEvent.TrackMuted, (pub, p) => { if (!p.isLocal && pub.kind === Track.Kind.Video) setRemoteVideo(false); });
        room.on(RoomEvent.TrackUnmuted, (pub, p) => { if (!p.isLocal && pub.kind === Track.Kind.Video) setRemoteVideo(true); });
        room.on(RoomEvent.TrackUnsubscribed, (t: RemoteTrack) => { t.detach().forEach(e => e.remove()); if (t.kind === Track.Kind.Video) setRemoteVideo(false); });
        room.on(RoomEvent.ParticipantDisconnected, () => onEnd());
        room.on(RoomEvent.ConnectionQualityChanged, (q, p) => { if (p.isLocal) setQuality(String(q) as 'excellent' | 'good' | 'poor' | 'unknown'); });
        await room.connect(res.url, res.token);
        void room.startAudio().catch(() => {});
        room.remoteParticipants.forEach(p => p.trackPublications.forEach(pub => { if (pub.track && pub.kind === Track.Kind.Audio) attachAudio(pub.track as RemoteTrack); }));
        // Voice Shield: band filter + feedback notch + limiter + noise gate; falls back to the plain mic.
        try {
          const vs = await openVoiceShield(h => { howlRef.current = h; setHowl(h); applyVolume(); }); if (cancelled) { vs.stop(); return; }
          voiceRef.current = vs;
          await room.localParticipant.publishTrack(vs.track, { source: Track.Source.Microphone, dtx: false, red: true, audioPreset: { maxBitrate: 64000 } });
        } catch {
          await room.localParticipant.setMicrophoneEnabled(true, { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } as never, { dtx: true, red: true });
        }
        if (call.kind === 'video') await startCam(room, true);
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
  /** Turn the camera on/off inside the same room — a voice call becomes a video call without hanging up. */
  const startCam = async (room: Room, on: boolean, facing: 'user' | 'environment' = 'user') => {
    const lp = room.localParticipant;
    await lp.setCameraEnabled(on, { facingMode: facing, resolution: { width: 1280, height: 720, frameRate: 30 } },
      { videoCodec: 'vp8', simulcast: true, degradationPreference: 'balanced', videoEncoding: { maxBitrate: 2_600_000, maxFramerate: 30, priority: 'high' } as never,
        videoSimulcastLayers: [{ width: 640, height: 360, resolution: { width: 640, height: 360, frameRate: 30 }, encoding: { maxBitrate: 800_000, maxFramerate: 30 } }] as never });
    const mt = lp.getTrackPublication(Track.Source.Camera)?.track?.mediaStreamTrack; if (on && mt && 'contentHint' in mt) mt.contentHint = 'detail';
    setCam(on);
  };
  const toggleCam = async () => {
    const r = roomRef.current; if (!r) return;
    try { await startCam(r, !cam, front ? 'user' : 'environment'); } catch { setCam(false); }
  };
  // (Re)attach the local camera whenever its preview element appears or moves (pip ⇄ big).
  useEffect(() => {
    const t = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
    if (cam && t && localV.current) t.attach(localV.current);
  }, [cam, swapped, remoteVideo, link]);
  const flip = async () => {
    const pub = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera);
    const tr = pub?.track as unknown as { restartTrack?: (o: object) => Promise<void> } | undefined;
    const nf = !front; setFront(nf);
    await tr?.restartTrack?.({ facingMode: nf ? 'user' : 'environment' }).catch(() => {});
  };
  const manualAt = useRef(0);
  const speaker = () => { manualAt.current = Date.now(); void route(!loud); };
  const route = async (n: boolean) => {
    if (n === loudRef.current) return;
    setLoud(n); loudRef.current = n;
    void roomRef.current?.startAudio().catch(() => {});
    let sinkId = '';
    if (n) { try { const outs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audiooutput'); sinkId = outs.find(d => /speaker|pengeras/i.test(d.label))?.deviceId ?? ''; } catch { /* unsupported */ } }
    audioBox.current?.querySelectorAll('audio').forEach(a => { const s = a as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }; void s.setSinkId?.(sinkId).catch(() => {}); void a.play().catch(() => {}); });
    applyVolume();
  };
  // Auto loudspeaker: video on → speaker; voice call follows the phone (laid flat = speaker, at the ear = earpiece).
  // A manual tap on the speaker button wins for 10 s.
  const tiltRef = useRef<Tilt>('between');
  const anyVideo = cam || remoteVideo;
  useEffect(() => {
    if (link !== 'on') return;
    const decide = () => {
      if (Date.now() - manualAt.current < 10000) return;
      const next: Route = pickRoute({ video: anyVideo, tilt: tiltRef.current, current: loudRef.current ? 'speaker' : 'ear' });
      void route(next === 'speaker');
    };
    decide();
    let pending: Tilt | null = null; let since = 0;
    const onTilt = (e: DeviceOrientationEvent) => {
      const t = tiltOf(e.beta, e.gamma);
      if (t !== pending) { pending = t; since = Date.now(); return; }
      if (t !== tiltRef.current && Date.now() - since > 900) { tiltRef.current = t; decide(); }
    };
    window.addEventListener('deviceorientation', onTilt);
    return () => window.removeEventListener('deviceorientation', onTilt);
  }, [link, anyVideo]); // eslint-disable-line react-hooks/exhaustive-deps
  const askTilt = () => {
    const D = (globalThis as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    void D?.requestPermission?.().catch(() => {});
  };
  const openChat = () => { onClose(); void router.navigate({ to: '/call', search: { chat: call.peerId } as never }); };

  const dragPip = (e: React.PointerEvent) => {
    const sx = e.clientX - pip.x, sy = e.clientY - pip.y, ox = e.clientX, oy = e.clientY; let moved = false;
    const move = (m: PointerEvent) => { if (Math.abs(m.clientX - ox) + Math.abs(m.clientY - oy) > 8) moved = true; if (moved) setPip({ x: m.clientX - sx, y: m.clientY - sy }); };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (!moved) { setSwapped(v => !v); try { navigator.vibrate?.(12); } catch { /* unsupported */ } } };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };

  const statusText = call.offline ? 'Member sedang offline'
    : done ? (call.status === 'declined' ? 'Panggilan ditolak' : call.status === 'missed' ? 'Tidak terjawab' : 'Panggilan berakhir')
    : live ? (link === 'on' ? fmt(secs) : link === 'fail' ? 'Gagal tersambung' : 'Menyambungkan…')
    : call.role === 'caller' ? (phase === 'ringing' ? 'Berdering…' : 'Memanggil…') : call.kind === 'video' ? 'Panggilan video masuk' : 'Panggilan suara masuk';
  const dot = link === 'on' ? 'ok' : call.offline ? 'off' : ringing && call.role === 'caller' ? (phase === 'ringing' ? 'ring' : 'calling') : ringing ? 'ring' : '';
  const wa = call.whatsapp?.replace(/[^0-9]/g, '');

  const showVideo = live && remoteVideo;
  const sw = swapped && showVideo && cam;
  return <div className={`bixcall${showVideo ? ' is-video' : ''}${showVideo && hideUi ? ' is-hidden' : ''}`} role="dialog" aria-label="BIX CALL">
    <video ref={backV} className={`bixcall-back${showVideo && !fill ? " on" : ""}`} autoPlay playsInline muted aria-hidden="true"/>
    <video ref={remoteV} className={sw ? 'bixcall-pip is-peer' : `bixcall-remote${showVideo ? ' on' : ''}${fill ? '' : ' fit'}`} style={sw ? { transform: `translate(${pip.x}px, ${pip.y}px)` } : undefined} onPointerDown={sw ? dragPip : undefined} autoPlay playsInline onClick={() => { if (showVideo && !sw) setHideUi(v => !v); }} onDoubleClick={() => { if (!sw) setFill(v => !v); }}/>
    {showVideo && <button type="button" className="bixcall-fit" onClick={() => setFill(v => !v)} aria-label={fill ? 'Tampilkan utuh' : 'Penuhi layar'}>{fill ? '⤡ Sudut lega' : '⤢ Layar penuh'}</button>}
    <div ref={audioBox} aria-hidden="true" style={{ position: 'fixed', width: 1, height: 1, left: 0, bottom: 0, opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}/>
    {audioBlocked && live && <button type="button" className="bc-pill is-chat" style={{ position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 5 }} onClick={unlockAudio}><Volume2 size={16}/> Ketuk untuk dengar suara</button>}
    {live && link === 'on' && remoteVideo && !cam && <button type="button" className="bc-pill is-chat bc-vid-invite" onClick={() => void toggleCam()}><Video size={16}/> @{call.peerName} menyalakan video · Nyalakan video saya</button>}
    {live && cam && <button type="button" className="bixcall-flip" aria-label="Balik kamera" onClick={() => void flip()}><SwitchCamera size={18}/></button>}
    <header className="bixcall-head">
      <img src={foxLogo} alt="" className="bixcall-fox"/>
      <span>{live && link === 'on' ? `SOVEREIGN ENCRYPTED • 48 kHz ${anyVideo ? 'HD VIDEO' : 'HD VOICE'}` : 'BIX CALL • SOVEREIGN ENCRYPTED'}</span>
      {live && link === 'on' && <em className={`bc-q is-${quality}`} aria-label={`Kualitas jaringan: ${quality === 'excellent' ? 'sangat baik' : quality === 'good' ? 'baik' : quality === 'poor' ? 'lemah' : 'mengukur'}`}><i/><i/><i/></em>}
    </header>
    {!showVideo && <div className="bixcall-center">
      <div className={`bixcall-av${ringing && call.role === 'callee' ? ' is-buzz' : ''} is-${call.offline ? 'offline' : live && link === 'on' ? 'talking' : ringing ? (call.role === 'caller' ? phase : 'ringing') : 'idle'}`} style={live && link === 'on' ? { ['--lvl' as string]: Math.min(1, level * 3) } : undefined}>
        <span className="bixcall-av-ring" aria-hidden="true"/><span className="bixcall-av-ring r2" aria-hidden="true"/>
        <CallPeerPhoto peerId={call.peerId} name={call.peerName}/>
      </div>
      <h2>@{call.peerName}</h2>
      <p>{(live ? anyVideo : call.kind === 'video') ? 'Video Call' : 'Voice Call'} · BIX CALL{live && link === 'on' ? ` · ${loud ? 'Loudspeaker' : 'Speaker telinga'}` : ''}</p>
      {live && link === 'on' && <div className="bc-wave" aria-hidden="true">{[0.5, 0.8, 1, 0.7, 0.9, 0.6, 1, 0.75, 0.55].map((k, i) => <i key={i} style={{ transform: `scaleY(${0.12 + Math.min(1, level * 3) * k})` }}/>)}</div>}
      {call.offline && <div className="bc-offline" role="status"><b>Member belum aktif di BIXLINK</b><small>Panggilan tidak sampai ke perangkatnya. Kirim pesan agar dibaca saat ia kembali online.</small></div>}
    </div>}
    <div className="bixcall-status"><i className={dot}/>{statusText}</div>
    {howl && live && <div className="bc-howl" role="status">Pantulan suara diredam otomatis</div>}
    {cam && live && <video ref={localV} className={sw ? 'bixcall-remote on bixcall-self-big' : 'bixcall-pip'} style={sw ? { transform: `scaleX(${front ? -1 : 1})` } : { transform: `translate(${pip.x}px, ${pip.y}px) scaleX(${front ? -1 : 1})` }} onPointerDown={sw ? undefined : dragPip} onClick={() => { if (sw) setHideUi(v => !v); }} autoPlay playsInline muted/>}
    <footer className={`bixcall-ctl${call.offline ? ' is-offline' : ''}`}>
      {!live && !done && call.role === 'callee' && replyOpen && <div className="bc-replies">{['Maaf, sedang sibuk. Nanti saya hubungi kembali.', 'Sedang rapat, kirim pesan saja ya.', 'Saya telepon balik 5 menit lagi.'].map(t => <button type="button" key={t} onClick={() => void quickReply(t)}>{t}</button>)}</div>}
      {!live && !done && call.role === 'callee' && <button type="button" className="bc-reply-btn" onClick={() => setReplyOpen(v => !v)}><MessageCircle size={14}/> Tolak dengan pesan</button>}
      {!live && !done && call.role === 'callee' && <div className="bc-swipe-row">
        <SwipeKey tone="end" label="Tolak" onDone={onDecline} icon={<PhoneOff/>}/>
        <SwipeKey tone="accept" label="Terima" onDone={onAccept} icon={call.kind === 'video' ? <Video/> : <Phone/>}/>
      </div>}
      {!live && !done && call.role === 'caller' && <>
        {wa && <a className="wa" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" aria-label="Hubungi via WhatsApp"><MessageCircle/></a>}
        <button className="end" aria-label="Batalkan" onClick={onEnd}><PhoneOff/></button>
      </>}
      {live && <div className="bc-ctl4" onPointerDown={askTilt}>
        <label><button aria-label={mic ? 'Bisukan' : 'Nyalakan mikrofon'} className={mic ? '' : 'off'} onClick={() => void toggleMic()}>{mic ? <Mic/> : <MicOff/>}</button><span>{mic ? 'Mikrofon' : 'Bisu'}</span></label>
        <label><button aria-label={loud ? 'Loudspeaker aktif' : 'Nyalakan loudspeaker'} aria-pressed={loud} className={loud ? 'shield' : ''} onClick={speaker}>{loud ? <Volume2/> : <VolumeX/>}</button><span>{loud ? 'Speaker' : 'Telinga'}</span></label>
        <label><button aria-label={cam ? 'Matikan video' : 'Nyalakan video'} aria-pressed={cam} className={cam ? 'shield' : ''} onClick={() => void toggleCam()}>{cam ? <Video/> : <VideoOff/>}</button><span>{cam ? 'Video' : 'Video'}</span></label>
        <label><button className="end" aria-label="Akhiri" onClick={onEnd}><PhoneOff/></button><span>Akhiri</span></label>
      </div>}
      {call.offline ? <>
        <button type="button" className="bc-pill is-chat" onClick={openChat}><MessageCircle size={16}/> Kirim Pesan BIX CHAT</button>
        {wa && <a className="bc-pill is-wa" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"><Phone size={16}/> Hubungi WhatsApp</a>}
        <button type="button" className="bc-pill is-close" onClick={onClose}><X size={16}/> Tutup</button>
      </> : done && wa && <a className="wa" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" aria-label="Hubungi via WhatsApp"><MessageCircle/></a>}
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

/** Swipe-up key: drag the knob upward past the threshold to fire; tap-and-hold safe in pockets. Enter/Space also fires for accessibility. */
function SwipeKey({ tone, label, icon, onDone }: { tone: 'accept' | 'end'; label: string; icon: React.ReactNode; onDone: () => void }) {
  const [dy, setDy] = useState(0);
  const [drag, setDrag] = useState(false);
  const fired = useRef(false);
  const LIMIT = 120, FIRE = 80;
  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (fired.current) return;
    const y0 = e.clientY; setDrag(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => { const d = Math.max(0, Math.min(LIMIT, y0 - ev.clientY)); setDy(d); };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      setDrag(false);
      if (y0 - ev.clientY >= FIRE && !fired.current) { fired.current = true; setDy(LIMIT); try { navigator.vibrate?.(30); } catch { /* optional */ } onDone(); }
      else setDy(0);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };
  return <div className={`bc-swipe is-${tone}`}>
    <span className="bc-swipe-track" aria-hidden="true"><i/><i/><i/></span>
    <button type="button" className={`bc-swipe-knob${drag ? ' is-drag' : ''}`} style={{ transform: `translateY(${-dy}px)` }} aria-label={`Geser ke atas untuk ${label}`}
      onPointerDown={down} onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !fired.current) { e.preventDefault(); fired.current = true; onDone(); } }}>{icon}</button>
    <small>{label}</small>
  </div>;
}
