"use client";

import { useEffect, useState } from "react";
import { GOAL_DISTS, buildPlan, todayLocal, type GoalStore } from "@/lib/app/goal-plan";
import { readGoal } from "@/lib/app/goal-store";
import { useStoreTick } from "@/lib/app/store";

type Phase = { name: string; weeks: number };

const DAY = 864e5;

/** Top of the Plan tab: the race, the countdown and the phases of the plan, with the current one lit. */
export function PlanGoalCard() {
  const tick = useStoreTick();
  const [goal, setGoal] = useState<GoalStore | null>(null);
  useEffect(() => setGoal(readGoal()), [tick]);

  const today = todayLocal();
  if (!goal || goal.race < today) return null;

  const plan = buildPlan(goal, today);
  const total = plan.weeks.length;
  const nowIdx = Math.max(0, plan.weeks.findIndex((w, i) => today >= w.monday && (i === total - 1 || today < plan.weeks[i + 1].monday)));
  // Recovery weeks belong to the phase they sit in.
  const phases: Phase[] = [];
  let curPhase = 0;
  plan.weeks.forEach((w, i) => {
    const name = w.phase === "Odpoczynek" && phases.length ? phases[phases.length - 1].name : w.phase;
    if (phases.length && phases[phases.length - 1].name === name) phases[phases.length - 1].weeks++;
    else phases.push({ name, weeks: 1 });
    if (i === nowIdx) curPhase = phases.length - 1;
  });
  const days = Math.round((Date.parse(`${goal.race}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / DAY);
  const dist = GOAL_DISTS.find((d) => d.k === goal.dist)?.label ?? "";

  return (
    <section className="mb-4 rounded-[22px] border border-white/[0.07] bg-[#111113] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-[17px] font-semibold tracking-[-0.01em]">{goal.event || goal.name || dist}</p>
        <p className="shrink-0 text-[13px] text-white/50">{days === 0 ? "Start dziś" : `Start za ${days} ${days === 1 ? "dzień" : "dni"}`}</p>
      </div>
      <p className="mt-0.5 text-[13px] text-white/50">
        {dist} · tydzień {nowIdx + 1} z {total}
      </p>
      <div className="mt-4 flex gap-1" aria-hidden>
        {phases.map((p, i) => (
          <span key={`${p.name}-${i}`} className={i === curPhase ? "h-1.5 rounded-full bg-[var(--accent)]" : i < curPhase ? "h-1.5 rounded-full bg-white/40" : "h-1.5 rounded-full bg-white/[0.12]"} style={{ flex: p.weeks }} />
        ))}
      </div>
      <div className="mt-2 flex gap-1 text-[11px] text-white/45">
        {phases.map((p, i) => (
          <span key={`${p.name}-l-${i}`} className={i === curPhase ? "truncate font-semibold text-white" : "truncate"} style={{ flex: p.weeks }}>
            {p.name}
          </span>
        ))}
      </div>
    </section>
  );
}
