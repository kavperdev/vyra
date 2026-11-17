"use client";

import { useEffect, useState } from "react";
import { useLog } from "@/lib/app/log";
import { todayWaw, useStoreTick } from "@/lib/app/store";
import { readGoal } from "@/lib/app/goal-store";
import { buildPlan, todayLocal } from "@/lib/app/goal-plan";
import { cn } from "@/lib/utils";

const add = (s: string, n: number) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const LETTERS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

/** This week at a glance: which days were run, which are planned, and today. */
export function WeekStrip({ planned = [] }: { planned?: { date: string; done: boolean }[] }) {
  const log = useLog();
  const tick = useStoreTick();
  const [goalDays, setGoalDays] = useState<string[]>([]);
  const today = todayWaw();
  const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() || 7) - 1;
  const monday = add(today, -dow);
  const days = Array.from({ length: 7 }, (_, i) => add(monday, i));

  useEffect(() => {
    const g = readGoal();
    if (!g || g.race < today) return setGoalDays([]);
    const all = buildPlan(g, todayLocal()).weeks.flatMap((w) => w.sessions);
    setGoalDays(all.filter((s) => s.date >= monday && s.date <= add(monday, 6)).map((s) => s.date));
  }, [tick, today, monday]);

  const km = (d: string) => log.filter((r) => r.day === d).reduce((s, r) => s + r.km, 0);
  const total = days.reduce((s, d) => s + km(d), 0);
  const plannedOn = (d: string) => goalDays.includes(d) || planned.some((p) => p.date === d);
  const doneOn = (d: string) => km(d) > 0 || planned.some((p) => p.date === d && p.done);

  return (
    <div className="mt-4 rounded-[20px] border border-white/[0.06] bg-[#111113] p-3">
      <div className="flex items-baseline justify-between px-1">
        <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-white/45">Ten tydzień</p>
        <p className="text-[13px] tabular-nums text-white/70">{total ? `${total.toFixed(1).replace(".", ",")} km` : "jeszcze bez biegu"}</p>
      </div>
      <div className="mt-2.5 grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const isToday = d === today;
          const done = doneOn(d);
          const plan = plannedOn(d);
          return (
            <div key={d} className={cn("flex flex-col items-center gap-1 rounded-[14px] py-2", isToday && "bg-white/[0.08]")}>
              <span className={cn("text-[11px]", isToday ? "text-white" : "text-white/40")}>{LETTERS[i]}</span>
              <span className={cn("text-[15px] tabular-nums", isToday ? "font-semibold text-white" : "text-white/75")}>{Number(d.slice(8))}</span>
              <span
                aria-label={done ? "zrobione" : plan ? "zaplanowane" : undefined}
                className={cn("size-2 rounded-full", done ? "bg-[#ff5a60]" : plan ? "border border-white/50" : "bg-transparent")}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
