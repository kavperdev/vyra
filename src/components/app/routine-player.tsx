"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Pause, Play, SkipBack, SkipForward, Lock, Check } from "lucide-react";
import { ExerciseAnim } from "@/components/app/exercise-anim";
import { useAccess } from "@/components/app/access";
import { TrialForm } from "@/components/app/trial-form";
import { celebrate } from "@/components/app/motion";
import { exercise } from "@/lib/app/exercises";
import { addRun } from "@/lib/app/log";
import { levelFromDone, timeline, totalMin, type Routine } from "@/lib/app/routines";
import { todayWaw, useStore } from "@/lib/app/store";
import { cn } from "@/lib/utils";

const KEY = "vyra-routines";

function beep(hi = false) {
  try {
    const W = window as unknown as { __ac?: AudioContext; webkitAudioContext?: typeof AudioContext };
    const ac = (W.__ac ??= new (window.AudioContext || W.webkitAudioContext!)());
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.value = hi ? 1180 : 760;
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + (hi ? 0.35 : 0.15));
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 0.4);
    navigator.vibrate?.(hi ? [80, 60, 80] : 30);
  } catch {
    /* no audio */
  }
}

/** Plays a set: animation, countdown, what's next. Ends by saving it to the diary. */
export function RoutinePlayer({ r }: { r: Routine }) {
  const { premium } = useAccess();
  const [done, setDone] = useStore<Record<string, number>>(KEY, {});
  const level = r.method ? levelFromDone(done[r.slug] ?? 0) : 1;
  const beats = useMemo(() => timeline(r, level), [r, level]);
  const [on, setOn] = useState(false);
  const [i, setI] = useState(-1); // -1 = intro
  const [left, setLeft] = useState(beats[0].sec);
  const [finished, setFinished] = useState(false);
  const lock = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [on]);

  useEffect(() => {
    if (!on) return;
    if (left > 0 && left <= 3) beep();
    if (left > 0) return;
    const n = i + 1;
    if (n >= beats.length) {
      setOn(false);
      setFinished(true);
      return;
    }
    beep(true);
    setI(n);
    setLeft(beats[n].sec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  useEffect(() => {
    if (!finished) return;
    const sec = beats.reduce((s, b) => s + (b.kind === "ready" ? 0 : b.sec), 0);
    addRun({ day: todayWaw(), km: 0, sec, rpe: 0, note: r.name, sport: r.sport === "run" ? "other" : r.sport, ref: `routine:${r.slug}` });
    setDone({ ...done, [r.slug]: (done[r.slug] ?? 0) + 1 });
    lock.current?.release().catch(() => {});
    celebrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const start = async () => {
    beep(true);
    setI(0);
    setLeft(beats[0].sec);
    setOn(true);
    try {
      lock.current = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null;
    } catch {
      /* not supported */
    }
  };
  const jump = (d: number) => {
    const n = Math.max(0, Math.min(beats.length - 1, i + d));
    setI(n);
    setLeft(beats[n].sec);
  };

  if (r.method && !premium)
    return (
      <div className="grid gap-3">
        <ExerciseAnim anim={exercise(r.steps[0].ex)!.anim} className="aspect-[4/3] w-full opacity-60" />
        <div className="rounded-[22px] border border-white/[0.08] bg-[#111113] p-5">
          <p className="flex items-center gap-2 text-[17px] font-semibold">
            <Lock className="size-4" /> W VYRA Method
          </p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/60">Program siły rośnie razem z Tobą: co 4 treningi więcej czasu pracy i dodatkowa runda. Za darmo masz „Siłę na start”.</p>
          <TrialForm className="mt-4" />
          <Link href="/app/zestaw/sila-start" className="mt-3 block text-center text-[13px] text-white/55">
            Zrób darmową Siłę na start
          </Link>
        </div>
      </div>
    );

  if (finished)
    return (
      <div className="grid gap-3 pt-6 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-400 text-black">
          <Check className="size-8" strokeWidth={3} />
        </span>
        <p className="text-[24px] font-semibold">Zrobione</p>
        <p className="text-[14px] text-white/55">Zapisane w dzienniku. {r.method ? `Ukończone: ${(done[r.slug] ?? 0)}×. Poziom ${levelFromDone(done[r.slug] ?? 0)} z 4.` : ""}</p>
        <Link href="/app" className="mt-4 rounded-full bg-white py-3.5 text-[15px] font-semibold text-black">
          Wróć na Dziś
        </Link>
      </div>
    );

  if (i < 0)
    return (
      <div className="grid gap-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Czas", `${totalMin(r, level)} min`],
            ["Rundy", String(r.method && level >= 3 ? r.rounds + 1 : r.rounds)],
            [r.method ? "Poziom" : "Ćwiczeń", r.method ? `${level} z 4` : String(new Set(r.steps.map((s) => s.ex)).size)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[16px] border border-white/[0.06] bg-[#111113] py-3">
              <p className="text-[11.5px] text-white/45">{k}</p>
              <p className="mt-0.5 text-[18px] font-semibold tabular-nums">{v}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {r.steps.map((s, k) => {
            const e = exercise(s.ex)!;
            return (
              <div key={k} className="rounded-[16px] border border-white/[0.06] bg-[#111113] p-1">
                <ExerciseAnim anim={e.anim} className="aspect-[4/3]" />
                <p className="mt-1 truncate px-1 text-[11.5px] font-medium">{e.name}</p>
                <p className="mb-0.5 px-1 text-[11px] tabular-nums text-white/45">{s.sec + (r.method ? (level - 1) * 5 : 0)} s</p>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={start} className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] py-4 text-[16px] font-semibold text-white active:scale-[0.98]">
          <Play className="size-5" fill="currentColor" /> Start
        </button>
        <p className="text-center text-[12px] text-white/40">Dźwięk i wibracja przy każdej zmianie. Ekran nie zgaśnie.</p>
      </div>
    );

  const b = beats[i];
  const e = exercise(b.ex)!;
  const next = beats.slice(i + 1).find((x) => x.kind === "work");
  const pct = 1 - left / b.sec;
  return (
    <div className="grid gap-3">
      <div className="flex gap-1">
        {beats.filter((x) => x.kind === "work").map((x, k) => {
          const pos = beats.indexOf(x);
          return <span key={k} className={cn("h-1 flex-1 rounded-full", pos < i ? "bg-white/50" : pos === i ? "bg-[var(--accent)]" : "bg-white/10")} />;
        })}
      </div>
      <div className="relative">
        <ExerciseAnim anim={e.anim} className={cn("aspect-[4/3] w-full transition", b.kind !== "work" && "opacity-50")} />
        <span className={cn("absolute left-3 top-3 rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em]", b.kind === "work" ? "bg-[var(--accent)] text-white" : "bg-white text-black")}>
          {b.kind === "work" ? "Pracuj" : b.kind === "ready" ? "Przygotuj się" : "Przerwa · teraz"}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[12px] tabular-nums text-white/80">runda {b.round}</span>
      </div>
      <div className="text-center">
        <p className="text-[22px] font-semibold leading-tight">{e.name}</p>
        <p className="mt-0.5 text-[13.5px] text-white/50">{b.note ?? e.cues[0]}</p>
        <p className="mt-2 text-[72px] font-light leading-none tabular-nums tracking-tight">{left}</p>
        <div className="mx-auto mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className={cn("h-full rounded-full transition-[width] duration-1000 ease-linear", b.kind === "work" ? "bg-[var(--accent)]" : "bg-white/60")} style={{ width: `${pct * 100}%` }} />
        </div>
      </div>
      <div className="mt-1 grid grid-cols-3 items-center">
        <button type="button" aria-label="Wstecz" onClick={() => jump(-1)} className="mx-auto grid size-12 place-items-center rounded-full bg-white/[0.06] active:scale-90">
          <SkipBack className="size-5" />
        </button>
        <button type="button" aria-label={on ? "Pauza" : "Wznów"} onClick={() => setOn(!on)} className="mx-auto grid size-16 place-items-center rounded-full bg-white text-black active:scale-90">
          {on ? <Pause className="size-7" fill="currentColor" /> : <Play className="size-7" fill="currentColor" />}
        </button>
        <button type="button" aria-label="Dalej" onClick={() => jump(1)} className="mx-auto grid size-12 place-items-center rounded-full bg-white/[0.06] active:scale-90">
          <SkipForward className="size-5" />
        </button>
      </div>
      {next ? (
        <p className="text-center text-[13px] text-white/45">
          Następne: <span className="text-white/80">{exercise(next.ex)?.name}</span>
        </p>
      ) : null}
    </div>
  );
}

export const RoutineBack = () => (
  <Link href="/app/cwiczenia" className="-ml-1 flex w-fit items-center gap-0.5 text-[14px] text-white/55">
    <ChevronLeft className="size-5" /> Ćwiczenia
  </Link>
);
