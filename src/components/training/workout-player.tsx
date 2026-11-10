"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describeSegment } from "@/components/training/session-bits";
import { RECOVERY_LABEL, SEGMENT_TYPE_LABEL } from "@/lib/training/categories";
import { formatDistance, formatDuration, formatKg } from "@/lib/format";
import type { RunningSegment, StrengthExercise } from "@/lib/types";
import { tl } from "@/lib/i18n/runtime";
import { cn } from "@/lib/utils";

interface Step {
  kind: "work" | "easy" | "rest";
  title: string;
  detail: string;
  /** Countdown length; null = open step finished by the athlete (distance, reps). */
  seconds: number | null;
  /** Shown as the main target when there is no countdown. */
  target: string;
}

function runningSteps(segments: RunningSegment[]): Step[] {
  const out: Step[] = [];
  for (const s of [...segments].sort((a, b) => a.position - b.position)) {
    const name = s.label || SEGMENT_TYPE_LABEL[s.segment_type] || "";
    const reps = Math.max(1, s.repeats || 1);
    const one = { ...s, repeats: 1, recovery_duration_s: null, recovery_distance_m: null };
    for (let i = 0; i < reps; i++) {
      out.push({
        kind: s.segment_type === "work" || s.segment_type === "strides" ? "work" : "easy",
        title: reps > 1 ? `${name} ${i + 1}/${reps}` : name,
        detail: describeSegment(one),
        seconds: s.distance_m ? null : s.duration_s,
        target: s.distance_m ? formatDistance(s.distance_m) : "",
      });
      const last = i === reps - 1;
      if (!last && (s.recovery_duration_s || s.recovery_distance_m)) {
        out.push({
          kind: "rest",
          title: tl("Przerwa", "Recovery"),
          detail: s.recovery_type ? (RECOVERY_LABEL[s.recovery_type] ?? "") : "",
          seconds: s.recovery_duration_s,
          target: s.recovery_distance_m ? formatDistance(s.recovery_distance_m) : "",
        });
      }
    }
  }
  return out;
}

function strengthSteps(exercises: StrengthExercise[]): Step[] {
  const out: Step[] = [];
  const list = [...exercises].sort((a, b) => a.position - b.position);
  list.forEach((e, ei) => {
    const sets = e.sets.length ? [...e.sets].sort((a, b) => a.position - b.position) : [null];
    sets.forEach((set, si) => {
      const bits = [
        set?.planned_reps ? `${set.planned_reps} ${tl("powt.", "reps")}` : "",
        set?.planned_load_kg ? formatKg(set.planned_load_kg) : "",
        set?.planned_rir != null ? `RIR ${set.planned_rir}` : "",
        e.tempo ? `${tl("tempo", "tempo")} ${e.tempo}` : "",
      ].filter(Boolean);
      out.push({
        kind: "work",
        title: e.name,
        detail: `${tl("Seria", "Set")} ${si + 1}/${sets.length}${e.notes ? ` · ${e.notes}` : ""}`,
        seconds: set?.planned_duration_s ?? null,
        target: bits.join(" · ") || tl("Seria", "Set"),
      });
      const lastOfAll = ei === list.length - 1 && si === sets.length - 1;
      if (!lastOfAll && e.rest_s) out.push({ kind: "rest", title: tl("Odpoczynek", "Rest"), detail: si === sets.length - 1 ? `${tl("Dalej", "Next")}: ${list[ei + 1]?.name ?? ""}` : "", seconds: e.rest_s, target: "" });
    });
  });
  return out;
}

function beep(ctx: AudioContext | null, freq = 880, len = 0.15) {
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + len);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + len + 0.02);
  } catch {
    /* audio unavailable */
  }
}

/**
 * "Start workout": a full-screen, step-by-step player for the planned session. Timed steps count
 * down with a beep and vibration; distance and rep steps wait for "Done". When finished, the total
 * time is handed to the result form below (only if the athlete has not typed one yet).
 */
export function WorkoutPlayer({ title, segments, exercises, autoStart = false }: { title: string; segments: RunningSegment[]; exercises: StrengthExercise[]; autoStart?: boolean }) {
  const steps = useMemo(() => (segments.length ? runningSteps(segments) : strengthSteps(exercises)), [segments, exercises]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [stepElapsed, setStepElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const lock = useRef<{ release: () => Promise<void> } | null>(null);

  const start = useCallback(() => {
    try {
      audio.current ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      audio.current = null;
    }
    setIdx(0);
    setElapsed(0);
    setStepElapsed(0);
    setFinished(false);
    setRunning(true);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (autoStart && steps.length) setOpen(true);
  }, [autoStart, steps.length]);

  // Keep the screen on while the player is open.
  useEffect(() => {
    if (!open) return;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock.current = l)).catch(() => {});
    document.body.style.overflow = "hidden";
    return () => {
      lock.current?.release().catch(() => {});
      lock.current = null;
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open || !running || finished) return;
    const t = setInterval(() => {
      setElapsed((e) => e + 1);
      setStepElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [open, running, finished]);

  const step = steps[idx];
  const left = step?.seconds != null ? step.seconds - stepElapsed : null;

  const go = useCallback(
    (to: number) => {
      if (to >= steps.length) {
        setFinished(true);
        beep(audio.current, 1046, 0.4);
        return;
      }
      setIdx(Math.max(0, to));
      setStepElapsed(0);
    },
    [steps.length],
  );

  useEffect(() => {
    if (left == null || !running || finished) return;
    if (left > 0 && left <= 3) beep(audio.current, 660, 0.08);
    if (left <= 0) {
      beep(audio.current, 990, 0.25);
      navigator.vibrate?.([120, 60, 120]);
      go(idx + 1);
    }
  }, [left, running, finished, go, idx]);

  const close = () => {
    if (finished && elapsed > 0) window.dispatchEvent(new CustomEvent("vyra:workout-finished", { detail: { seconds: elapsed } }));
    setOpen(false);
    if (finished) setTimeout(() => document.getElementById("log-title")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  if (!steps.length) return null;
  const next = steps[idx + 1];
  const progress = finished ? 100 : (idx / steps.length) * 100;
  const ring = step?.seconds ? Math.min(1, stepElapsed / step.seconds) : 0;

  return (
    <>
      <Button variant="accent" size="lg" className="w-full sm:w-fit" onClick={start}>
        <Play className="size-4" /> {tl("Zacznij trening", "Start workout")}
      </Button>

      {open ? (
        <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a] text-white">
          <div className="h-1 bg-white/10">
            <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
          <header className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
            <div className="grid min-w-0">
              <span className="text-[11px] uppercase tracking-[0.16em] text-white/50">{finished ? tl("Koniec", "Done") : `${tl("Krok", "Step")} ${idx + 1}/${steps.length}`}</span>
              <span className="truncate text-sm font-medium">{title}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="num text-sm text-white/70">{formatDuration(elapsed)}</span>
              <button type="button" onClick={close} className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label={tl("Zamknij", "Close")}>
                <X className="size-5" />
              </button>
            </div>
          </header>

          {finished ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <span className="grid size-16 place-content-center rounded-full bg-accent">
                <Check className="size-8" />
              </span>
              <p className="display text-3xl">{tl("Trening zrobiony", "Workout done")}</p>
              <p className="num text-5xl font-semibold">{formatDuration(elapsed)}</p>
              <p className="max-w-xs text-sm text-white/60">{tl("Zapisz teraz wykonanie: dystans, samopoczucie i komentarz dla trenera.", "Now log your result: distance, feeling and a note for your coach.")}</p>
              <Button variant="accent" size="lg" onClick={close}>
                {tl("Zapisz wykonanie", "Log result")}
              </Button>
            </div>
          ) : step ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
              <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]", step.kind === "work" ? "bg-accent text-white" : step.kind === "rest" ? "bg-white/10 text-white/80" : "bg-white text-black")}>
                {step.kind === "work" ? tl("Praca", "Work") : step.kind === "rest" ? tl("Przerwa", "Rest") : tl("Spokojnie", "Easy")}
              </span>
              <p className="display text-[clamp(1.8rem,7vw,3rem)] leading-tight">{step.title}</p>
              <div className="relative grid size-[min(64vw,300px)] place-content-center">
                <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
                  <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="3" />
                  {step.seconds ? <circle cx="50" cy="50" r="46" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${ring * 289} 289`} className="transition-[stroke-dasharray] duration-1000 ease-linear" /> : null}
                </svg>
                <span className="num text-[clamp(3rem,16vw,5.5rem)] font-semibold leading-none">{left != null ? formatDuration(Math.max(0, left)) : step.target || formatDuration(stepElapsed)}</span>
                {left == null ? <span className="num mt-2 text-sm text-white/50">{formatDuration(stepElapsed)}</span> : null}
              </div>
              {step.detail ? <p className="max-w-sm text-[15px] text-white/70">{step.detail}</p> : null}
            </div>
          ) : null}

          {!finished ? (
            <footer className="grid gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {next ? (
                <p className="truncate text-center text-[13px] text-white/50">
                  {tl("Następnie", "Next")}: {next.title}
                  {next.seconds ? ` · ${formatDuration(next.seconds)}` : next.target ? ` · ${next.target}` : ""}
                </p>
              ) : null}
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0} className="grid size-14 place-content-center rounded-full bg-white/10 disabled:opacity-30" aria-label={tl("Poprzedni krok", "Previous step")}>
                  <ChevronLeft className="size-6" />
                </button>
                {step?.seconds == null ? (
                  <Button variant="accent" size="lg" className="h-14 rounded-full text-base" onClick={() => go(idx + 1)}>
                    <Check className="size-5" /> {segments.length ? tl("Gotowe", "Done") : tl("Seria zrobiona", "Set done")}
                  </Button>
                ) : (
                  <Button variant="outline" size="lg" className="h-14 rounded-full border-white/20 bg-transparent text-base text-white hover:bg-white/10" onClick={() => setRunning((r) => !r)}>
                    {running ? <Pause className="size-5" /> : <Play className="size-5" />} {running ? tl("Pauza", "Pause") : tl("Wznów", "Resume")}
                  </Button>
                )}
                <button type="button" onClick={() => go(idx + 1)} className="grid size-14 place-content-center rounded-full bg-white/10" aria-label={tl("Następny krok", "Next step")}>
                  <ChevronRight className="size-6" />
                </button>
              </div>
            </footer>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
