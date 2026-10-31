import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getBixtokLiveToken } from '@/lib/bixtok-livekit.functions';

/**
 * Peer-to-peer LIVE video/audio for BIXTOK.
 * The host sends its camera + microphone directly to each viewer over WebRTC;
 * the shared realtime room only carries the connection handshake.
 */
const ICE: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
};

export type RtcState = 'waiting' | 'connecting' | 'live' | 'failed';
type Sig = { to?: string; from: string; sdp?: RTCSessionDescriptionInit; c?: RTCIceCandidateInit };

function useP2pRtc({ liveId, me, host, stream, enabled }: { liveId: string; me: string; host: boolean; stream: MediaStream | null; enabled: boolean }) {
  const [remote, setRemote] = useState<MediaStream | null>(null);
  const [state, setState] = useState<RtcState>(host ? 'live' : 'waiting');
  const streamRef = useRef(stream); streamRef.current = stream;
  const pcs = useRef(new Map<string, RTCPeerConnection>());
  const queued = useRef(new Map<string, RTCIceCandidateInit[]>());
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ready = useRef(false); const offeredAt = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;
    if (typeof RTCPeerConnection === 'undefined') { setState('failed'); return undefined; }
    const ch = supabase.channel(`bixtok-rtc-${liveId}`, { config: { broadcast: { self: false } } });
    chanRef.current = ch;
    const send = (event: string, payload: Sig) => { void ch.send({ type: 'broadcast', event, payload }); };
    const drop = (peer: string) => { pcs.current.get(peer)?.close(); pcs.current.delete(peer); queued.current.delete(peer); };
    const flushIce = async (peer: string, pc: RTCPeerConnection) => {
      for (const c of queued.current.get(peer) ?? []) await pc.addIceCandidate(c).catch(() => {});
      queued.current.delete(peer);
    };
    const makePc = (peer: string) => {
      drop(peer);
      const pc = new RTCPeerConnection(ICE);
      pcs.current.set(peer, pc);
      pc.onicecandidate = e => { if (e.candidate) send('ice', { to: peer, from: me, c: e.candidate.toJSON() }); };
      return pc;
    };

    // ---- host: offer the camera to every viewer that says hello ----
    const offerTo = async (peer: string) => {
      const s = streamRef.current; if (!s) return;
      const pc = makePc(peer);
      s.getTracks().forEach(t => {
        const sender = pc.addTrack(t, s);
        if (t.kind !== 'video') return;
        // Keep the backup connection sharp too: hold resolution, allow up to 2.5 Mbps.
        const p = sender.getParameters(); p.degradationPreference = 'maintain-resolution';
        p.encodings = (p.encodings?.length ? p.encodings : [{}]).map(e => ({ ...e, maxBitrate: 2_500_000, maxFramerate: 30 }));
        void sender.setParameters(p).catch(() => {});
      });
      pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') drop(peer); };
      await pc.setLocalDescription(await pc.createOffer());
      send('offer', { to: peer, from: me, sdp: pc.localDescription!.toJSON() });
    };

    // ---- viewer: say hello until the host's video arrives ----
    let retry: ReturnType<typeof setInterval> | undefined;
    const hello = () => send('hello', { from: me });
    const answer = async (p: Sig) => {
      const pc = makePc(p.from); setState('connecting'); offeredAt.current = Date.now();
      pc.ontrack = e => { setRemote(e.streams[0] ?? new MediaStream([e.track])); };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setState('live');
        if (pc.connectionState === 'failed') { setState('failed'); drop(p.from); }
        if (pc.connectionState === 'disconnected') setState('connecting');
      };
      await pc.setRemoteDescription(p.sdp!);
      await flushIce(p.from, pc);
      await pc.setLocalDescription(await pc.createAnswer());
      send('answer', { to: p.from, from: me, sdp: pc.localDescription!.toJSON() });
    };

    ch.on('broadcast', { event: 'hello' }, ({ payload }) => { if (host && payload?.from) void offerTo(String(payload.from)).catch(() => {}); })
      .on('broadcast', { event: 'host-ready' }, () => { if (!host) hello(); })
      .on('broadcast', { event: 'offer' }, ({ payload }) => { if (!host && payload?.to === me) void answer(payload as Sig).catch(() => setState('failed')); })
      .on('broadcast', { event: 'answer' }, ({ payload }) => {
        const p = payload as Sig; if (!host || p.to !== me) return;
        const pc = pcs.current.get(p.from); if (!pc || !p.sdp) return;
        void pc.setRemoteDescription(p.sdp).then(() => flushIce(p.from, pc)).catch(() => {});
      })
      .on('broadcast', { event: 'ice' }, ({ payload }) => {
        const p = payload as Sig; if (p.to !== me || !p.c) return;
        const pc = pcs.current.get(p.from);
        if (pc?.remoteDescription) void pc.addIceCandidate(p.c).catch(() => {});
        else queued.current.set(p.from, [...(queued.current.get(p.from) ?? []), p.c]);
      })
      .on('broadcast', { event: 'bye' }, ({ payload }) => {
        const from = String(payload?.from ?? ''); drop(from);
        if (!host) { setRemote(null); setState('waiting'); }
      })
      .subscribe(s => {
        if (s !== 'SUBSCRIBED') return;
        ready.current = true;
        if (host) { if (streamRef.current) send('host-ready', { from: me }); return; }
        hello();
        retry = setInterval(() => {
          // Re-ask only when there is no usable connection (none yet, or it failed/closed).
          const pc = [...pcs.current.values()][0];
          const st = pc?.connectionState;
          const stalled = pc && st !== 'connected' && Date.now() - (offeredAt.current || 0) > 12000;
          if (!pc || st === 'failed' || st === 'closed' || stalled) hello();
        }, 6000);
      });

    return () => {
      clearInterval(retry);
      void ch.send({ type: 'broadcast', event: 'bye', payload: { from: me } });
      pcs.current.forEach(pc => pc.close()); pcs.current.clear(); queued.current.clear();
      ready.current = false; chanRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [liveId, me, host, enabled]);

  // Host camera changed (first start or flip): swap tracks for connected viewers, announce readiness.
  useEffect(() => {
    if (!enabled || !host || !stream) return;
    pcs.current.forEach(pc => {
      pc.getSenders().forEach(sender => {
        const next = stream.getTracks().find(t => t.kind === sender.track?.kind);
        if (next) void sender.replaceTrack(next).catch(() => {});
      });
    });
    if (ready.current) void chanRef.current?.send({ type: 'broadcast', event: 'host-ready', payload: { from: me } });
  }, [host, stream, me, enabled]);

  return { remote, state };
}

export type RemoteFeed = { id: string; stream: MediaStream };

/**
 * LIVE media: LiveKit Cloud relays host + approved guest video/audio to every viewer (mobile-friendly, scales).
 * Audio plays through dedicated <audio> elements (reliable on iPhone/Android); video streams are returned per participant.
 * Falls back to direct peer-to-peer (host only) when LiveKit is not configured or unreachable.
 */
export function useLiveRtc({ liveId, me, host, hostId, publisher, stream, saver = false }: { liveId: string; me: string; host: boolean; hostId: string; publisher: boolean; stream: MediaStream | null; saver?: boolean }) {
  const saverRef = useRef(saver); saverRef.current = saver;
  const [mode, setMode] = useState<'pending' | 'lk' | 'p2p'>('pending');
  const [feeds, setFeeds] = useState<RemoteFeed[]>([]);
  const [state, setState] = useState<RtcState>(host ? 'live' : 'waiting');
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [voiceOnly, setVoiceOnly] = useState(false);
  const soundOn = useRef(true);
  const roomRef = useRef<import('livekit-client').Room | null>(null);
  const streamRef = useRef(stream); streamRef.current = stream;
  const published = useRef(new Map<string, import('livekit-client').LocalTrackPublication>());
  const audioBox = useRef<HTMLDivElement | null>(null);

  const publish = async () => {
    const room = roomRef.current; const s = streamRef.current; if (!room || !publisher || !s) return;
    const lk = await import('livekit-client');
    for (const t of s.getTracks()) {
      const old = published.current.get(t.kind);
      if (old?.track) { if (old.track.mediaStreamTrack !== t) await old.track.replaceTrack(t).catch(() => {}); continue; }
      if (t.kind === 'video' && 'contentHint' in t) t.contentHint = 'detail';
      const pub = await room.localParticipant.publishTrack(t, t.kind === 'video' ? { source: lk.Track.Source.Camera, simulcast: true, videoCodec: 'vp8', degradationPreference: 'maintain-resolution', videoEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 } } : { source: lk.Track.Source.Microphone, dtx: true, red: true })
        .catch(() => room.localParticipant.publishTrack(t, { source: t.kind === 'video' ? lk.Track.Source.Camera : lk.Track.Source.Microphone }).catch(() => null));
      if (pub) published.current.set(t.kind, pub);
    }
  };

  useEffect(() => {
    let dead = false; let room: import('livekit-client').Room | null = null;
    const box = document.createElement('div'); box.style.display = 'none'; document.body.appendChild(box); audioBox.current = box;
    (async () => {
      try {
        const res = await getBixtokLiveToken({ data: { liveId } });
        if (dead) return;
        if (!res.ok) { setMode('p2p'); return; }
        const lk = await import('livekit-client');
        room = new lk.Room({ adaptiveStream: false, dynacast: true });
        roomRef.current = room;
        const rebuild = () => {
          const out: RemoteFeed[] = []; let heard = false;
          room!.remoteParticipants.forEach(p => {
            const vids: MediaStreamTrack[] = [];
            p.trackPublications.forEach(pub => { if (pub.track && pub.kind === lk.Track.Kind.Video) vids.push(pub.track.mediaStreamTrack); });
            if (vids.length) out.push({ id: p.identity, stream: new MediaStream(vids) });
            p.trackPublications.forEach(pub => { if (pub.track && pub.kind === lk.Track.Kind.Audio) heard = true; });
          });
          out.sort((a, b) => (a.id === hostId ? -1 : b.id === hostId ? 1 : 0));
          setFeeds(out);
          if (!host) setState(out.length || heard ? 'live' : 'waiting');
          setVoiceOnly(!out.length && heard);
        };
        room.on(lk.RoomEvent.TrackSubscribed, (track, pub) => {
          if (track.kind === lk.Track.Kind.Audio) { const el = track.attach(); el.setAttribute('playsinline', ''); el.muted = !soundOn.current; box.appendChild(el); if (room!.canPlaybackAudio) void el.play().catch(() => setAudioBlocked(true)); }
          else pub.setVideoQuality(saverRef.current ? lk.VideoQuality.LOW : lk.VideoQuality.HIGH); // data saver picks the light layer
          rebuild();
        }).on(lk.RoomEvent.TrackUnsubscribed, (track) => { track.detach().forEach(el => el.remove()); rebuild(); })
          .on(lk.RoomEvent.ParticipantDisconnected, rebuild)
          .on(lk.RoomEvent.TrackMuted, rebuild).on(lk.RoomEvent.TrackUnmuted, rebuild)
          .on(lk.RoomEvent.AudioPlaybackStatusChanged, () => setAudioBlocked(!room!.canPlaybackAudio))
          .on(lk.RoomEvent.Reconnecting, () => { if (!host) setState('connecting'); })
          .on(lk.RoomEvent.Reconnected, rebuild);
        if (!host) setState('connecting');
        await room.connect(res.url, res.token);
        if (dead) { void room.disconnect(); return; }
        setMode('lk');
        setAudioBlocked(!room.canPlaybackAudio);
        if (publisher) await publish();
        rebuild();
      } catch {
        if (!dead) { void room?.disconnect(); roomRef.current = null; setMode('p2p'); }
      }
    })();
    return () => { dead = true; published.current.clear(); void room?.disconnect(); roomRef.current = null; box.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId, host, publisher]);

  useEffect(() => { if (mode === 'lk' && publisher && stream) void publish(); }, [mode, publisher, stream]);

  /** Must run inside a tap: unlocks LiveKit audio + every attached <audio>. */
  const unlockAudio = async () => {
    await roomRef.current?.startAudio().catch(() => {});
    audioBox.current?.querySelectorAll('audio').forEach(a => { a.muted = false; void a.play().catch(() => {}); });
    if (roomRef.current) setAudioBlocked(!roomRef.current.canPlaybackAudio);
  };
  const setVolume = (on: boolean) => { soundOn.current = on; audioBox.current?.querySelectorAll('audio').forEach(a => { a.muted = !on; }); };

  const p2p = useP2pRtc({ liveId, me, host, stream, enabled: mode === 'p2p' });
  useEffect(() => {
    const room = roomRef.current; if (!room || host) return;
    void import('livekit-client').then(lk => room.remoteParticipants.forEach(p => p.trackPublications.forEach(pub => {
      if (pub.kind === lk.Track.Kind.Video && 'setVideoQuality' in pub) (pub as import('livekit-client').RemoteTrackPublication).setVideoQuality(saver ? lk.VideoQuality.LOW : lk.VideoQuality.HIGH);
    })));
  }, [saver, host, feeds.length]);
  if (mode === 'p2p') return { mode, feeds: p2p.remote ? [{ id: hostId, stream: p2p.remote }] : [], state: p2p.state, audioBlocked: false, voiceOnly: false, unlockAudio, setVolume };
  return { mode, feeds, state, audioBlocked, voiceOnly, unlockAudio, setVolume };
}
