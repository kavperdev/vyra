"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hrRange, paceRange } from "@/components/training/session-bits";
import { INTENSITY_LABEL, RECOVERY_LABEL, SEGMENT_TYPE_LABEL } from "@/lib/training/categories";
import { formatDistance, formatDuration, formatKg } from "@/lib/format";
import type { RunningSegment, StrengthExercise } from "@/lib/types";
import { tl } from "@/lib/i18n/runtime";
import { cn } from "@/lib/utils";

interface Step {
  kind: "work" | "easy" | "rest";
  /** Segment or exercise name, e.g. "Odcinek" or "Przysiad". */
  name: string;
  /** "3/6" when the step is one of several repeats or sets. */
  counter: string | null;
  /** What to do: "800 m", "15:00", "8 powt. · 60 kg". */
  goal: string;
  /** How: pace, heart rate, intensity, notes. */
  how: string;
  /** Countdown length; null = an open step the athlete ends with "Done". */
  seconds: number | null;
}

const join = (xs: (string | null | undefined | false)[]) => xs.filter(Boolean).join(" · ");

function runningSteps(segments: RunningSegment[]): Step[] {
  const out: Step[] = [];
  for (const s of [...segments].sort((a, b) => a.position - b.position)) {
    const name = s.label || SEGMENT_TYPE_LABEL[s.segment_type] || tl("Bieg", "Run");
    const reps = Math.max(1, s.repeats || 1);
    const how = join([paceRange(s.target_pace_min_s, s.target_pace_max_s), hrRange(s.target_hr_min, s.target_hr_max), s.intensity ? (INTENSITY_LABEL[s.intensity] ?? s.intensity) : null, s.notes]);
    for (let i = 0; i < reps; i++) {
      out.push({
        kind: s.segment_type === "work" || s.segment_type === "strides" ? "work" : "easy",
        name,
        counter: reps > 1 ? `${i + 1}/${reps}` : null,
        goal: s.distance_m ? formatDistance(s.distance_m) : s.duration_s ? formatDuration(s.duration_s) : "",
        how,
        seconds: s.distance_m ? null : s.duration_s,
      });
      if (i < reps - 1 && (s.recovery_duration_s || s.recovery_distance_m)) {
        out.push({
          kind: "rest",
          name: tl("Przerwa", "Recovery"),
          counter: null,
          goal: s.recovery_distance_m ? formatDistance(s.recovery_distance_m) : formatDuration(s.recovery_duration_s),
          how: s.recovery_type ? (RECOVERY_LABEL[s.recovery_type] ?? "") : "",
          seconds: s.recovery_distance_m ? null : s.recovery_duration_s,
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
      out.push({
        kind: "work",
        name: e.name,
        counter: sets.length > 1 ? `${si + 1}/${sets.length}` : null,
        goal:
          join([
            set?.planned_reps ? `${set.planned_reps} ${tl("powt.", "reps")}` : null,
            set?.planned_load_kg ? formatKg(set.planned_load_kg) : null,
            set?.planned_duration_s ? formatDuration(set.planned_duration_s) : null,
          ]) || tl("Seria", "Set"),
        how: join([set?.planned_rir != null ? `RIR ${set.planned_rir}` : null, set?.planned_rpe ? `RPE ${set.planned_rpe}` : null, e.tempo ? `${tl("tempo", "tempo")} ${e.tempo}` : null, e.notes]),
        seconds: set?.planned_duration_s ?? null,
      });
      const lastOfAll = ei === list.length - 1 && si === sets.length - 1;
      if (!lastOfAll && e.rest_s) {
        const nextName = si === sets.length - 1 ? list[ei + 1]?.name : null;
        out.push({ kind: "rest", name: tl("Odpoczynek", "Rest"), counter: null, goal: formatDuration(e.rest_s), how: nextName ? `${tl("Dalej", "Next")}: ${nextName}` : "", seconds: e.rest_s });
      }
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

const KIND_LABEL = { work: ["Praca", "Work"], easy: ["Spokojnie", "Easy"], rest: ["Przerwa", "Rest"] } as const;
const KIND_STYLE = { work: "bg-accent text-white", easy: "bg-white text-black", rest: "bg-white/10 text-white/80" } as const;

/**
 * "Start workout": a full-screen, step-by-step player for the planned session. It opens on an
 * overview of all steps; timed steps then count down with a beep and vibration, and distance or
 * rep steps wait for "Done". At the end the total time is handed to the result form below
 * (only if the athlete has not typed one yet). Rendered into <body> so no page wrapper can
 * shift or clip it.
 */
export function WorkoutPlayer({ title, segments, exercises, autoStart = false }: { title: string; segments: RunningSegment[]; exercises: StrengthExercise[]; autoStart?: boolean }) {
  const steps: Step[] = useMemo(() => (segments.length ? runningSteps(segments) : strengthSteps(exercises)), [segments, exercises]);
  const isRun = segments.length > 0;
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"ready" | "go" | "done">("ready");
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [stepElapsed, setStepElapsed] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const lock = useRef<{ release: () => Promise<void> } | null>(null);

  const openPlayer = useCallback(() => {
    setPhase("ready");
    setIdx(0);
    setElapsed(0);
    setStepElapsed(0);
    setRunning(true);
    setConfirmExit(false);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (autoStart && steps.length) openPlayer();
  }, [autoStart, steps.length, openPlayer]);

  const begin = () => {
    // Audio needs a tap to unlock on phones, so it starts here and not when the player opens.
    try {
      audio.current ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      void audio.current.resume();
    } catch {
      audio.current = null;
    }
    beep(audio.current, 880, 0.12);
    setPhase("go");
  };

  // Keep the screen on and the page behind still while the player is open.
  useEffect(() => {
    if (!open) return;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock.current = l)).catch(() => {});
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      lock.current?.release().catch(() => {});
      lock.current = null;
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || phase !== "go" || !running) return;
    const t = setInterval(() => {
      setElapsed((e) => e + 1);
      setStepElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [open, phase, running]);

  const go = useCallback(
    (to: number) => {
      if (to >= steps.length) {
        setPhase("done");
        beep(audio.current, 1046, 0.4);
        return;
      }
      setIdx(Math.max(0, to));
      setStepElapsed(0);
    },
    [steps.length],
  );

  const step: Step | undefined = steps[idx];
  const left = step?.seconds != null ? step.seconds - stepElapsed : null;

  useEffect(() => {
    if (phase !== "go" || left == null || !running) return;
    if (left > 0 && left <= 3) beep(audio.current, 660, 0.08);
    if (left <= 0) {
      beep(audio.current, 990, 0.25);
      navigator.vibrate?.([120, 60, 120]);
      go(idx + 1);
    }
  }, [left, running, phase, go, idx]);

  const close = () => {
    if (phase === "go" && !confirmExit) return setConfirmExit(true);
    if (phase === "done" && elapsed > 0) window.dispatchEvent(new CustomEvent("vyra:workout-finished", { detail: { seconds: elapsed } }));
    const finished = phase === "done";
    setOpen(false);
    if (finished) setTimeout(() => document.getElementById("log-title")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  if (!steps.length) return null;
  const next: Step | undefined = steps[idx + 1];
  const progress = phase === "done" ? 100 : phase === "ready" ? 0 : (idx / steps.length) * 100;
  const ring = step?.seconds ? Math.min(1, stepElapsed / step.seconds) : 0;
  const R = 46;
  const C = 2 * Math.PI * R;
  const totalPlanned = steps.reduce((n, s) => n + (s.seconds ?? 0), 0);

  const overlay = (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] flex h-dvh flex-col bg-[#0a0a0b] text-white">
      <div className="h-1 shrink-0 bg-white/10">
        <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>

      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="grid min-w-0">
          <span className="text-[11px] uppercase tracking-[0.16em] text-white/50">
            {phase === "ready" ? tl("Plan treningu", "Workout plan") : phase === "done" ? tl("Koniec", "Done") : `${tl("Krok", "Step")} ${idx + 1} / ${steps.length}`}
          </span>
          <span className="truncate text-sm font-medium">{title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {phase !== "ready" ? <span className="num text-sm tabular-nums text-white/70">{formatDuration(elapsed)}</span> : null}
          <button type="button" onClick={close} className="grid size-10 place-content-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" aria-label={tl("Zamknij", "Close")}>
            <X className="size-5" />
          </button>
        </div>
      </header>

      {confirmExit ? (
        <div className="mx-4 mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm">
          <span>{tl("Przerwać trening? Postęp nie zostanie zapisany.", "Stop the workout? Progress won’t be saved.")}</span>
          <span className="flex gap-2">
            <button type="button" className="rounded-md px-3 py-1.5 text-white/70 hover:bg-white/10" onClick={() => setConfirmExit(false)}>
              {tl("Wracam", "Keep going")}
            </button>
            <button type="button" className="rounded-md bg-white px-3 py-1.5 font-semibold text-black" onClick={() => setOpen(false)}>
              {tl("Przerwij", "Stop")}
            </button>
          </span>
        </div>
      ) : null}

      {phase === "ready" ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <p className="mb-3 text-[13px] text-white/60">
              {tl(`${steps.length} kroków`, `${steps.length} steps`)}
              {totalPlanned ? ` · ${tl("odliczane", "timed")} ${formatDuration(totalPlanned)}` : ""}
              {isRun ? ` · ${tl("odcinki na dystans kończysz przyciskiem „Gotowe”", "end distance steps with “Done”")}` : ` · ${tl("serie kończysz przyciskiem „Seria zrobiona”", "end sets with “Set done”")}`}
            </p>
            <ol className="grid gap-1.5">
              {steps.map((s, i) => (
                <li key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2.5">
                  <span className="num text-[12px] tabular-nums text-white/40">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className={cn("size-1.5 shrink-0 rounded-full", s.kind === "work" ? "bg-accent" : s.kind === "easy" ? "bg-white" : "bg-white/30")} />
                      <span className="truncate">
                        {s.name}
                        {s.counter ? ` ${s.counter}` : ""}
                      </span>
                    </span>
                    {s.how ? <span className="block truncate pl-3.5 text-[12px] text-white/50">{s.how}</span> : null}
                  </span>
                  <span className="num text-sm tabular-nums text-white/80">{s.goal}</span>
                </li>
              ))}
            </ol>
          </div>
          <footer className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
            <Button variant="accent" size="lg" className="h-14 w-full rounded-full text-base" onClick={begin}>
              <Play className="size-5" /> {tl("Start", "Start")}
            </Button>
          </footer>
        </>
      ) : phase === "done" ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-6 text-center">
          <span className="grid size-16 place-content-center rounded-full bg-accent">
            <Check className="size-8" />
          </span>
          <p className="text-2xl font-semibold">{tl("Trening zrobiony", "Workout done")}</p>
          <p className="num text-5xl font-semibold tabular-nums">{formatDuration(elapsed)}</p>
          <p className="max-w-xs text-sm text-white/60">{tl("Teraz zapisz wykonanie: dystans, samopoczucie i komentarz dla trenera.", "Now log your result: distance, feeling and a note for your coach.")}</p>
          <Button variant="accent" size="lg" className="h-12 rounded-full px-8" onClick={close}>
            {tl("Zapisz wykonanie", "Log result")}
          </Button>
        </div>
      ) : step ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(0.5rem,2dvh,1.25rem)] overflow-y-auto px-6 text-center">
            <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]", KIND_STYLE[step.kind])}>{tl(KIND_LABEL[step.kind][0], KIND_LABEL[step.kind][1])}</span>
            <p className="max-w-full text-[clamp(1.5rem,6vw,2.25rem)] font-semibold leading-tight">
              {step.name}
              {step.counter ? <span className="text-white/50"> {step.counter}</span> : null}
            </p>

            <div className="relative grid aspect-square w-[min(68vw,38dvh,300px)] shrink-0 place-content-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
                <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="3" />
                {step.seconds ? (
                  <circle cx="50" cy="50" r={R} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(ring * C).toFixed(1)} ${C.toFixed(1)}`} className="transition-[stroke-dasharray] duration-1000 ease-linear" />
                ) : null}
              </svg>
              {left != null ? (
                <span className="num text-[clamp(2.75rem,14vw,4.5rem)] font-semibold leading-none tabular-nums">{formatDuration(Math.max(0, left))}</span>
              ) : (
                <span className="grid gap-1">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-white/50">{tl("Cel", "Target")}</span>
                  <span className="num text-[clamp(2rem,10vw,3.25rem)] font-semibold leading-none">{step.goal}</span>
                  <span className="num mt-1 text-base tabular-nums text-white/60">{formatDuration(stepElapsed)}</span>
                </span>
              )}
            </div>

            {step.how ? <p className="max-w-sm text-[15px] leading-snug text-white/75">{step.how}</p> : null}
          </div>

          <footer className="grid shrink-0 gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
            <p className="truncate text-center text-[13px] text-white/50">
              {next ? `${tl("Następnie", "Next")}: ${next.name}${next.counter ? ` ${next.counter}` : ""} · ${next.goal}` : tl("To ostatni krok", "This is the last step")}
            </p>
            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-center gap-2">
              <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0} className="grid size-14 place-content-center rounded-full bg-white/10 disabled:opacity-30" aria-label={tl("Poprzedni krok", "Previous step")}>
                <ChevronLeft className="size-6" />
              </button>
              {step.seconds == null ? (
                <button type="button" onClick={() => go(idx + 1)} className="flex h-14 items-center justify-center gap-2 rounded-full bg-accent text-base font-semibold text-white">
                  <Check className="size-5" /> {isRun ? tl("Gotowe", "Done") : tl("Seria zrobiona", "Set done")}
                </button>
              ) : (
                <button type="button" onClick={() => setRunning((r) => !r)} className="flex h-14 items-center justify-center gap-2 rounded-full border border-white/20 text-base font-semibold text-white">
                  {running ? <Pause className="size-5" /> : <Play className="size-5" />} {running ? tl("Pauza", "Pause") : tl("Wznów", "Resume")}
                </button>
              )}
              <button type="button" onClick={() => go(idx + 1)} className="grid size-14 place-content-center rounded-full bg-white/10" aria-label={tl("Następny krok", "Next step")}>
                <ChevronRight className="size-6" />
              </button>
            </div>
          </footer>
        </>
      ) : null}
    </div>
  );

  return (
    <>
      <Button variant="accent" size="lg" className="w-full sm:w-fit" onClick={openPlayer}>
        <Play className="size-4" /> {tl("Zacznij trening", "Start workout")}
      </Button>
      {open && typeof document !== "undefined" ? createPortal(overlay, document.body) : null}
    </>
  );
}
