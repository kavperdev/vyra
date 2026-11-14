"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";
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

function Stepper({ label, value, set, step, min, max, fmt }: { label: string; value: number; set: (v: number) => void; step: number; min: number; max: number; fmt: (v: number) => string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[14px] text-white/70">{label}</span>
      <span className="flex items-center gap-3">
        <button type="button" aria-label={`${label} mniej`} onClick={() => set(Math.max(min, value - step))} className="grid size-9 place-items-center rounded-full bg-white/[0.07] active:scale-90">
          <Minus className="size-4" />
        </button>
        <span className="w-14 text-center text-[16px] font-medium tabular-nums">{fmt(value)}</span>
        <button type="button" aria-label={`${label} więcej`} onClick={() => set(Math.min(max, value + step))} className="grid size-9 place-items-center rounded-full bg-white/[0.07] active:scale-90">
          <Plus className="size-4" />
        </button>
      </span>
    </div>
  );
}

/** Interval timer: big countdown, beeps and vibration at every change, screen kept awake. */
export function IntervalTimer() {
  const [cfg, setCfg] = useState<Cfg>(PRESETS[0].cfg);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [t, setT] = useState(0); // elapsed seconds
  const last = useRef<number | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const lock = useRef<{ release: () => Promise<void> } | null>(null);
  const phaseRef = useRef<string>("");

  const total = cfg.warm + cfg.reps * cfg.work + (cfg.reps - 1) * cfg.rest;
  // Current phase from elapsed time.
  let phase: "warm" | "work" | "rest" | "done" = "done";
  let left = 0;
  let rep = 0;
  if (t < cfg.warm) {
    phase = "warm";
    left = cfg.warm - t;
  } else if (t < total) {
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

  const beep = (f: number, d = 0.18) => {
    try {
      const ctx = audio.current;
      if (!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + d);
    } catch {
      /* no audio */
    }
  };

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const loop = (now: number) => {
      if (last.current != null) setT((v) => Math.min(total, v + (now - last.current!) / 1000));
      last.current = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      last.current = null;
    };
  }, [running, total]);

  // Signals on phase change and a short countdown in the last 3 seconds.
  const key = `${phase}-${rep}`;
  useEffect(() => {
    if (!started) return;
    if (phaseRef.current && phaseRef.current !== key) {
      if (phase === "work") beep(1046, 0.35);
      else if (phase === "rest") beep(523, 0.35);
      else if (phase === "done") {
        beep(784, 0.25);
        setTimeout(() => beep(1046, 0.4), 260);
        setRunning(false);
      }
      try {
        navigator.vibrate?.(phase === "work" ? [200, 80, 200] : 300);
      } catch {
        /* no vibration */
      }
    }
    phaseRef.current = key;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, started]);
  const sec = Math.ceil(left);
  useEffect(() => {
    if (running && phase !== "done" && sec <= 3 && sec >= 1) beep(880, 0.08);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sec]);

  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    if (running && nav.wakeLock) nav.wakeLock.request("screen").then((l) => (lock.current = l)).catch(() => undefined);
    if (!running && lock.current) {
      lock.current.release().catch(() => undefined);
      lock.current = null;
    }
  }, [running]);

  const start = () => {
    if (!audio.current) {
      try {
        audio.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        /* no audio */
      }
    }
    audio.current?.resume().catch(() => undefined);
    if (phase === "done") setT(0);
    setStarted(true);
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    setStarted(false);
    setT(0);
    phaseRef.current = "";
  };

  const LABEL = { warm: "Przygotuj się", work: "Szybko", rest: "Spokojnie", done: "Koniec" } as const;
  const tone = phase === "work" ? "bg-[var(--accent)]" : phase === "rest" ? "bg-emerald-500/80" : "bg-[#18181b]";

  if (started) {
    const pct = total ? t / total : 0;
    return (
      <div className={cn("fixed inset-0 z-50 flex flex-col items-center justify-between px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)] transition-colors duration-300", tone)}>
        <div className="w-full">
          <div className="h-1 overflow-hidden rounded-full bg-black/25">
            <div className="h-full bg-white" style={{ width: `${pct * 100}%` }} />
          </div>
          <p className="mt-3 text-center text-[14px] font-medium text-white/80">
            {phase === "done" ? "Dobra robota!" : phase === "warm" ? "Start za chwilę" : `Powtórzenie ${rep} z ${cfg.reps}`}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[28px] font-semibold uppercase tracking-wide">{LABEL[phase]}</p>
          <p className="mt-2 text-[120px] font-light leading-none tabular-nums">{phase === "done" ? "✓" : mmss(left)}</p>
          <p className="mt-4 text-[14px] text-white/70">Zostało {mmss(Math.max(0, total - t))}</p>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" aria-label="Od nowa" onClick={reset} className="grid size-16 place-items-center rounded-full bg-black/25 active:scale-90">
            <RotateCcw className="size-6" />
          </button>
          {phase !== "done" ? (
            <button type="button" aria-label={running ? "Pauza" : "Wznów"} onClick={() => (running ? setRunning(false) : start())} className="grid size-20 place-items-center rounded-full bg-white text-black active:scale-90">
              {running ? <Pause className="size-8" /> : <Play className="size-8" />}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const set = (k: keyof Cfg) => (v: number) => setCfg({ ...cfg, [k]: v });
  return (
    <div className="grid gap-3">
      <div className="app-scroll -mx-4 flex gap-2 overflow-x-auto px-4">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => setCfg(p.cfg)}
            className={cn("shrink-0 rounded-full px-4 py-2 text-[13px] font-medium", JSON.stringify(cfg) === JSON.stringify(p.cfg) ? "bg-white text-black" : "bg-[#141416] text-white/70")}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="divide-y divide-white/[0.05] rounded-[20px] border border-white/[0.06] bg-[#111113]">
        <Stepper label="Szybko" value={cfg.work} set={set("work")} step={5} min={5} max={1200} fmt={mmss} />
        <Stepper label="Spokojnie" value={cfg.rest} set={set("rest")} step={5} min={0} max={900} fmt={mmss} />
        <Stepper label="Powtórzenia" value={cfg.reps} set={set("reps")} step={1} min={1} max={40} fmt={String} />
        <Stepper label="Odliczanie" value={cfg.warm} set={set("warm")} step={5} min={0} max={60} fmt={mmss} />
      </div>
      <p className="px-1 text-center text-[13px] text-white/45">Razem {mmss(total)} · sygnał dźwiękowy i wibracja przy każdej zmianie</p>
      <button type="button" onClick={start} className="flex h-14 items-center justify-center gap-2 rounded-full bg-white text-[16px] font-semibold text-black active:scale-[0.98]">
        <Play className="size-5" /> Start
      </button>
      <p className="px-1 text-center text-[11.5px] text-white/35">Ekran nie zgaśnie w trakcie. Na iPhonie wyłącz tryb cichy, żeby słyszeć sygnały.</p>
    </div>
  );
}
