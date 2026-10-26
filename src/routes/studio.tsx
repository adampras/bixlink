import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import fox from "@/assets/bixlink-fox.png";
import { LionCrest } from "@/components/BixZoom";
import { StudioProvider, StudioWalletBar, StudioOwnerPanel, useStudio } from "@/components/StudioCredits";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "BIX Studio — Webinar Banner & Presentation Maker" },
      { name: "description", content: "Create BIXZOOM webinar banners and narrated presentations from long text." },
      { property: "og:title", content: "BIX Studio — Webinar Banner & Presentation Maker" },
      { property: "og:description", content: "Create BIXZOOM webinar banners and narrated presentations from long text." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Studio,
});

const TOOLS = [
  { k: "poster", icon: "◆", t: "DESIGN POSTER", d: "Promotional banners and event posters — ready in 3 steps." },
  { k: "media", icon: "▶", t: "BIXZOOM MEDIA", d: "Play presentation videos and background audio for webinar streams." },
  { k: "flow", icon: "❖", t: "PRESENTATION FLOW", d: "Paste script to generate fullscreen slides with device voiceover." },
] as const;
type ToolKey = (typeof TOOLS)[number]["k"];

function Studio() {
  const [tool, setTool] = useState<ToolKey>("poster");
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <Link to="/" className="text-xs text-muted-foreground">← BIXLINK</Link>
      <header className="studio-hero">
        <span className="studio-lion mx-auto block w-fit"><LionCrest size={64}/></span>
        <p className="studio-kicker">BIXLINK ECOSYSTEM · CREATIVE UTILITY</p>
        <h1 className="studio-title">CREATE. PRESENT. LEAD.</h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">BIX Studio — Sovereign Creative Suite. Build professional collateral for your team with zero design experience required.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button onClick={() => document.getElementById("studio-tools")?.scrollIntoView({ behavior: "smooth" })}>Get Started</Button>
        </div>
        <ol className="studio-steps">
          <li><b>1</b> Select tool</li><li><b>2</b> Enter details</li><li><b>3</b> Download / present</li>
        </ol>
      </header>
      <StudioProvider>
        <StudioWalletBar />
        <StudioOwnerPanel />
        <div id="studio-tools" className="grid gap-3 sm:grid-cols-3">
          {TOOLS.map((x) => (
            <button key={x.k} onClick={() => setTool(x.k)} className={`studio-tool ${tool === x.k ? "is-active" : ""}`}>
              <span className="studio-tool-icon">{x.icon}</span>
              <span className="block text-sm font-bold tracking-wider text-primary">{x.t}</span>
              <span className="block text-xs text-muted-foreground">{x.d}</span>
            </button>
          ))}
        </div>
        {tool === "poster" && <BannerMaker />}
        {tool === "media" && <MediaPlayer />}
        {tool === "flow" && <PresentationMaker />}
      </StudioProvider>
    </main>
  );
}

const PURPOSES = [
  { n: "Launch", title: "BIXLINK Soft Launching", subtitle: "OFFICIAL ANNOUNCEMENT", tpl: "onyx" },
  { n: "Leader Training", title: "Leader Training Class", subtitle: "BIXLINK LEADERSHIP ACADEMY", tpl: "emerald" },
  { n: "BIXZOOM", title: "BIXZOOM Global Webinar", subtitle: "BIXZOOM ROOM · LIVE WEBINAR", tpl: "sapphire" },
  { n: "Marketplace", title: "BIXLINK Marketplace", subtitle: "NEW COLLECTION", tpl: "ruby" },
  { n: "Staking Education", title: "Understanding Staking", subtitle: "EDUCATION SESSION", tpl: "titanium" },
  { n: "Network Event", title: "BIXLINK Network Gathering", subtitle: "COMMUNITY EVENT", tpl: "emerald" },
] as const;

const TEMPLATES = {
  onyx: { name: "Obsidian Onyx Gold", bg: ["#2a2210", "#0b0a08", "#000"], accent: ["#fff1b8", "#ffd700", "#a67c00"], sub: "#e9d9a6" },
  sapphire: { name: "Cyber Sapphire", bg: ["#0d2a5c", "#071330", "#02060f"], accent: ["#e0f0ff", "#7cc4ff", "#2f6fd6"], sub: "#bcd8ff" },
  emerald: { name: "Imperial Emerald", bg: ["#0f4a33", "#062218", "#010a06"], accent: ["#fff1b8", "#ffd700", "#a67c00"], sub: "#b7f0d2" },
  ruby: { name: "Ruby VIP", bg: ["#5c0d1e", "#2a050d", "#0a0103"], accent: ["#fff1b8", "#ffd700", "#a67c00"], sub: "#ffc9d3" },
  titanium: { name: "Minimalist Titanium", bg: ["#3a3d42", "#1b1d20", "#0b0c0d"], accent: ["#ffffff", "#d7dbe0", "#8b9097"], sub: "#d7dbe0" },
} as const;
type TplKey = keyof typeof TEMPLATES;

const loadImg = (src: string) => new Promise<HTMLImageElement | null>((res) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src;
});

function BannerMaker() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [f, setF] = useState({ title: "BIXZOOM Global Webinar", subtitle: "BIXZOOM ROOM · LIVE WEBINAR", date: "Sunday, 25 Oct 2026", time: "20:00 WITA", speaker: "BIXLINK Leadership", size: "1080", tpl: "onyx" as TplKey, align: "center", dim: "55" });
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const pick = (cb: (u: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) cb(URL.createObjectURL(file));
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const c = ref.current; if (!c) return;
      const w = f.size === "1080" ? 1080 : f.size === "story" ? 1080 : 1920, h = f.size === "story" ? 1920 : 1080;
      const t = TEMPLATES[f.tpl];
      const [bgImg, logo] = await Promise.all([bgUrl ? loadImg(bgUrl) : null, loadImg(logoUrl ?? fox)]);
      if (!alive) return;
      c.width = w; c.height = h;
      const g = c.getContext("2d")!;
      const bg = g.createRadialGradient(w / 2, h * 0.3, 50, w / 2, h / 2, Math.max(w, h));
      bg.addColorStop(0, t.bg[0]); bg.addColorStop(0.6, t.bg[1]); bg.addColorStop(1, t.bg[2]);
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      if (bgImg) {
        const s = Math.max(w / bgImg.width, h / bgImg.height);
        g.drawImage(bgImg, (w - bgImg.width * s) / 2, (h - bgImg.height * s) / 2, bgImg.width * s, bgImg.height * s);
        g.fillStyle = `rgba(0,0,0,${Number(f.dim) / 100})`; g.fillRect(0, 0, w, h);
      }
      const gold = g.createLinearGradient(0, 0, 0, h);
      gold.addColorStop(0, t.accent[0]); gold.addColorStop(0.5, t.accent[1]); gold.addColorStop(1, t.accent[2]);
      g.strokeStyle = gold; g.lineWidth = 6; g.strokeRect(30, 30, w - 60, h - 60);
      g.lineWidth = 1.5; g.strokeRect(48, 48, w - 96, h - 96);
      const align = f.align as CanvasTextAlign;
      const x = align === "left" ? 110 : w / 2;
      const top = h === 1920 ? 360 : 110;
      if (logo) {
        const ls = 170, lw = ls * (logo.width / logo.height || 1);
        g.drawImage(logo, align === "left" ? x : x - lw / 2, top, lw, ls);
      }
      g.textAlign = align; g.fillStyle = gold;
      g.font = "900 44px Cinzel, serif"; g.fillText("BIXLINK", x, top + 240);
      g.font = "700 26px sans-serif"; g.fillStyle = t.sub; g.fillText(f.subtitle.toUpperCase(), x, top + 290);
      g.fillStyle = gold; g.font = `900 ${w > 1080 ? 92 : 74}px Cinzel, serif`;
      const endY = wrap(g, f.title.toUpperCase(), x, top + 430, w - 220, w > 1080 ? 100 : 82);
      g.fillStyle = "#fff"; g.font = "600 40px sans-serif";
      g.fillText(`${f.date} · ${f.time}`, x, endY + 140);
      g.fillStyle = t.sub; g.font = "500 32px sans-serif"; g.fillText(`Speaker: ${f.speaker}`, x, endY + 200);
      g.textAlign = "center"; g.font = "400 20px sans-serif"; g.fillStyle = t.sub;
      g.fillText("© BIXLINK · Informational event. Not financial advice.", w / 2, h - 80);
    })();
    return () => { alive = false; };
  }, [f, bgUrl, logoUrl]);

  const { charge } = useStudio();
  const download = async () => {
    if (!(await charge(f.size === "1080" ? "banner" : "poster"))) return;
    const a = document.createElement("a");
    a.href = ref.current!.toDataURL("image/png"); a.download = "bixzoom-banner.png"; a.click();
  };
  const sel = "h-11 rounded-md border border-input bg-background px-3 text-sm";
  const [step, setStep] = useState(1);
  const lbl = "text-xs font-semibold text-muted-foreground";

  return (
    <section className="studio-panel space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="studio-panel-title">DESIGN POSTER</h2>
        <span className="studio-badge">LIVE PREVIEW</span>
      </div>
      <div className="studio-progress">
        {["Purpose", "Details", "Layout"].map((s, n) => (
          <button key={s} onClick={() => setStep(n + 1)} className={step === n + 1 ? "is-active" : step > n + 1 ? "is-done" : ""}>{n + 1}. {s}</button>
        ))}
      </div>
      {step === 1 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PURPOSES.map((p) => (
            <button key={p.n} onClick={() => { setF({ ...f, title: p.title, subtitle: p.subtitle, tpl: p.tpl }); setStep(2); }} className={`studio-tool ${f.subtitle === p.subtitle ? "is-active" : ""}`}>
              <span className="block text-sm font-bold text-primary">{p.n}</span>
              <span className="block text-xs text-muted-foreground">{p.subtitle}</span>
            </button>
          ))}
        </div>
      )}
      {step === 2 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={lbl}>Title<Input value={f.title} onChange={set("title")} maxLength={80} /></label>
          <label className={lbl}>Subtitle<Input value={f.subtitle} onChange={set("subtitle")} maxLength={50} /></label>
          <label className={lbl}>Date<Input value={f.date} onChange={set("date")} maxLength={40} /></label>
          <label className={lbl}>Time<Input value={f.time} onChange={set("time")} maxLength={30} /></label>
          <label className={lbl}>Speaker<Input value={f.speaker} onChange={set("speaker")} maxLength={40} /></label>
          <label className={lbl}>Custom logo / photo
            <input type="file" accept="image/*" onChange={pick(setLogoUrl)} className="mt-1 block w-full text-xs" />
          </label>
        </div>
      )}
      {step === 3 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={lbl}>Color theme
            <select value={f.tpl} onChange={set("tpl")} className={`${sel} block w-full`}>
              {Object.entries(TEMPLATES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </label>
          <label className={lbl}>Dimensions
            <select value={f.size} onChange={set("size")} className={`${sel} block w-full`}>
              <option value="1080">Instagram / WhatsApp (1080×1080)</option>
              <option value="1920">YouTube / Zoom (1920×1080)</option>
              <option value="story">Story / Status (1080×1920)</option>
            </select>
          </label>
          <label className={lbl}>Text alignment
            <select value={f.align} onChange={set("align")} className={`${sel} block w-full`}>
              <option value="center">Center</option>
              <option value="left">Left</option>
            </select>
          </label>
          <label className={lbl}>Background image (optional)
            <input type="file" accept="image/*" onChange={pick(setBgUrl)} className="mt-1 block w-full text-xs" />
          </label>
          {bgUrl && <label className={`${lbl} sm:col-span-2`}>Background overlay ({f.dim}%)
            <input type="range" min="0" max="85" value={f.dim} onChange={set("dim")} className="block w-full" />
          </label>}
        </div>
      )}
      <canvas ref={ref} className="studio-canvas" />
      <div className="studio-sticky flex gap-2">
        {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">Back</Button>}
        {step < 3 ? <Button onClick={() => setStep(step + 1)} className="flex-1">Continue</Button>
          : <Button onClick={download} className="flex-1">Download HD PNG</Button>}
      </div>
    </section>
  );
}

function MediaPlayer() {
  const [video, setVideo] = useState("");
  const [music, setMusic] = useState("");
  const [vol, setVol] = useState(0.25);
  const v = useRef<HTMLVideoElement>(null);
  const a = useRef<HTMLAudioElement>(null);
  const file = (cb: (u: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) cb(URL.createObjectURL(f));
  };
  useEffect(() => { if (a.current) a.current.volume = vol; }, [vol, music]);
  const play = () => { v.current?.play().catch(() => {}); a.current?.play().catch(() => {}); };
  const pause = () => { v.current?.pause(); a.current?.pause(); };
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-bold text-primary">2 · Presentation Video & Audio Player</h2>
      <p className="text-xs text-muted-foreground">Stream pre-rendered presentation videos (MP4) and authentic audio tracks (MP3) without synthetic voice artifacts. Upload locally or provide a direct link (https).</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">Video (MP4)
          <input type="file" accept="video/*" onChange={file(setVideo)} className="mt-1 block w-full text-xs" />
        </label>
        <label className="text-xs text-muted-foreground">Audio (MP3)
          <input type="file" accept="audio/*" onChange={file(setMusic)} className="mt-1 block w-full text-xs" />
        </label>
        <Input placeholder="or video direct link https://...mp4" onBlur={(e) => e.target.value.startsWith("https://") && setVideo(e.target.value)} />
        <Input placeholder="or audio direct link https://...mp3" onBlur={(e) => e.target.value.startsWith("https://") && setMusic(e.target.value)} />
      </div>
      {video ? <video ref={v} src={video} controls playsInline className="w-full rounded-xl bg-background" /> : <div className="studio-stage"><span className="studio-lion mx-auto block w-fit"><LionCrest size={60}/></span></div>}
      {music && <audio ref={a} src={music} loop />}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={play} disabled={!video && !music}>▶ Sync Play</Button>
        <Button variant="outline" onClick={pause}>❚❚ Pause</Button>
        <Button variant="outline" onClick={() => v.current?.requestFullscreen?.()} disabled={!video}>Fullscreen</Button>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">Music
          <input type="range" min="0" max="1" step="0.05" value={vol} onChange={(e) => setVol(Number(e.target.value))} />
        </label>
      </div>
    </section>
  );
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number): number {
  const words = text.split(" "); let line = ""; let yy = y;
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (g.measureText(t).width > max && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = t;
  }
  g.fillText(line, x, yy);
  return yy;
}

function PresentationMaker() {
  const [text, setText] = useState("");
  const [slides, setSlides] = useState<string[]>([]);
  const [i, setI] = useState(-1);
  const [music, setMusic] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const stopRef = useRef(false);

  const build = () => setSlides(text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean).slice(0, 300));

  const startMusic = () => {
    const ctx = new AudioContext(); audio.current = ctx;
    const master = ctx.createGain(); master.gain.value = 0.05; master.connect(ctx.destination);
    [130.81, 196, 261.63, 329.63].forEach((hz) => {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = hz;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08; const lg = ctx.createGain(); lg.gain.value = 0.4;
      lfo.connect(lg); const g = ctx.createGain(); g.gain.value = 0.5; lg.connect(g.gain);
      o.connect(g).connect(master); o.start(); lfo.start();
    });
  };

  const stop = () => {
    stopRef.current = true; speechSynthesis.cancel(); audio.current?.close(); audio.current = null; setI(-1);
    if (document.fullscreenElement) document.exitFullscreen();
  };

  const { charge } = useStudio();
  const play = async () => {
    if (!slides.length) return;
    if (!(await charge("presentation"))) return;
    stopRef.current = false;
    await stage.current?.requestFullscreen?.().catch(() => {});
    if (music) startMusic();
    const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith("id")) ?? null;
    for (let n = 0; n < slides.length && !stopRef.current; n++) {
      setI(n);
      await new Promise<void>((res) => {
        const u = new SpeechSynthesisUtterance(slides[n]);
        if (voice) u.voice = voice; u.rate = 0.95; u.onend = () => res(); u.onerror = () => res();
        speechSynthesis.speak(u);
      });
    }
    if (!stopRef.current) stop();
  };

  useEffect(() => () => stop(), []);

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-bold text-primary">3 · Narrated Slides from Long-Form Script</h2>
      <p className="text-xs text-muted-foreground">Paste webinar script. Each sentence converts into an individual slide narrated with ambient background sound. Present in fullscreen and screen-share in BIXZOOM. Zero credit cost.</p>
      <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} maxLength={20000} placeholder="Paste webinar script here..." />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={build}>Generate Slides ({slides.length})</Button>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={music} onChange={(e) => setMusic(e.target.checked)} /> Background Music</label>
        {i < 0 ? <Button onClick={play} disabled={!slides.length}>▶ Start Presentation</Button> : <Button variant="destructive" onClick={stop}>■ Stop</Button>}
      </div>
      <div ref={stage} className="studio-stage">
        <div>
          <span className="studio-lion mx-auto mb-4 block w-fit"><LionCrest size={60}/></span>
          <p key={i} className="studio-line text-xl font-bold leading-snug text-foreground sm:text-3xl">
            {i >= 0 ? slides[i] : slides[0] ?? "BIXLINK · BIXZOOM PRESENTATION"}
          </p>
          {i >= 0 && <p className="mt-4 text-xs text-muted-foreground">{i + 1} / {slides.length}</p>}
        </div>
      </div>
    </section>
  );
}
