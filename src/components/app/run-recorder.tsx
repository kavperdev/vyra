"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, MapPin, Pause, Play, Square, Volume2, VolumeX, X } from "lucide-react";
import { Portal } from "@/components/app/sheet";
import { addRun } from "@/lib/app/log";
import { completeRef } from "@/lib/app/plans";
import { useGps } from "@/lib/app/gps";
import { fmtPace, fmtTime } from "@/lib/method/engine";
import { cn } from "@/lib/utils";

const plural = (n: number, a: string, b: string, c: string) => (n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
const sayTime = (sec: number) => {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return [m ? `${m} ${plural(m, "minuta", "minuty", "minut")}` : "", r ? `${r} ${plural(r, "sekunda", "sekundy", "sekund")}` : ""].filter(Boolean).join(" ");
};
function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pl-PL";
    u.rate = 1.05;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* no speech */
  }
}
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());

/** Free run with GPS: time, distance, pace, a voice split every kilometre, saved to the run log. */
export function RunRecorder() {
  const [phase, setPhase] = useState<"ready" | "go" | "done">("ready");
  const [running, setRunning] = useState(false);
  const [base, setBase] = useState(0);
  const [since, setSince] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [voice, setVoice] = useState(true);
  const [rpe, setRpe] = useState(4);
  const [saved, setSaved] = useState(false);
  // A session from a plan: /app/bieg?ref=goal:…&t=title&p=fast-slow (s/km)
  const [target, setTarget] = useState<{ ref: string; title: string; pace: [number, number] | null } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const ref = q.get("ref");
    if (!ref) return;
    const p = (q.get("p") ?? "").split("-").map(Number);
    setTarget({ ref, title: q.get("t") ?? "Trening z planu", pace: p.length === 2 && p.every((x) => x > 0) ? [p[0], p[1]] : null });
  }, []);
  const gps = useGps(phase === "go", !running);
  const splits = useRef<number[]>([]);
  const lastKmAt = useRef(0);
  const lock = useRef<WakeLockSentinel | null>(null);

  const elapsed = base + (since ? (now - since) / 1000 : 0);
  const km = gps.dist / 1000;

  useEffect(() => {
    if (phase !== "go") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    navigator.wakeLock
      ?.request("screen")
      .then((l) => {
        lock.current = l;
      })
      .catch(() => undefined);
    return () => {
      clearInterval(id);
      lock.current?.release().catch(() => undefined);
    };
  }, [phase]);

  // Voice split every kilometre.
  useEffect(() => {
    if (phase !== "go") return;
    const k = Math.floor(km);
    if (k > splits.current.length) {
      const split = elapsed - lastKmAt.current;
      splits.current.push(split);
      lastKmAt.current = elapsed;
      navigator.vibrate?.([150, 80, 150]);
      const tp = target?.pace;
      const cue = tp ? (split < tp[0] - 3 ? " Zwolnij." : split > tp[1] + 3 ? " Przyspiesz." : " Dobre tempo.") : "";
      if (voice) speak(`Kilometr ${k}. Czas ${sayTime(elapsed)}. Ostatni kilometr ${sayTime(split)}.${cue}`);
    }
  }, [km, phase, elapsed, voice, target]);

  const start = () => {
    setPhase("go");
    setRunning(true);
    setSince(Date.now());
    splits.current = [];
    lastKmAt.current = 0;
    if (voice) speak("Start. Powodzenia.");
  };
  const toggle = () => {
    if (running) {
      setBase(elapsed);
      setSince(null);
      setRunning(false);
    } else {
      setSince(Date.now());
      setRunning(true);
    }
  };
  const stop = () => {
    setBase(elapsed);
    setSince(null);
    setRunning(false);
    setPhase("done");
    if (voice) speak(`Koniec. ${km.toFixed(2).replace(".", " przecinek ")} kilometra w ${sayTime(elapsed)}.`);
  };
  const save = () => {
    if (km < 0.2) return;
    addRun({ day: today(), km, sec: Math.round(elapsed), rpe, note: target ? `GPS · ${target.title}` : "GPS", ref: target?.ref, splits: splits.current.length ? splits.current.map((x) => Math.round(x)) : undefined });
    completeRef(target?.ref);
    setSaved(true);
  };
  const reset = () => location.reload();

  const avg = km > 0.05 ? elapsed / km : null;

  if (phase === "ready")
    return (
      <div className="grid gap-3">
        {target ? (
          <div className="rounded-[20px] bg-white p-5 text-black">
            <p className="text-[12px] text-black/50">Trening z Twojego planu</p>
            <p className="mt-1 text-[18px] font-semibold leading-snug">{target.title}</p>
            {target.pace ? <p className="mt-1 text-[13.5px] text-black/60">Tempo {fmtPace(target.pace[0])}–{fmtPace(target.pace[1])}/km. Głos powie, czy trzymasz tempo.</p> : null}
            <p className="mt-2 text-[12.5px] text-black/50">Po zapisaniu trening odhaczy się w planie.</p>
          </div>
        ) : null}
        <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-5 text-center">
          <p className="text-[13px] text-white/50">{target ? "Jak to działa" : "Zwykły bieg z GPS"}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-white/75">Czas, dystans i tempo na żywo. Co kilometr głos podaje czas i tempo ostatniego kilometra. Bieg zapisze się w dzienniku.</p>
        </div>
        <button type="button" onClick={start} className="flex h-16 items-center justify-center gap-2 rounded-full bg-white text-[17px] font-semibold text-black active:scale-[0.98]">
          <Play className="size-5" /> Start
        </button>
        <button type="button" onClick={() => setVoice(!voice)} className="mx-auto flex items-center gap-2 text-[13px] text-white/55">
          {voice ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />} Głos {voice ? "włączony" : "wyłączony"}
        </button>
        <p className="px-2 text-center text-[12px] leading-relaxed text-white/40">Ekran zostaje włączony, bo przeglądarka wyłącza GPS w tle. Najlepiej telefon w ręce albo na ramieniu.</p>
      </div>
    );

  return (
    <Portal>
      <div className={cn("app-native fixed inset-0 z-[80] flex flex-col bg-black px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] text-white")}>
        <div className="flex items-center justify-between">
          {phase === "done" ? (
            <Link href="/app/dziennik" aria-label="Zamknij" className="grid size-10 place-items-center rounded-full bg-white/10">
              <X className="size-5" />
            </Link>
          ) : (
            <span className="size-10" />
          )}
          <span className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px]", gps.state === "ok" ? "bg-emerald-400/15 text-emerald-300" : gps.state === "denied" ? "bg-[var(--accent)]/20 text-[#ff8a8e]" : "bg-white/10 text-white/60")}>
            <MapPin className="size-3.5" /> {gps.state === "ok" ? "GPS" : gps.state === "denied" ? "Brak zgody na GPS" : "Szukam GPS…"}
          </span>
          <button type="button" aria-label="Głos" onClick={() => setVoice(!voice)} className="grid size-10 place-items-center rounded-full bg-white/10">
            {voice ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </button>
        </div>

        <div className="grid flex-1 content-center gap-8 text-center">
          <div>
            <p className="text-[13px] uppercase tracking-wide text-white/50">Dystans</p>
            <p className="text-[96px] font-light leading-none tabular-nums">{km.toFixed(2).replace(".", ",")}</p>
            <p className="text-[14px] text-white/50">km</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-[16px] bg-white/[0.06] p-3">
              <p className="text-[11px] text-white/50">Czas</p>
              <p className="mt-1 text-[22px] tabular-nums">{fmtTime(Math.round(elapsed))}</p>
            </div>
            <div className="rounded-[16px] bg-white/[0.06] p-3">
              <p className="text-[11px] text-white/50">Tempo teraz</p>
              <p className="mt-1 text-[22px] tabular-nums">{gps.pace && running ? fmtPace(gps.pace) : "–"}</p>
            </div>
            <div className="rounded-[16px] bg-white/[0.06] p-3">
              <p className="text-[11px] text-white/50">Średnie</p>
              <p className="mt-1 text-[22px] tabular-nums">{avg ? fmtPace(avg) : "–"}</p>
            </div>
          </div>
          {splits.current.length ? (
            <div className="flex flex-wrap justify-center gap-2">
              {splits.current.map((s, i) => (
                <span key={i} className="rounded-full bg-white/[0.06] px-3 py-1 text-[12px] tabular-nums text-white/70">
                  km {i + 1}: {fmtPace(s)}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {phase === "go" ? (
          <div className="flex items-center justify-center gap-4">
            <button type="button" aria-label={running ? "Pauza" : "Wznów"} onClick={toggle} className="grid size-20 place-items-center rounded-full bg-white text-black active:scale-90">
              {running ? <Pause className="size-8" /> : <Play className="size-8" />}
            </button>
            {!running ? (
              <button type="button" aria-label="Zakończ" onClick={stop} className="grid size-20 place-items-center rounded-full bg-[var(--accent)] active:scale-90">
                <Square className="size-7" />
              </button>
            ) : null}
          </div>
        ) : saved ? (
          <div className="grid gap-2">
            <p className="flex items-center justify-center gap-2 text-[15px] text-emerald-300">
              <Check className="size-5" /> {target ? "Zapisane i odhaczone w planie" : "Zapisane w dzienniku"}
            </p>
            <Link href={target ? "/app" : "/app/dziennik"} className="flex h-14 items-center justify-center rounded-full bg-white text-[16px] font-semibold text-black">
              {target ? "Wróć do planu" : "Zobacz dziennik"}
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-center text-[13px] text-white/55">Jak ciężko było? {rpe}/10</p>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" onClick={() => setRpe(n)} className={cn("h-10 rounded-lg text-[13px] tabular-nums", rpe === n ? "bg-white text-black" : "bg-white/[0.08] text-white/60")}>
                  {n}
                </button>
              ))}
            </div>
            <button type="button" disabled={km < 0.2} onClick={save} className="h-14 rounded-full bg-white text-[16px] font-semibold text-black disabled:opacity-30">
              Zapisz bieg
            </button>
            <button type="button" onClick={reset} className="text-[13px] text-white/45">
              Odrzuć
            </button>
          </div>
        )}
      </div>
    </Portal>
  );
}
