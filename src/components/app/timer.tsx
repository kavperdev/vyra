"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Minus, Pause, Play, Plus, RotateCcw, X } from "lucide-react";
import { Portal } from "@/components/app/sheet";
import { cn } from "@/lib/utils";

type Cfg = { warm: number; work: number; rest: number; reps: number };
const PRESETS: { name: string; cfg: Cfg }[] = [
  { name: "30/30", cfg: { warm: 10, work: 30, rest: 30, reps: 10 } },
  { name: "Fartlek 1/1", cfg: { warm: 10, work: 60, rest: 60, reps: 8 } },
  { name: "20 s / 90 s", cfg: { warm: 10, work: 20, rest: 90, reps: 6 } },
  { name: "Podbiegi 12 s", cfg: { warm: 10, work: 12, rest: 90, reps: 8 } },
  { name: "Bieg/marsz", cfg: { warm: 10, work: 60, rest: 120, reps: 8 } },
];

const mmss = (s: number) => {
  const x = Math.max(0, Math.ceil(s));
  return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, "0")}`;
};

/**
 * The whole workout is rendered up front into one audio file (beeps in the right places, silence in between)
 * and played by an <audio> element. Media playback keeps going with the screen locked and the phone in a
 * pocket, which JavaScript timers do not.
 */
const RATE = 8000;
function buildWav(cfg: Cfg): { url: string; total: number } {
  const total = cfg.warm + cfg.reps * cfg.work + (cfg.reps - 1) * cfg.rest + 2;
  const n = Math.ceil(total * RATE);
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + n, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true);
  v.setUint32(28, RATE, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  str(36, "data");
  v.setUint32(40, n, true);
  const pcm = new Uint8Array(buf, 44);
  pcm.fill(128);
  const tone = (at: number, f: number, d: number, vol = 0.85) => {
    const s0 = Math.floor(at * RATE);
    const len = Math.floor(d * RATE);
    for (let i = 0; i < len && s0 + i < n; i++) {
      if (s0 + i < 0) continue;
      const env = Math.min(1, i / 80, (len - i) / 200);
      // square-ish wave carries better through a pocket than a pure sine
      const x = Math.sin((2 * Math.PI * f * i) / RATE);
      const y = Math.max(-1, Math.min(1, x * 1.6));
      pcm[s0 + i] = Math.round(128 + 127 * vol * env * y);
    }
  };
  const countdown = (at: number) => [3, 2, 1].forEach((k) => tone(at - k, 660, 0.12, 0.6));
  let t = cfg.warm;
  countdown(t);
  for (let r = 0; r < cfg.reps; r++) {
    // work starts: two high beeps
    tone(t, 1250, 0.25);
    tone(t + 0.35, 1250, 0.45);
    t += cfg.work;
    if (r < cfg.reps - 1) {
      countdown(t);
      // rest starts: one long low tone
      tone(t, 520, 0.9);
      t += cfg.rest;
      countdown(t);
    }
  }
  // finish: rising triple
  tone(t, 880, 0.25);
  tone(t + 0.3, 1100, 0.25);
  tone(t + 0.6, 1320, 0.6);
  return { url: URL.createObjectURL(new Blob([buf], { type: "audio/wav" })), total: total - 2 };
}

function Stepper({ label, value, set, step, min, max, fmt }: { label: string; value: number; set: (v: number) => void; step: number; min: number; max: number; fmt: (v: number) => string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[14px] text-white/70">{label}</span>
      <span className="flex items-center gap-3">
        <button type="button" aria-label={`${label}: mniej`} onClick={() => set(Math.max(min, value - step))} className="grid size-9 place-items-center rounded-full bg-white/[0.07] active:scale-90">
          <Minus className="size-4" />
        </button>
        <span className="w-14 text-center text-[16px] font-medium tabular-nums">{fmt(value)}</span>
        <button type="button" aria-label={`${label}: więcej`} onClick={() => set(Math.min(max, value + step))} className="grid size-9 place-items-center rounded-full bg-white/[0.07] active:scale-90">
          <Plus className="size-4" />
        </button>
      </span>
    </div>
  );
}

export function IntervalTimer() {
  const q = useSearchParams();
  const fromQuery = useMemo<Cfg | null>(() => {
    const w = Number(q.get("w")), r = Number(q.get("r")), n = Number(q.get("n"));
    return w > 0 && n > 0 ? { warm: 300, work: w, rest: Math.max(0, r), reps: Math.min(40, n) } : null;
  }, [q]);
  const label = q.get("label");
  const [cfg, setCfg] = useState<Cfg>(fromQuery ?? PRESETS[0].cfg);
  const [started, setStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const totalRef = useRef(0);

  const total = cfg.warm + cfg.reps * cfg.work + (cfg.reps - 1) * cfg.rest;
  let phase: "warm" | "work" | "rest" | "done" = "done";
  let left = 0;
  let rep = 0;
  if (!started || t < total) {
    if (t < cfg.warm) {
      phase = "warm";
      left = cfg.warm - t;
    } else {
      const x = t - cfg.warm;
      const cycle = cfg.work + cfg.rest;
      rep = Math.floor(x / cycle) + 1;
      const into = x % cycle;
      if (into < cfg.work) {
        phase = "work";
        left = cfg.work - into;
      } else {
        phase = "rest";
        left = cycle - into;
      }
    }
  }

  // The audio clock is the truth: the display follows it whenever the screen is on.
  useEffect(() => {
    if (!started) return;
    let raf = 0;
    const loop = () => {
      const a = audio.current;
      if (a) setT(a.ended ? totalRef.current : a.currentTime);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [started]);

  // Vibrate on phase changes while visible (Android).
  const key = `${phase}-${rep}`;
  const prev = useRef("");
  useEffect(() => {
    if (started && prev.current && prev.current !== key) {
      try {
        navigator.vibrate?.(phase === "work" ? [200, 80, 200] : 300);
      } catch {
        /* none */
      }
    }
    prev.current = key;
  }, [key, started, phase]);

  useEffect(
    () => () => {
      audio.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const start = () => {
    const { url, total: tt } = buildWav(cfg);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = url;
    totalRef.current = tt;
    const a = new Audio(url);
    a.preload = "auto";
    a.onended = () => setRunning(false);
    audio.current = a;
    a.play().then(() => setRunning(true)).catch(() => setRunning(false));
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: label || `${cfg.reps}× ${mmss(cfg.work)} / ${mmss(cfg.rest)}`, artist: "VYRA · timer interwałów" });
      } catch {
        /* unsupported */
      }
    }
    setT(0);
    setStarted(true);
  };
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setRunning(true)).catch(() => undefined);
    else {
      a.pause();
      setRunning(false);
    }
  };
  const stop = () => {
    audio.current?.pause();
    setRunning(false);
    setStarted(false);
    setT(0);
  };

  const LABEL = label ? ({ warm: "Szybki marsz", work: "Trucht", rest: "Marsz", done: "Koniec" } as const) : ({ warm: "Przygotuj się", work: "Szybko", rest: "Spokojnie", done: "Koniec" } as const);
  const tone = phase === "work" ? "bg-[var(--accent)]" : phase === "rest" ? "bg-emerald-600" : "bg-[#18181b]";
  const set = (k: keyof Cfg) => (v: number) => setCfg({ ...cfg, [k]: v });

  return (
    <div className="grid grid-cols-1 gap-3">
      {label ? <p className="rounded-[16px] bg-white/[0.05] px-4 py-3 text-[14px]">{label}</p> : null}
      <div className="app-scroll -mx-4 flex gap-2 overflow-x-auto px-4">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => setCfg(p.cfg)}
            className={cn("shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition", JSON.stringify(cfg) === JSON.stringify(p.cfg) ? "bg-white text-black" : "bg-[#141416] text-white/70")}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="divide-y divide-white/[0.05] rounded-[20px] border border-white/[0.06] bg-[#111113]">
        <Stepper label="Szybko / bieg" value={cfg.work} set={set("work")} step={5} min={5} max={1800} fmt={mmss} />
        <Stepper label="Spokojnie / marsz" value={cfg.rest} set={set("rest")} step={5} min={0} max={900} fmt={mmss} />
        <Stepper label="Powtórzenia" value={cfg.reps} set={set("reps")} step={1} min={1} max={40} fmt={String} />
        <Stepper label="Rozgrzewka" value={cfg.warm} set={set("warm")} step={30} min={0} max={900} fmt={mmss} />
      </div>
      <p className="px-1 text-center text-[13px] text-white/45">Razem {mmss(total)}</p>
      <button type="button" disabled={total > 5400} onClick={start} className="flex h-14 items-center justify-center gap-2 rounded-full bg-white text-[16px] font-semibold text-black active:scale-[0.98] disabled:opacity-30">
        <Play className="size-5" /> Start
      </button>
      <div className="rounded-[16px] border border-white/[0.06] bg-[#111113] p-4 text-[13px] leading-relaxed text-white/60">
        <p className="font-medium text-white/85">Działa z telefonem w kieszeni</p>
        <p className="mt-1">Możesz zablokować ekran: dźwięki grają dalej. Dwa wysokie sygnały = biegnij szybko, jeden niski = spokojnie, trzy krótkie = odliczanie, trzy rosnące = koniec.</p>
        <p className="mt-1 text-white/40">Na iPhonie podgłośnij multimedia. Najlepiej w słuchawkach.</p>
      </div>

      {started ? (
        <Portal>
          <div className={cn("app-native fixed inset-0 z-[80] flex flex-col items-center justify-between px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+1rem)] text-white transition-colors duration-300", tone)}>
            <div className="w-full">
              <div className="flex items-center justify-between">
                <button type="button" aria-label="Zakończ" onClick={stop} className="grid size-10 place-items-center rounded-full bg-black/25 active:scale-90">
                  <X className="size-5" />
                </button>
                <p className="text-[14px] font-medium text-white/85">{phase === "done" ? "Dobra robota!" : phase === "warm" ? "Rozgrzewka" : `Powtórzenie ${rep} z ${cfg.reps}`}</p>
                <span className="size-10" />
              </div>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-black/25">
                <div className="h-full bg-white" style={{ width: `${Math.min(100, (t / total) * 100)}%` }} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-[26px] font-semibold uppercase tracking-wide">{LABEL[phase]}</p>
              <p className="mt-2 text-[112px] font-light leading-none tabular-nums">{phase === "done" ? "✓" : mmss(left)}</p>
              <p className="mt-4 text-[14px] text-white/75">Do końca {mmss(Math.max(0, total - t))}</p>
            </div>
            <div className="flex items-center gap-4">
              <button type="button" aria-label="Od nowa" onClick={() => { stop(); setTimeout(start, 50); }} className="grid size-16 place-items-center rounded-full bg-black/25 active:scale-90">
                <RotateCcw className="size-6" />
              </button>
              {phase !== "done" ? (
                <button type="button" aria-label={running ? "Pauza" : "Wznów"} onClick={toggle} className="grid size-20 place-items-center rounded-full bg-white text-black active:scale-90">
                  {running ? <Pause className="size-8" /> : <Play className="size-8" />}
                </button>
              ) : (
                <button type="button" onClick={stop} className="h-16 rounded-full bg-white px-8 text-[16px] font-semibold text-black active:scale-95">
                  Gotowe
                </button>
              )}
            </div>
          </div>
        </Portal>
      ) : null}
    </div>
  );
}
