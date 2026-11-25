import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, type Participant } from "livekit-client";
import { useServerFn } from "@tanstack/react-start";
import { Mic, MicOff, Video, VideoOff, MonitorUp, Users, MessageSquare, Hand, PictureInPicture2, Copy, Check, SwitchCamera, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBixRoomToken } from "@/lib/bix-call.functions";
import { copyText } from "@/lib/copy-text";

type Msg = { id: string; from: string; text: string };
type Info = { title: string; isHost: boolean; id: string };

function Tile({ p, big }: { p: Participant; big?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const pub = p.getTrackPublication(Track.Source.ScreenShare) ?? p.getTrackPublication(Track.Source.Camera);
  const track = pub && !pub.isMuted ? pub.track : undefined;
  useEffect(() => { const el = ref.current; if (track && el) { track.attach(el); return () => { track.detach(el); }; } return undefined; }, [track]);
  const muted = p.getTrackPublication(Track.Source.Microphone)?.isMuted ?? true;
  return (
    <div data-zoom-tile={p.identity} className={`relative overflow-hidden rounded-xl bg-card ${big ? "h-full" : "aspect-video"} ${p.isSpeaking ? "ring-2 ring-[#22c55e]" : "ring-1 ring-border"}`}>
      {track ? <video ref={ref} autoPlay playsInline muted={p.isLocal} className={`h-full w-full ${pub?.source === Track.Source.ScreenShare ? "object-contain" : "object-cover"}`} />
        : <div className="grid h-full w-full place-items-center"><span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-2xl font-black text-primary-foreground">{(p.name || "M")[0]?.toUpperCase()}</span></div>}
      <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-background/70 px-1.5 py-0.5 text-[11px]">{muted && <MicOff size={11} />}{p.name || "Member"}{p.isLocal ? " (Anda)" : ""}</span>
    </div>
  );
}

export function ZoomRoom({ code, me, startShare, onLeave }: { code: string; me: string; startShare: boolean; onLeave: () => void }) {
  const getToken = useServerFn(getBixRoomToken);
  const roomRef = useRef<Room | null>(null);
  const audioBox = useRef<HTMLDivElement>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [people, setPeople] = useState<Participant[]>([]);
  const [, tick] = useState(0);
  const [mic, setMic] = useState(true), [cam, setCam] = useState(false), [share, setShare] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [panel, setPanel] = useState<"none" | "people" | "chat">("none");
  const [msgs, setMsgs] = useState<Msg[]>([]), [draft, setDraft] = useState(""), [unread, setUnread] = useState(0);
  const [hands, setHands] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState(""), [copied, setCopied] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const pipVideo = useRef<HTMLVideoElement | null>(null);
  const panelRef = useRef(panel); panelRef.current = panel;

  useEffect(() => {
    let room: Room | null = null; let dead = false;
    void (async () => {
      try {
        const res = await getToken({ data: { code } }); if (dead) return;
        setInfo({ title: res.title, isHost: res.isHost, id: res.id });
        room = new Room({ adaptiveStream: false, dynacast: true }); roomRef.current = room;
        const sync = () => { setPeople([room!.localParticipant, ...Array.from(room!.remoteParticipants.values())]); tick((n) => n + 1); };
        room.on(RoomEvent.ParticipantConnected, sync).on(RoomEvent.ParticipantDisconnected, sync).on(RoomEvent.TrackMuted, sync).on(RoomEvent.TrackUnmuted, sync)
          .on(RoomEvent.LocalTrackPublished, sync).on(RoomEvent.LocalTrackUnpublished, sync).on(RoomEvent.TrackUnsubscribed, sync).on(RoomEvent.ActiveSpeakersChanged, sync)
          .on(RoomEvent.TrackSubscribed, (t) => { if (t.kind === Track.Kind.Audio) audioBox.current?.appendChild(t.attach()); sync(); })
          .on(RoomEvent.Disconnected, () => { if (!dead) onLeave(); })
          .on(RoomEvent.DataReceived, (p, who) => {
            try {
              const m = JSON.parse(new TextDecoder().decode(p)) as { hand?: boolean; muteAll?: boolean; end?: boolean; chat?: string; id?: string };
              if (m.muteAll) { void room?.localParticipant.setMicrophoneEnabled(false); setMic(false); }
              if (m.end) { void room?.disconnect(); }
              if (who && typeof m.hand === "boolean") setHands((h) => ({ ...h, [who.identity]: m.hand! }));
              if (who && m.chat) { setMsgs((x) => [...x, { id: m.id ?? String(Date.now()), from: who.name || "Member", text: m.chat!.slice(0, 500) }].slice(-200)); if (panelRef.current !== "chat") setUnread((u) => u + 1); }
            } catch { /* ignore */ }
          });
        await room.connect(res.url, res.token);
        await room.localParticipant.setMicrophoneEnabled(true, { echoCancellation: true, noiseSuppression: true, autoGainControl: true });
        if (startShare) { try { await room.localParticipant.setScreenShareEnabled(true, { audio: true }); setShare(true); } catch { /* user cancelled */ } }
        sync();
      } catch (e) { setErr(e instanceof Error ? e.message : "Gagal bergabung"); }
    })();
    return () => { dead = true; void room?.disconnect(); roomRef.current = null; };
  }, [code, getToken, startShare, onLeave]);

  // Keep meeting alive in the background: media session + wake lock + auto picture-in-picture.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    const grab = () => { if (wl && document.visibilityState === "visible") wl.request("screen").then((l) => { lock = l; }).catch(() => {}); };
    grab();
    const ms = navigator.mediaSession;
    if (ms) {
      ms.metadata = new MediaMetadata({ title: "BIXZOOM · Rapat sedang berlangsung", artist: info?.title ?? "BIXLINK" });
      ms.playbackState = "playing";
      try { ms.setActionHandler("hangup" as MediaSessionAction, () => onLeave()); } catch { /* */ }
      try { ms.setActionHandler("togglemicrophone" as MediaSessionAction, () => void toggleMicRef.current()); } catch { /* */ }
      try { ms.setActionHandler("enterpictureinpicture" as MediaSessionAction, () => void pipRef.current()); } catch { /* */ }
    }
    const onVis = () => { if (document.visibilityState === "hidden") void pipRef.current(true); else grab(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); void lock?.release(); if (ms) { ms.metadata = null; ms.playbackState = "none"; } };
  }, [info?.title, onLeave]);

  const send = (o: object) => void roomRef.current?.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(o)), { reliable: true });
  const toggleMic = async () => { const n = !mic; await roomRef.current?.localParticipant.setMicrophoneEnabled(n); setMic(n); };
  const toggleMicRef = useRef(toggleMic); toggleMicRef.current = toggleMic;
  const toggleCam = async () => { const n = !cam; try { await roomRef.current?.localParticipant.setCameraEnabled(n, { facingMode: facing, resolution: { width: 1280, height: 720, frameRate: 24 } }); setCam(n); } catch { setErr("Kamera tidak bisa dibuka."); } };
  const flip = async () => { const f = facing === "user" ? "environment" : "user"; setFacing(f); const lp = roomRef.current?.localParticipant; if (lp && cam) { await lp.setCameraEnabled(false); await lp.setCameraEnabled(true, { facingMode: f }); } };
  const toggleShare = async () => { const n = !share; try { await roomRef.current?.localParticipant.setScreenShareEnabled(n, { audio: true }); setShare(n); } catch { setErr("Bagi layar tidak didukung di perangkat ini."); } };
  const hand = () => { const n = !hands[me]; setHands((h) => ({ ...h, [me]: n })); send({ hand: n }); };
  const sendChat = () => { const t = draft.trim(); if (!t) return; const id = crypto.randomUUID(); send({ chat: t, id }); setMsgs((x) => [...x, { id, from: "Anda", text: t }]); setDraft(""); };
  const endAll = async () => { send({ end: true }); if (info) await supabase.from("bix_call_rooms").update({ status: "closed" }).eq("id", info.id); onLeave(); };
  const invite = async () => { if (await copyText(`${window.location.origin}/studio?room=${code}`)) { setCopied(true); setTimeout(() => setCopied(false), 1800); } };

  const pip = async (auto = false) => {
    if (document.pictureInPictureElement) { if (!auto) await document.exitPictureInPicture().catch(() => {}); return; }
    const vids = Array.from(document.querySelectorAll<HTMLVideoElement>("[data-zoom-main] video, [data-zoom-tile] video"));
    const v = vids.find((x) => x.srcObject) ?? pipVideo.current;
    if (!v || !document.pictureInPictureEnabled) { if (!auto) setErr("Mode melayang butuh video aktif di layar."); return; }
    await v.requestPictureInPicture().catch(() => { if (!auto) setErr("Mode melayang tidak didukung browser ini."); });
  };
  const pipRef = useRef(pip); pipRef.current = pip;

  const sharer = people.find((p) => p.getTrackPublication(Track.Source.ScreenShare)?.track);
  const main = sharer ?? people.find((p) => p.isSpeaking && !p.isLocal) ?? people.find((p) => !p.isLocal) ?? people[0];
  const btn = "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px]";

  if (err && !info) return <div className="grid min-h-[60vh] place-items-center p-6 text-center"><div><p className="mb-3 text-sm text-destructive">{err}</p><button type="button" className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground" onClick={onLeave}>Kembali</button></div></div>;
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background text-foreground">
      <div ref={audioBox} hidden />
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0 flex-1"><b className="block truncate text-sm">{info?.title ?? "Menghubungkan…"}</b><small className="font-mono text-[11px] text-muted-foreground">ID {code} · {people.length} peserta</small></div>
        <button type="button" onClick={() => void invite()} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Tersalin" : "Undang"}</button>
        <button type="button" onClick={() => setSpeaker((v) => !v)} className="rounded-lg border border-border px-2 py-1 text-xs">{speaker ? "Galeri" : "Speaker"}</button>
        <button type="button" onClick={onLeave} className="rounded-lg bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">Keluar</button>
      </header>
      {err && <p className="bg-destructive/15 px-3 py-1 text-xs text-destructive" onClick={() => setErr("")}>{err}</p>}
      <div className="relative min-h-0 flex-1 overflow-y-auto p-2">
        {speaker && main ? (
          <div className="flex h-full flex-col gap-2">
            <div data-zoom-main className="min-h-0 flex-1"><Tile p={main} big /></div>
            <div className="flex gap-2 overflow-x-auto">{people.filter((p) => p !== main).map((p) => <div key={p.identity} className="w-28 shrink-0"><Tile p={p} /></div>)}</div>
          </div>
        ) : (
          <div className={`grid gap-2 ${people.length <= 1 ? "grid-cols-1" : people.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>{people.map((p) => <Tile key={p.identity} p={p} />)}</div>
        )}
        {panel !== "none" && (
          <aside className="absolute inset-x-0 bottom-0 top-1/3 flex flex-col rounded-t-2xl border-t border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-3 py-2"><b className="text-sm">{panel === "chat" ? "Chat rapat" : `Peserta (${people.length})`}</b><button type="button" aria-label="Tutup" onClick={() => setPanel("none")}><X size={18} /></button></div>
            {panel === "people" ? (
              <ul className="flex-1 overflow-y-auto p-2">{people.map((p) => <li key={p.identity} className="flex items-center gap-2 py-1.5 text-sm"><span className="flex-1">{p.name || "Member"}{p.isLocal ? " (Anda)" : ""}</span>{hands[p.identity] && <Hand size={14} className="text-[#ffd700]" />}{(p.getTrackPublication(Track.Source.Microphone)?.isMuted ?? true) ? <MicOff size={14} /> : <Mic size={14} />}{p.getTrackPublication(Track.Source.Camera)?.isMuted === false ? <Video size={14} /> : <VideoOff size={14} />}</li>)}
                {info?.isHost && <li className="mt-3 flex gap-2"><button type="button" className="flex-1 rounded-lg border border-border py-2 text-xs" onClick={() => send({ muteAll: true })}>Mute semua</button><button type="button" className="flex-1 rounded-lg bg-destructive py-2 text-xs font-bold text-destructive-foreground" onClick={() => void endAll()}>Akhiri untuk semua</button></li>}
              </ul>
            ) : (
              <>
                <div className="flex-1 space-y-1.5 overflow-y-auto p-3">{msgs.length === 0 && <p className="text-xs text-muted-foreground">Belum ada pesan.</p>}{msgs.map((m) => <p key={m.id} className="text-sm"><b className="text-primary">{m.from}: </b>{m.text}</p>)}</div>
                <form className="flex gap-2 border-t border-border p-2" onSubmit={(e) => { e.preventDefault(); sendChat(); }}><input className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm" maxLength={500} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Tulis pesan…" /><button className="rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground">Kirim</button></form>
              </>
            )}
          </aside>
        )}
      </div>
      <nav className="flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
        <button type="button" className={btn} onClick={() => void toggleMic()}>{mic ? <Mic size={20} /> : <MicOff size={20} className="text-destructive" />}{mic ? "Mute" : "Unmute"}</button>
        <button type="button" className={btn} onClick={() => void toggleCam()}>{cam ? <Video size={20} /> : <VideoOff size={20} className="text-destructive" />}{cam ? "Stop Video" : "Video"}</button>
        {cam && <button type="button" className={btn} onClick={() => void flip()}><SwitchCamera size={20} />Balik</button>}
        <button type="button" className={btn} onClick={() => void toggleShare()}><MonitorUp size={20} className={share ? "text-[#22c55e]" : ""} />{share ? "Stop Share" : "Share"}</button>
        <button type="button" className={btn} onClick={() => setPanel(panel === "people" ? "none" : "people")}><Users size={20} />Peserta</button>
        <button type="button" className={`${btn} relative`} onClick={() => { setPanel(panel === "chat" ? "none" : "chat"); setUnread(0); }}><MessageSquare size={20} />Chat{unread > 0 && <i className="absolute right-2 top-1 rounded-full bg-destructive px-1 text-[9px] not-italic text-destructive-foreground">{unread}</i>}</button>
        <button type="button" className={btn} onClick={hand}><Hand size={20} className={hands[me] ? "text-[#ffd700]" : ""} />Tangan</button>
        <button type="button" className={btn} onClick={() => void pip()}><PictureInPicture2 size={20} />Melayang</button>
      </nav>
    </div>
  );
}
