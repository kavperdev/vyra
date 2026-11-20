"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "@/components/app/form-hub";
import { dayScore } from "@/lib/app/form";
import { readinessToday } from "@/lib/app/plans";
import { buildPlan, GOAL_KEY, type GoalInput } from "@/lib/app/goal-plan";
import { load, todayWaw, useStoreTick } from "@/lib/app/store";
import { useHealthSignal } from "@/components/app/health-entry";
import { useLog } from "@/lib/app/log";

/** One ring: value 0–1, a number in the middle, a short word under it. */
export function Ring({ v, color, big, small, label }: { v: number; color: string; big: string; small?: string; label: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(Math.max(0, Math.min(1, v))));
    return () => cancelAnimationFrame(t);
  }, [v]);
  return (
    <div className="flex flex-col items-center">
      <div className="relative size-[86px]">
        <svg viewBox="0 0 76 76" className="size-full -rotate-90">
          <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
          <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - shown)} style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 6px ${color}66)` }} />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-center">
          <span>
            <span className="block text-[19px] font-semibold leading-none tabular-nums">{big}</span>
            {small ? <span className="mt-0.5 block text-[10px] text-white/45">{small}</span> : null}
          </span>
        </span>
      </div>
      <span className="mt-1.5 text-[12px] font-medium text-white/70">{label}</span>
    </div>
  );
}

/**
 * Today at a glance, as rings: readiness (form balance + morning check-in), load (fatigue against
 * fitness: 100% = the safe top), and the week (kilometres done against the plan or the usual week).
 */
export function TodayRings() {
  const f = useForm();
  const log = useLog();
  const tick = useStoreTick();
  const health = useHealthSignal();
  const [ready, setReady] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  useEffect(() => {
    setReady(readinessToday());
    const g = load<GoalInput | null>(GOAL_KEY, null);
    const today = todayWaw();
    if (g) {
      const w = buildPlan(g).weeks.find((x) => today >= x.monday && today <= addDays(x.monday, 6));
      setTarget(w ? w.km : null);
    } else setTarget(null);
  }, [tick]);
  if (f.days.every((d) => !d.load) && ready == null && health.level === "none") return null;
  const s = dayScore(f, ready, health.level);
  // the usual week: average of the last 4 full weeks in the log
  const since = addDays(todayWaw(), -28);
  const usual = Math.max(10, log.filter((r) => r.day >= since).reduce((a, r) => a + r.km, 0) / 4);
  const goal = target ?? usual;
  const ratio = f.ratio ?? 0;
  const strain = Math.min(1, ratio / 1.3);
  return (
    <Link href="/app/forma" className="grid grid-cols-3 rounded-[24px] border border-white/[0.06] bg-[#111113] px-2 py-4 transition active:scale-[0.99]">
      <Ring v={(s?.score ?? 0) / 100} color={s && s.score >= 55 ? "#34d399" : s && s.score >= 35 ? "#fbbf24" : "#ff5a60"} big={s ? String(s.score) : "–"} label="Gotowość" />
      <Ring v={strain} color={ratio > 1.3 ? "#ff5a60" : ratio > 1.15 ? "#fbbf24" : "#7c8cff"} big={ratio ? `${Math.round(strain * 100)}%` : "–"} small={ratio > 1.3 ? "za dużo" : ratio < 0.8 ? "lekko" : "ok"} label="Obciążenie" />
      <Ring v={f.week.km / goal} color="#ff5a60" big={f.week.km.toFixed(f.week.km < 10 ? 1 : 0).replace(".", ",")} small={`z ${Math.round(goal)} km`} label="Tydzień" />
    </Link>
  );
}

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
