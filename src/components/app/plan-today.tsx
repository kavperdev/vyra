"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Play } from "lucide-react";
import { quickComplete } from "@/lib/actions/executions";
import { logPlanned, useLog, type Sport } from "@/lib/app/log";
import { todayWaw } from "@/lib/app/store";
import { celebrate } from "@/components/app/motion";
import { SectionHead } from "@/components/app/ui";
import { cn } from "@/lib/utils";
import { ShapeBars } from "@/components/app/shape-bars";
import { instrShape } from "@/lib/app/instr-shape";

export type PlanSession = { id: string; title: string; planned_duration_s: number | null; goal: string | null; status: string; kind: string; km?: number | null; category?: string | null; instructions?: string | null };
const SPORT: Record<string, Sport> = { running: "run", strength: "gym", mobility: "mobility" };
const DONE = ["completed", "partial"];

/** Coach / VYRA Method sessions for today: one tap marks them done, and a run in the log ticks them by itself. */
export function PlanToday({ sessions, variant = "full" }: { sessions: PlanSession[]; variant?: "full" | "hero" }) {
  const router = useRouter();
  const log = useLog();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const auto = useRef(false);
  const today = todayWaw();
  const ranToday = log.filter((r) => r.day === today && !r.auto && (r.km >= 1 || r.sec >= 900));
  const isDone = (s: PlanSession) => done[s.id] || DONE.includes(s.status);

  const finish = (s: PlanSession, silent = false) => {
    setDone((d) => ({ ...d, [s.id]: true }));
    if (!silent) celebrate();
    const run = s.kind === "running" && ranToday[0] ? { km: ranToday[0].km, sec: ranToday[0].sec, day: today } : null;
    // Nothing recorded today: log the planned session, so the diary and progress count it.
    if (!run) {
      const km = s.kind === "running" ? (s.km ?? (s.planned_duration_s ? Math.round(s.planned_duration_s / 36) / 10 : 0)) : 0;
      const sec = s.planned_duration_s ?? (km ? km * 360 : 0);
      if (sec > 0) logPlanned(`sess:${s.id}`, { day: today, km, sec, title: s.title, sport: SPORT[s.kind] ?? "other" });
    }
    start(async () => {
      const r = await quickComplete(s.id, run);
      if (!r.ok) {
        setDone((d) => ({ ...d, [s.id]: false }));
        setErr(r.error);
      } else router.refresh();
    });
  };

  // A run from the watch (Strava) or the log ticks today's running session without a tap.
  useEffect(() => {
    if (auto.current || !ranToday.length) return;
    const s = sessions.find((x) => x.kind === "running" && !isDone(x));
    if (!s) return;
    auto.current = true;
    finish(s, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranToday.length]);

  if (variant === "hero") {
    return (
      <div className="grid gap-2">
        {sessions.map((s) =>
          isDone(s) ? (
            <div key={s.id} className="flex items-center gap-3 rounded-[18px] border border-emerald-400/20 bg-emerald-400/[0.07] px-3.5 py-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-400 text-black">
                <Check className="size-4" strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{s.title}</span>
              <Link href={`/athlete/sessions/${s.id}`} className="text-[12.5px] text-white/50">
                Szczegóły
              </Link>
            </div>
          ) : (
            <div key={s.id} className="rounded-[20px] bg-white p-4 text-black">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-black/45">{s.kind === "running" ? "Bieg" : s.kind === "strength" ? "Siła" : "Sprawność"} · z planu</p>
                  <p className="mt-1 text-[18px] font-semibold leading-snug tracking-[-0.01em]">{s.title}</p>
                </div>
                <div className="shrink-0 text-right text-[12.5px] font-semibold tabular-nums text-black/60">
                  {s.km && s.kind === "running" ? <p>{String(s.km).replace(".", ",")} km</p> : null}
                  {s.planned_duration_s ? <p>{Math.round(s.planned_duration_s / 60)} min</p> : null}
                </div>
              </div>
              {s.instructions ? <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-black/55">{s.instructions}</p> : null}
              <ShapeBars segs={instrShape(s.instructions, s.kind, s.category ?? null, s.km ?? null)} className="mt-3" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href={`/athlete/sessions/${s.id}`} className="flex items-center justify-center gap-2 rounded-full bg-black/[0.07] py-2.5 text-[14px] font-semibold active:scale-[0.97]">
                  <Play className="size-4" /> Otwórz
                </Link>
                <button type="button" disabled={pending} onClick={() => finish(s)} className="flex items-center justify-center gap-2 rounded-full bg-black py-2.5 text-[14px] font-semibold text-white active:scale-[0.97] disabled:opacity-60">
                  <Check className="size-4" /> Zrobione
                </button>
              </div>
            </div>
          ),
        )}
        {err ? <p className="text-[12.5px] text-red-300">{err}</p> : null}
      </div>
    );
  }

  if (!sessions.length)
    return (
      <Link href="/panel" className="mt-6 flex items-center justify-between rounded-[20px] border border-white/[0.06] bg-[#111113] px-4 py-4 active:scale-[0.985]">
        <span>
          <span className="block text-[12px] text-white/45">Dziś</span>
          <span className="block text-[15px] font-medium">Dzień bez treningu. Zobacz cały tydzień</span>
        </span>
      </Link>
    );

  const open = sessions.filter((s) => !isDone(s));
  const closed = sessions.filter(isDone);
  return (
    <>
      <SectionHead title={open.length ? "Twój trening na dziś" : "Dziś zrobione"} href="/panel" more="Cały plan" />
      {closed.map((s) => (
        <div key={s.id} className="mb-2 flex items-center gap-3 rounded-[18px] border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-400 text-black">
            <Check className="size-4" strokeWidth={3} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{s.title}</span>
          <Link href={`/athlete/sessions/${s.id}`} className="text-[12.5px] text-white/50">Szczegóły</Link>
        </div>
      ))}
      {open.map((s) => (
        <div key={s.id} className="mb-2 rounded-[22px] bg-white p-4 text-black shadow-[0_18px_50px_-18px_rgba(229,52,59,0.55)]">
          <p className="text-[12px] text-black/50">{s.kind === "running" ? "Bieg" : "Siła i sprawność"}</p>
          <p className="mt-0.5 text-[19px] font-semibold leading-snug">{s.title}</p>
          {s.goal ? <p className="mt-1 line-clamp-2 text-[13px] text-black/55">{s.goal}</p> : null}
          {s.planned_duration_s ? (
            <div className="mt-3 flex gap-6 border-t border-black/10 pt-3">
              <Stat label="Czas" value={`${Math.round(s.planned_duration_s / 60)} min`} />
            </div>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href={`/athlete/sessions/${s.id}`} className="flex items-center justify-center gap-2 rounded-full bg-black/[0.07] py-3 text-[14px] font-semibold active:scale-[0.97]">
              <Play className="size-4" /> Otwórz
            </Link>
            <button type="button" disabled={pending} onClick={() => finish(s)} className="flex items-center justify-center gap-2 rounded-full bg-black py-3 text-[14px] font-semibold text-white active:scale-[0.97] disabled:opacity-60">
              <Check className="size-4" /> Zrobione
            </button>
          </div>
        </div>
      ))}
      {err ? <p className={cn("text-[12.5px] text-red-300")}>{err}</p> : null}
    </>
  );
}

export function Stat({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div>
      <p className={cn("text-[11px] uppercase tracking-[0.08em]", dark ? "text-white/40" : "text-black/45")}>{label}</p>
      <p className="mt-0.5 text-[17px] font-semibold tabular-nums">{value}</p>
    </div>
  );
}
