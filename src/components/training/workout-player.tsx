"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, Minus, Pause, Play, Plus, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hrRange, paceRange } from "@/components/training/session-bits";
import { INTENSITY_LABEL, RECOVERY_LABEL, SEGMENT_TYPE_LABEL } from "@/lib/training/categories";
import { formatDistance, formatDuration, formatKg, formatPace } from "@/lib/format";
import type { RunningSegment, StrengthExercise } from "@/lib/types";
import { tl } from "@/lib/i18n/runtime";
import { cn } from "@/lib/utils";

/** What the player hands to the result form when the athlete finishes (event "vyra:workout-finished"). */
export interface WorkoutResult {
  seconds: number;
  /** Planned distance of the steps the athlete went through, in metres. */
  distanceM: number;
  laps: { segment_id: string; rep_index: number; seconds: number }[];
  sets: { exercise_id: string; set_id: string; reps: number | null; load_kg: number | null }[];
}

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
  distanceM: number | null;
  lap?: { segment_id: string; rep_index: number };
  set?: { exercise_id: string; set_id: string; reps: number | null; load_kg: number | null };
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
        distanceM: s.distance_m,
        lap: s.segment_type === "work" ? { segment_id: s.id, rep_index: i + 1 } : undefined,
      });
      if (i < reps - 1 && (s.recovery_duration_s || s.recovery_distance_m)) {
        out.push({
          kind: "rest",
          name: tl("Przerwa", "Recovery"),
          counter: null,
          goal: s.recovery_distance_m ? formatDistance(s.recovery_distance_m) : formatDuration(s.recovery_duration_s),
          how: s.recovery_type ? (RECOVERY_LABEL[s.recovery_type] ?? "") : "",
          seconds: s.recovery_distance_m ? null : s.recovery_duration_s,
          distanceM: s.recovery_distance_m,
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
    const sets = [...e.sets].sort((a, b) => a.position - b.position);
    if (!sets.length) {
      out.push({ kind: "work", name: e.name, counter: null, goal: tl("Ćwiczenie", "Exercise"), how: join([e.tempo ? `${tl("tempo", "tempo")} ${e.tempo}` : null, e.notes]), seconds: null, distanceM: null });
    }
    sets.forEach((set, si) => {
      out.push({
        kind: "work",
        name: e.name,
        counter: sets.length > 1 ? `${si + 1}/${sets.length}` : null,
        goal:
          join([
            set.planned_reps ? `${set.planned_reps} ${tl("powt.", "reps")}` : null,
            set.planned_load_kg ? formatKg(set.planned_load_kg) : null,
            set.planned_duration_s ? formatDuration(set.planned_duration_s) : null,
          ]) || tl("Seria", "Set"),
        how: join([set.planned_rir != null ? `RIR ${set.planned_rir}` : null, set.planned_rpe ? `RPE ${set.planned_rpe}` : null, e.tempo ? `${tl("tempo", "tempo")} ${e.tempo}` : null, e.notes]),
        seconds: set.planned_duration_s ?? null,
        distanceM: null,
        set: { exercise_id: e.id, set_id: set.id, reps: set.planned_reps, load_kg: set.planned_load_kg },
      });
      const lastOfAll = ei === list.length - 1 && si === sets.length - 1;
      if (!lastOfAll && e.rest_s) {
        const nextName = si === sets.length - 1 ? list[ei + 1]?.name : null;
        out.push({ kind: "rest", name: tl("Odpoczynek", "Rest"), counter: null, goal: formatDuration(e.rest_s), how: nextName ? `${tl("Dalej", "Next")}: ${nextName}` : "", seconds: e.rest_s, distanceM: null });
      }
    });
  });
  return out;
}

// ------------------------------------------------------------------ sound, voice, storage
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

function say(text: string) {
  try {
    const s = window.speechSynthesis;
    if (!s || !text) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = document.documentElement.lang?.startsWith("en") ? "en-GB" : "pl-PL";
    u.rate = 1.05;
    s.speak(u);
  } catch {
    /* speech unavailable */
  }
}

/** Words for the voice: "1:30" reads badly, so durations are spoken as minutes and seconds. */
function spokenDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  const pl = !document.documentElement.lang?.startsWith("en");
  const mm = m ? (pl ? `${m} ${m === 1 ? "minuta" : m < 5 ? "minuty" : "minut"}` : `${m} minute${m === 1 ? "" : "s"}`) : "";
  const ss = s ? (pl ? `${s} sekund` : `${s} seconds`) : "";
  return [mm, ss].filter(Boolean).join(" ");
}

function spokenStep(st: Step): string {
  const goal = st.seconds != null ? spokenDuration(st.seconds) : st.distanceM ? `${st.distanceM} ${tl("metrów", "metres")}` : st.goal;
  const counter = st.counter ? st.counter.replace("/", ` ${tl("z", "of")} `) : "";
  return join([`${st.name} ${counter}`.trim(), goal]).replaceAll(" · ", ". ");
}

interface Saved {
  v: 1;
  phase: "go" | "done";
  idx: number;
  running: boolean;
  /** Accumulated seconds before `since` (workout and current step). */
  totalBase: number;
  stepBase: number;
  /** Epoch ms when the clock last started; null while paused. */
  since: number | null;
  laps: Record<string, number>;
  sets: Record<string, { reps: number | null; load_kg: number | null }>;
  doneSteps: number[];
}

const key = (id: string) => `vyra-player-${id}`;
const load = (id: string): Saved | null => {
  try {
    const raw = localStorage.getItem(key(id));
    const s = raw ? (JSON.parse(raw) as Saved) : null;
    return s && s.v === 1 ? s : null;
  } catch {
    return null;
  }
};

const KIND_LABEL = { work: ["Praca", "Work"], easy: ["Spokojnie", "Easy"], rest: ["Przerwa", "Rest"] } as const;
const KIND_STYLE = { work: "bg-accent text-white", easy: "bg-white text-black", rest: "bg-white/10 text-white/80" } as const;

/**
 * "Start workout": a full-screen, step-by-step player for the planned session.
 * - The clock is kept as timestamps, so a locked screen or a background tab does not lose time,
 *   and the state is saved on the device so a closed tab can resume where it stopped.
 * - Timed steps count down (beeps on the last 3 s, vibration, optional voice); distance and rep
 *   steps end with "Done". Distance repeats are timed as laps; sets are logged with reps and load.
 * - At the end the results (time, distance, laps, sets) are handed to the result form below.
 * Rendered into <body> so no page wrapper can shift or clip it.
 */
export function WorkoutPlayer({ sessionId, title, segments, exercises, autoStart = false }: { sessionId: string; title: string; segments: RunningSegment[]; exercises: StrengthExercise[]; autoStart?: boolean }) {
  const steps: Step[] = useMemo(() => (segments.length ? runningSteps(segments) : strengthSteps(exercises)), [segments, exercises]);
  const isRun = segments.length > 0;

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"ready" | "go" | "done">("ready");
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(true);
  const [totalBase, setTotalBase] = useState(0);
  const [stepBase, setStepBase] = useState(0);
  const [since, setSince] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [laps, setLaps] = useState<Record<string, number>>({});
  const [sets, setSets] = useState<Record<string, { reps: number | null; load_kg: number | null }>>({});
  const [doneSteps, setDoneSteps] = useState<number[]>([]);
  const [confirmExit, setConfirmExit] = useState(false);
  const [voice, setVoice] = useState(true);
  const [resume, setResume] = useState<Saved | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ reps: number | null; load_kg: number | null }>({ reps: null, load_kg: null });

  const audio = useRef<AudioContext | null>(null);
  const lock = useRef<{ release: () => Promise<void> } | null>(null);
  const lastBeep = useRef<number | null>(null);

  const live = since != null ? (now - since) / 1000 : 0;
  const elapsed = Math.floor(totalBase + live);
  const stepElapsed = Math.floor(stepBase + live);
  const step: Step | undefined = steps[idx];
  const next: Step | undefined = steps[idx + 1];
  const left = phase === "go" && step?.seconds != null ? step.seconds - stepElapsed : null;

  // ---------------------------------------------------------------- open / resume
  const openPlayer = useCallback(() => {
    const saved = load(sessionId);
    setResume(saved && saved.phase === "go" ? saved : null);
    setPhase("ready");
    setIdx(0);
    setRunning(true);
    setTotalBase(0);
    setStepBase(0);
    setSince(null);
    setLaps({});
    setSets({});
    setDoneSteps([]);
    setConfirmExit(false);
    setOpen(true);
    try {
      setVoice(localStorage.getItem("vyra-player-voice") !== "0");
    } catch {
      /* storage unavailable */
    }
  }, [sessionId]);

  useEffect(() => {
    if (autoStart && steps.length) openPlayer();
  }, [autoStart, steps.length, openPlayer]);

  const unlockAudio = () => {
    // Phones allow sound only after a tap, so audio starts on Start / Resume, not when the player opens.
    try {
      audio.current ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      void audio.current.resume();
    } catch {
      audio.current = null;
    }
  };

  const announce = useCallback(
    (st: Step | undefined) => {
      if (voice && st) say(spokenStep(st));
    },
    [voice],
  );

  const begin = () => {
    unlockAudio();
    beep(audio.current, 880, 0.12);
    setSince(Date.now());
    setPhase("go");
    announce(steps[0]);
  };

  const resumeSaved = () => {
    if (!resume) return;
    unlockAudio();
    setIdx(Math.min(resume.idx, steps.length - 1));
    setRunning(resume.running);
    setTotalBase(resume.totalBase);
    setStepBase(resume.stepBase);
    setSince(resume.since);
    setLaps(resume.laps);
    setSets(resume.sets);
    setDoneSteps(resume.doneSteps);
    setPhase("go");
    setResume(null);
  };

  // Save progress on this device so a closed tab or a reload can resume.
  useEffect(() => {
    if (!open || phase === "ready") return;
    try {
      if (phase === "done") localStorage.removeItem(key(sessionId));
      else localStorage.setItem(key(sessionId), JSON.stringify({ v: 1, phase, idx, running, totalBase, stepBase, since, laps, sets, doneSteps } satisfies Saved));
    } catch {
      /* storage unavailable */
    }
  }, [open, phase, idx, running, totalBase, stepBase, since, laps, sets, doneSteps, sessionId]);

  // Keep the screen on and the page behind still while the player is open.
  useEffect(() => {
    if (!open) return;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    const request = () => nav.wakeLock?.request("screen").then((l) => (lock.current = l)).catch(() => {});
    void request();
    // The wake lock is dropped when the tab is hidden; ask again when it comes back.
    const onVisible = () => document.visibilityState === "visible" && void request();
    document.addEventListener("visibilitychange", onVisible);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock.current?.release().catch(() => {});
      lock.current = null;
      document.body.style.overflow = prev;
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [open]);

  // A light clock: the times are computed from timestamps, this only redraws.
  useEffect(() => {
    if (!open || phase !== "go" || since == null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [open, phase, since]);

  // Draft values for the set on screen (planned reps and load, or what was logged before).
  useEffect(() => {
    if (step?.set) setDraft(sets[step.set.set_id] ?? { reps: step.set.reps, load_kg: step.set.load_kg });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase]);

  // ---------------------------------------------------------------- moving between steps
  const go = useCallback(
    (to: number, record = true) => {
      const t = Date.now();
      const liveNow = since != null ? (t - since) / 1000 : 0;
      const stepSecs = Math.round(stepBase + liveNow);
      const cur = steps[idx];
      if (record && cur && to > idx) {
        if (cur.lap && cur.seconds == null) setLaps((l) => ({ ...l, [`${cur.lap!.segment_id}:${cur.lap!.rep_index}`]: stepSecs }));
        if (cur.set) setSets((s) => ({ ...s, [cur.set!.set_id]: draft }));
        setDoneSteps((d) => (d.includes(idx) ? d : [...d, idx]));
        if (cur.lap && cur.seconds == null && cur.distanceM) {
          setFlash(`${formatDuration(stepSecs)} · ${formatPace(stepSecs / (cur.distanceM / 1000))} /km`);
          setTimeout(() => setFlash(null), 4000);
        }
      }
      setTotalBase((b) => b + liveNow);
      setStepBase(0);
      setSince(running ? t : null);
      setNow(t);
      lastBeep.current = null;
      if (to >= steps.length) {
        setSince(null);
        setPhase("done");
        beep(audio.current, 1046, 0.4);
        if (voice) say(tl("Trening zakończony. Świetna robota.", "Workout complete. Great work."));
        return;
      }
      const target = Math.max(0, to);
      setIdx(target);
      announce(steps[target]);
      navigator.vibrate?.(60);
    },
    [since, stepBase, steps, idx, draft, running, voice, announce],
  );

  const togglePause = () => {
    const t = Date.now();
    if (running && since != null) {
      const d = (t - since) / 1000;
      setTotalBase((b) => b + d);
      setStepBase((b) => b + d);
      setSince(null);
      setRunning(false);
    } else {
      setSince(t);
      setNow(t);
      setRunning(true);
    }
  };

  // Countdown: beeps on the last 3 s, step over at 0.
  useEffect(() => {
    if (phase !== "go" || left == null || !running) return;
    if (left > 0 && left <= 3 && lastBeep.current !== left) {
      lastBeep.current = left;
      beep(audio.current, 660, 0.08);
    }
    if (left <= 0) {
      beep(audio.current, 990, 0.25);
      navigator.vibrate?.([120, 60, 120]);
      go(idx + 1);
    }
  }, [left, running, phase, go, idx]);

  // ---------------------------------------------------------------- result
  const result = (): WorkoutResult => {
    const covered = steps.reduce((m, s, i) => (doneSteps.includes(i) && s.distanceM ? m + s.distanceM : m), 0);
    return {
      seconds: elapsed,
      distanceM: covered,
      laps: Object.entries(laps).map(([k, sec]) => {
        const [segment_id, rep] = k.split(":");
        return { segment_id, rep_index: Number(rep), seconds: Number(sec) };
      }),
      sets: steps.flatMap((s) => (s.set && sets[s.set.set_id] ? [{ exercise_id: s.set.exercise_id, set_id: s.set.set_id, ...sets[s.set.set_id] }] : [])),
    };
  };

  const finish = () => {
    window.dispatchEvent(new CustomEvent<WorkoutResult>("vyra:workout-finished", { detail: result() }));
    setOpen(false);
    setTimeout(() => document.getElementById("log-title")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const close = () => {
    if (phase === "go" && !confirmExit) return setConfirmExit(true);
    setOpen(false);
  };

  const quit = (discard: boolean) => {
    if (discard) {
      try {
        localStorage.removeItem(key(sessionId));
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  };

  const toggleVoice = () => {
    setVoice((v) => {
      try {
        localStorage.setItem("vyra-player-voice", v ? "0" : "1");
      } catch {
        /* ignore */
      }
      if (v) window.speechSynthesis?.cancel();
      return !v;
    });
  };

  if (!steps.length) return null;
  const progress = phase === "done" ? 100 : phase === "ready" ? 0 : (idx / steps.length) * 100;
  const ring = step?.seconds ? Math.min(1, stepElapsed / step.seconds) : 0;
  const R = 46;
  const C = 2 * Math.PI * R;
  const totalPlanned = steps.reduce((n, s) => n + (s.seconds ?? 0), 0);
  const plannedDistance = steps.reduce((n, s) => n + (s.distanceM ?? 0), 0);
  const lapRows = steps.flatMap((s, i) => (s.lap && laps[`${s.lap.segment_id}:${s.lap.rep_index}`] != null ? [{ i, s, sec: laps[`${s.lap.segment_id}:${s.lap.rep_index}`] }] : []));
  const setRows = steps.flatMap((s, i) => (s.set && sets[s.set.set_id] ? [{ i, s, v: sets[s.set.set_id] }] : []));
  const bestLap = lapRows.length ? Math.min(...lapRows.map((l) => l.sec / (l.s.distanceM || 1))) : null;

  const stepper = (label: string, value: number | null, unit: string, delta: number, onChange: (v: number | null) => void) => (
    <div className="grid justify-items-center gap-1">
      <span className="text-[11px] uppercase tracking-[0.14em] text-white/50">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`${label} −`} onClick={() => onChange(Math.max(0, Math.round(((value ?? 0) - delta) * 100) / 100))} className="grid size-11 place-content-center rounded-full bg-white/10">
          <Minus className="size-4" />
        </button>
        <span className="num min-w-[4.5rem] text-center text-2xl font-semibold tabular-nums">
          {value ?? "–"}
          {value != null && unit ? <span className="text-sm font-normal text-white/50"> {unit}</span> : null}
        </span>
        <button type="button" aria-label={`${label} +`} onClick={() => onChange(Math.round(((value ?? 0) + delta) * 100) / 100)} className="grid size-11 place-content-center rounded-full bg-white/10">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );

  const overlay = (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] flex h-dvh flex-col bg-[#0a0a0b] text-white">
      <div className="h-1 shrink-0 bg-white/10">
        <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>

      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="grid min-w-0">
          <span className="text-[11px] uppercase tracking-[0.16em] text-white/50">
            {phase === "ready" ? tl("Plan treningu", "Workout plan") : phase === "done" ? tl("Podsumowanie", "Summary") : `${tl("Krok", "Step")} ${idx + 1} / ${steps.length}`}
          </span>
          <span className="truncate text-sm font-medium">{title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {phase === "go" ? (
            <span className={cn("num mr-1 text-sm tabular-nums", running ? "text-white/70" : "text-accent")}>
              {formatDuration(elapsed)}
              {running ? "" : ` · ${tl("pauza", "paused")}`}
            </span>
          ) : null}
          <button type="button" onClick={toggleVoice} className="grid size-10 place-content-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" aria-label={voice ? tl("Wyłącz głos", "Voice off") : tl("Włącz głos", "Voice on")} aria-pressed={voice}>
            {voice ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </button>
          <button type="button" onClick={close} className="grid size-10 place-content-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" aria-label={tl("Zamknij", "Close")}>
            <X className="size-5" />
          </button>
        </div>
      </header>

      {confirmExit ? (
        <div className="mx-4 mb-2 grid shrink-0 gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-sm">
          <span>{tl("Wyjść z treningu? Możesz wrócić później: postęp zostaje na tym telefonie.", "Leave the workout? You can come back later: progress stays on this phone.")}</span>
          <span className="flex flex-wrap gap-2">
            <button type="button" className="rounded-md bg-white px-3 py-1.5 font-semibold text-black" onClick={() => setConfirmExit(false)}>
              {tl("Wracam", "Keep going")}
            </button>
            <button type="button" className="rounded-md px-3 py-1.5 text-white/80 hover:bg-white/10" onClick={() => quit(false)}>
              {tl("Wyjdź, dokończę później", "Leave, finish later")}
            </button>
            <button type="button" className="rounded-md px-3 py-1.5 text-white/50 hover:bg-white/10" onClick={() => quit(true)}>
              {tl("Przerwij i wyczyść", "Stop and discard")}
            </button>
          </span>
        </div>
      ) : null}

      {phase === "ready" ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {resume ? (
              <div className="mb-4 grid gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4">
                <p className="text-sm">
                  {tl("Masz niedokończony trening", "You have an unfinished workout")}: {tl("krok", "step")} {resume.idx + 1}/{steps.length}, {formatDuration(resume.totalBase + (resume.since ? (Date.now() - resume.since) / 1000 : 0))}.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="accent" className="rounded-full" onClick={resumeSaved}>
                    <Play className="size-4" /> {tl("Wznów", "Resume")}
                  </Button>
                  <Button variant="ghost" className="rounded-full text-white hover:bg-white/10" onClick={() => setResume(null)}>
                    <RotateCcw className="size-4" /> {tl("Zacznij od nowa", "Start over")}
                  </Button>
                </div>
              </div>
            ) : null}
            <p className="mb-3 text-[13px] text-white/60">
              {join([
                tl(`${steps.length} kroków`, `${steps.length} steps`),
                plannedDistance ? `${tl("ok.", "approx.")} ${formatDistance(plannedDistance)}` : null,
                totalPlanned ? `${tl("odliczane", "timed")} ${formatDuration(totalPlanned)}` : null,
              ])}
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
            <p className="mt-4 text-[12px] leading-relaxed text-white/45">
              {isRun
                ? tl("Odcinki na czas odliczają się same. Odcinki na dystans kończysz przyciskiem „Gotowe”: czas zapisze się jako okrążenie. Ekran nie zgaśnie, a jeśli zamkniesz kartę, trening wznowisz od tego samego miejsca.", "Timed steps count down on their own. End distance steps with “Done”: the time is saved as a lap. The screen stays on, and if you close the tab you can resume where you stopped.")
                : tl("Po każdej serii zapisz powtórzenia i ciężar, potem „Seria zrobiona”. Przerwy odliczają się same.", "After each set log reps and load, then “Set done”. Rest counts down on its own.")}
            </p>
          </div>
          <footer className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
            <Button variant="accent" size="lg" className="h-14 w-full rounded-full text-base" onClick={begin}>
              <Play className="size-5" /> {resume ? tl("Start od początku", "Start from the beginning") : tl("Start", "Start")}
            </Button>
          </footer>
        </>
      ) : phase === "done" ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid justify-items-center gap-2 py-6 text-center">
              <span className="grid size-14 place-content-center rounded-full bg-accent">
                <Check className="size-7" />
              </span>
              <p className="text-2xl font-semibold">{tl("Trening zrobiony", "Workout done")}</p>
              <p className="num text-5xl font-semibold tabular-nums">{formatDuration(elapsed)}</p>
              <p className="text-sm text-white/60">
                {join([
                  `${doneSteps.length}/${steps.length} ${tl("kroków", "steps")}`,
                  isRun && result().distanceM ? `${tl("ok.", "approx.")} ${formatDistance(result().distanceM)}` : null,
                  setRows.length ? `${setRows.length} ${tl("serii", "sets")}` : null,
                ])}
              </p>
            </div>
            {lapRows.length ? (
              <div className="grid gap-1.5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">{tl("Okrążenia", "Laps")}</p>
                {lapRows.map(({ i, s, sec }) => {
                  const pace = s.distanceM ? sec / (s.distanceM / 1000) : null;
                  const best = bestLap != null && s.distanceM && Math.abs(sec / s.distanceM - bestLap) < 1e-9;
                  return (
                    <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 rounded-lg bg-white/[0.04] px-3 py-2.5 text-sm">
                      <span className="truncate">
                        {s.name} {s.counter ?? ""} <span className="text-white/40">· {s.goal}</span>
                      </span>
                      <span className="num font-semibold tabular-nums">{formatDuration(sec)}</span>
                      <span className={cn("num w-20 text-right tabular-nums", best ? "text-accent" : "text-white/60")}>{pace ? `${formatPace(pace)}/km` : ""}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {setRows.length ? (
              <div className="grid gap-1.5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">{tl("Serie", "Sets")}</p>
                {setRows.map(({ i, s, v }) => (
                  <div key={i} className="flex items-center justify-between gap-4 rounded-lg bg-white/[0.04] px-3 py-2.5 text-sm">
                    <span className="truncate">
                      {s.name} {s.counter ?? ""}
                    </span>
                    <span className="num tabular-nums">{join([v.reps != null ? `${v.reps} ${tl("powt.", "reps")}` : null, v.load_kg != null ? formatKg(v.load_kg) : null])}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <footer className="grid shrink-0 gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
            <Button variant="accent" size="lg" className="h-14 w-full rounded-full text-base" onClick={finish}>
              {tl("Wpisz wyniki do formularza", "Fill in the result form")}
            </Button>
            <p className="text-center text-[12px] text-white/45">{tl("Sprawdzisz je, dodasz samopoczucie i zapiszesz.", "You can check them, add how it felt and save.")}</p>
          </footer>
        </>
      ) : step ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(0.5rem,2dvh,1.25rem)] overflow-y-auto px-6 text-center">
            <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]", KIND_STYLE[step.kind])}>{tl(KIND_LABEL[step.kind][0], KIND_LABEL[step.kind][1])}</span>
            <p className="max-w-full text-[clamp(1.5rem,6vw,2.25rem)] font-semibold leading-tight">
              {step.name}
              {step.counter ? <span className="text-white/50"> {step.counter}</span> : null}
            </p>

            <div className="relative grid aspect-square w-[min(66vw,34dvh,290px)] shrink-0 place-content-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
                <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="3" />
                {step.seconds ? (
                  <circle cx="50" cy="50" r={R} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(ring * C).toFixed(1)} ${C.toFixed(1)}`} className="transition-[stroke-dasharray] duration-300 ease-linear" />
                ) : null}
              </svg>
              {left != null ? (
                <span className="grid gap-1">
                  <span className="num text-[clamp(2.75rem,14vw,4.5rem)] font-semibold leading-none tabular-nums">{formatDuration(Math.max(0, left))}</span>
                  <span className="text-[12px] text-white/50">
                    {tl("z", "of")} {formatDuration(step.seconds)}
                  </span>
                </span>
              ) : (
                <span className="grid gap-1">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-white/50">{tl("Cel", "Target")}</span>
                  <span className="num text-[clamp(1.75rem,9vw,3rem)] font-semibold leading-none">{step.goal}</span>
                  <span className="num mt-1 text-lg tabular-nums text-white/70">{formatDuration(stepElapsed)}</span>
                </span>
              )}
            </div>

            {step.how ? <p className="max-w-sm text-[15px] leading-snug text-white/75">{step.how}</p> : null}

            {step.set ? (
              <div className="flex flex-wrap justify-center gap-6">
                {stepper(tl("Powtórzenia", "Reps"), draft.reps, "", 1, (v) => setDraft((d) => ({ ...d, reps: v })))}
                {stepper(tl("Ciężar", "Load"), draft.load_kg, "kg", 2.5, (v) => setDraft((d) => ({ ...d, load_kg: v })))}
              </div>
            ) : null}

            {flash ? <p className="num rounded-full bg-white/10 px-4 py-1.5 text-sm tabular-nums">{tl("Ostatni odcinek", "Last rep")}: {flash}</p> : null}
          </div>

          <footer className="grid shrink-0 gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
            <p className="truncate text-center text-[13px] text-white/50">
              {next ? `${tl("Następnie", "Next")}: ${next.name}${next.counter ? ` ${next.counter}` : ""} · ${next.goal}` : tl("To ostatni krok", "This is the last step")}
            </p>
            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-center gap-2">
              <button type="button" onClick={() => go(idx - 1, false)} disabled={idx === 0} className="grid size-14 place-content-center rounded-full bg-white/10 disabled:opacity-30" aria-label={tl("Poprzedni krok", "Previous step")}>
                <ChevronLeft className="size-6" />
              </button>
              {step.seconds == null ? (
                <button type="button" onClick={() => go(idx + 1)} disabled={!running} className="flex h-14 items-center justify-center gap-2 rounded-full bg-accent text-base font-semibold text-white disabled:opacity-40">
                  <Check className="size-5" /> {step.set ? tl("Seria zrobiona", "Set done") : tl("Gotowe", "Done")}
                </button>
              ) : (
                <button type="button" onClick={togglePause} className="flex h-14 items-center justify-center gap-2 rounded-full border border-white/20 text-base font-semibold text-white">
                  {running ? <Pause className="size-5" /> : <Play className="size-5" />} {running ? tl("Pauza", "Pause") : tl("Wznów", "Resume")}
                </button>
              )}
              <button type="button" onClick={() => go(idx + 1)} className="grid size-14 place-content-center rounded-full bg-white/10" aria-label={tl("Następny krok", "Next step")}>
                <ChevronRight className="size-6" />
              </button>
            </div>
            {step.seconds == null ? (
              <button type="button" onClick={togglePause} className="mx-auto flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white">
                {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />} {running ? tl("Pauza", "Pause") : tl("Wznów", "Resume")}
              </button>
            ) : null}
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
