import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import fox from "@/assets/bixlink-fox.png";

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

function Studio() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <header>
        <Link to="/" className="text-xs text-muted-foreground">← BIXLINK</Link>
        <h1 className="mt-2 text-2xl font-black tracking-wide text-primary">BIX STUDIO</h1>
        <p className="text-sm text-muted-foreground">Banner promosi webinar dan presentasi bersuara untuk BIXZOOM. Gratis, dibuat langsung di perangkat Anda.</p>
      </header>
      <BannerMaker />
      <PresentationMaker />
    </main>
  );
}

function BannerMaker() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [f, setF] = useState({ title: "BIXZOOM Global Webinar", date: "Sunday, 25 Oct 2026", time: "20:00 WITA", speaker: "BIXLINK Leadership", size: "1080" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const w = f.size === "1080" ? 1080 : 1920, h = 1080;
    c.width = w; c.height = h;
    const g = c.getContext("2d")!;
    const bg = g.createRadialGradient(w / 2, h * 0.3, 50, w / 2, h / 2, w);
    bg.addColorStop(0, "#2a2210"); bg.addColorStop(0.6, "#0b0a08"); bg.addColorStop(1, "#000");
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const gold = g.createLinearGradient(0, 0, 0, h);
    gold.addColorStop(0, "#fff1b8"); gold.addColorStop(0.5, "#ffd700"); gold.addColorStop(1, "#a67c00");
    g.strokeStyle = gold; g.lineWidth = 6; g.strokeRect(30, 30, w - 60, h - 60);
    g.lineWidth = 1.5; g.strokeRect(48, 48, w - 96, h - 96);
    const img = new Image(); img.src = fox;
    const draw = () => {
      g.drawImage(img, w / 2 - 90, 110, 180, 180);
      g.textAlign = "center"; g.fillStyle = gold;
      g.font = "900 44px Cinzel, serif"; g.fillText("BIXLINK", w / 2, 350);
      g.font = "700 26px sans-serif"; g.fillStyle = "#e9d9a6"; g.fillText("BIXZOOM ROOM · LIVE WEBINAR", w / 2, 400);
      g.fillStyle = gold; g.font = `900 ${w > 1080 ? 92 : 74}px Cinzel, serif`;
      wrap(g, f.title.toUpperCase(), w / 2, 540, w - 180, w > 1080 ? 100 : 82);
      g.fillStyle = "#fff"; g.font = "600 40px sans-serif";
      g.fillText(`${f.date} · ${f.time}`, w / 2, 820);
      g.fillStyle = "#e9d9a6"; g.font = "500 32px sans-serif"; g.fillText(`Speaker: ${f.speaker}`, w / 2, 880);
      g.font = "400 20px sans-serif"; g.fillStyle = "#9b8a5a";
      g.fillText("© BIXLINK · Informational event. Not financial advice.", w / 2, h - 80);
    };
    if (img.complete) draw(); else img.onload = draw;
  }, [f]);

  const download = () => {
    const a = document.createElement("a");
    a.href = ref.current!.toDataURL("image/png"); a.download = "bixzoom-banner.png"; a.click();
  };

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-bold text-primary">1 · Banner promosi webinar</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={f.title} onChange={set("title")} placeholder="Judul webinar" maxLength={60} />
        <Input value={f.speaker} onChange={set("speaker")} placeholder="Pembicara" maxLength={40} />
        <Input value={f.date} onChange={set("date")} placeholder="Tanggal" maxLength={40} />
        <Input value={f.time} onChange={set("time")} placeholder="Jam" maxLength={30} />
        <select value={f.size} onChange={set("size")} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="1080">1080×1080 (Instagram/WhatsApp)</option>
          <option value="1920">1920×1080 (YouTube/X)</option>
        </select>
      </div>
      <canvas ref={ref} className="studio-canvas" />
      <Button onClick={download} className="w-full">Download PNG</Button>
    </section>
  );
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(" "); let line = ""; let yy = y;
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (g.measureText(t).width > max && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = t;
  }
  g.fillText(line, x, yy);
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

  const play = async () => {
    if (!slides.length) return;
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
      <h2 className="font-bold text-primary">2 · Presentasi bersuara dari teks panjang</h2>
      <p className="text-xs text-muted-foreground">Tempel naskah webinar. Setiap kalimat jadi satu slide yang dibacakan narator dengan musik latar lembut. Putar layar penuh lalu bagikan layar di BIXZOOM. Tanpa biaya kredit.</p>
      <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} maxLength={20000} placeholder="Tempel naskah webinar di sini..." />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={build}>Buat slide ({slides.length})</Button>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={music} onChange={(e) => setMusic(e.target.checked)} /> Musik latar</label>
        {i < 0 ? <Button onClick={play} disabled={!slides.length}>▶ Putar presentasi</Button> : <Button variant="destructive" onClick={stop}>■ Stop</Button>}
      </div>
      <div ref={stage} className="studio-stage">
        <div>
          <img src={fox} alt="" className="mx-auto mb-4 h-14 w-14" />
          <p key={i} className="studio-line text-xl font-bold leading-snug text-foreground sm:text-3xl">
            {i >= 0 ? slides[i] : slides[0] ?? "BIXLINK · BIXZOOM PRESENTATION"}
          </p>
          {i >= 0 && <p className="mt-4 text-xs text-muted-foreground">{i + 1} / {slides.length}</p>}
        </div>
      </div>
    </section>
  );
}
