"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import type { PlanSession } from "@/components/app/plan-today";
import { PHOTOS, type PhotoKey } from "@/components/app/ui";
import { GOAL_DISTS, buildPlan, todayLocal, type GoalPlan, type GoalSession, type GoalStore } from "@/lib/app/goal-plan";
import { readGoal } from "@/lib/app/goal-store";
import { fmtPace } from "@/lib/method/engine";
import { useLog } from "@/lib/app/log";
import { todayWaw, useStoreTick } from "@/lib/app/store";
import { cn } from "@/lib/utils";

const DOW = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const add = (s: string, n: number) => new Date(Date.parse(`${s}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const kmFmt = (n: number) => (Math.round(n * 10) / 10).toString().replace(".", ",");

/** The runner's own race plan from this phone, if any. */
function useGoalPlan(): { goal: GoalStore | null; plan: GoalPlan | null } {
  const tick = useStoreTick();
  const [state, setState] = useState<{ goal: GoalStore | null; plan: GoalPlan | null }>({ goal: null, plan: null });
  useEffect(() => {
    const g = readGoal();
    setState(g && g.race >= todayLocal() ? { goal: g, plan: buildPlan(g, todayLocal()) } : { goal: null, plan: null });
  }, [tick]);
  return state;
}

/**
 * Top of Dziś: the programme you are on (a pill that opens the Plan) and this week as a quiet strip,
 * dots under the days with training.
 */
export function TodayTop({ planned = [], hasPlan }: { planned?: { date: string; done: boolean }[]; hasPlan: boolean }) {
  const log = useLog();
  const { goal, plan } = useGoalPlan();
  const today = todayWaw();
  const monday = add(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() || 7) - 1));
  const days = Array.from({ length: 7 }, (_, i) => add(monday, i));
  const goalDays = new Set(plan ? plan.weeks.flatMap((w) => w.sessions).map((s) => s.date) : []);
  const weekIdx = plan ? plan.weeks.findIndex((w, i) => today >= w.monday && (i === plan.weeks.length - 1 || today < plan.weeks[i + 1].monday)) : -1;

  const label = goal && plan ? `${GOAL_DISTS.find((d) => d.k === goal.dist)?.label ?? "Plan"} · Tydz. ${Math.max(1, weekIdx + 1)}/${plan.weeks.length}` : hasPlan ? "Twój plan" : "Wybierz program";

  return (
    <div className="grid gap-4">
      <div className="flex justify-center">
        <Link href="/app/cel" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-4 text-[13px] text-white/80 active:scale-95">
          {label}
          <ChevronRight className="size-3.5 text-white/45" />
        </Link>
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const isToday = d === today;
          const done = log.some((r) => r.day === d) || planned.some((p) => p.date === d && p.done);
          const planOn = goalDays.has(d) || planned.some((p) => p.date === d);
          return (
            <div key={d} className="flex flex-col items-center gap-1.5">
              <span className={cn("text-[11px]", isToday ? "font-semibold text-white" : "text-white/35")}>{DOW[i]}</span>
              <span className={cn("text-[14px] tabular-nums", isToday ? "font-semibold text-white" : "text-white/45")}>{Number(d.slice(8))}</span>
              <span aria-label={done ? "zrobione" : planOn ? "zaplanowane" : undefined} className={cn("size-[5px] rounded-full", done ? "bg-white" : planOn ? "bg-white/30" : "bg-transparent")} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Hero = { title: string; sub: string; photo: PhotoKey; stats: { v: string; l: string }[]; href: string; done: boolean; locked?: boolean };

const photoFor = (kind: string, category?: string | null): PhotoKey =>
  kind === "strength" ? "legs" : kind === "long" || category === "long" ? "road" : kind === "quality" || ["tempo", "threshold", "intervals", "fartlek", "hills", "race_pace", "test", "race"].includes(category ?? "") ? "track" : "night";

/**
 * Today's session as a black-and-white photo with its name and three numbers. A rest day gets a calm
 * empty state with the week in numbers and one button to log something.
 */
export function SessionHero({ sessions = [], hasPlan = false, method = false }: { sessions?: PlanSession[]; hasPlan?: boolean; method?: boolean }) {
  const log = useLog();
  const { plan } = useGoalPlan();
  const today = todayWaw();
  const monday = add(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() || 7) - 1));
  const week = log.filter((r) => r.day >= monday && r.day <= today);
  const ranToday = log.filter((r) => r.day === today);

  let hero: Hero | null = null;
  const s = sessions.find((x) => x.status === "planned") ?? sessions[0];
  if (s) {
    const min = s.planned_duration_s ? Math.round(s.planned_duration_s / 60) : null;
    hero = {
      title: s.title,
      sub: s.kind === "strength" ? "Siła" : "Trening z Twojego planu",
      photo: photoFor(s.kind, s.category),
      stats: [
        { v: s.km ? `${kmFmt(s.km)} km` : "–", l: "Dystans" },
        { v: min ? `${min} min` : "–", l: "Czas" },
        { v: s.kind === "strength" ? "Siła" : s.category && s.category !== "easy" ? "Akcent" : "Spokojnie", l: "Typ" },
      ],
      href: `/athlete/sessions/${s.id}`,
      done: s.status === "completed" || s.status === "partial",
    };
  } else if (plan) {
    const g: GoalSession | undefined = plan.weeks.flatMap((w) => w.sessions).find((x) => x.date === today);
    if (g) {
      const w = plan.weeks.findIndex((x) => today >= x.monday && today <= add(x.monday, 6));
      hero = {
        title: g.title,
        sub: `Tydzień ${w + 1}/${plan.weeks.length} · ${plan.weeks[w]?.phase ?? ""}`,
        photo: photoFor(g.kind),
        // Free: the shape of the plan, not the numbers (those are VYRA Method).
        locked: !method,
        stats: [
          { v: method ? `${kmFmt(g.km)} km` : "•••", l: "Dystans" },
          { v: method && g.pace ? fmtPace(g.pace[0]) : "•••", l: "Tempo /km" },
          { v: g.kind === "quality" ? "Akcent" : g.kind === "long" ? "Długi" : g.kind === "race" ? "Start" : "Spokojnie", l: "Typ" },
        ],
        href: method ? "/app/cel" : "/app/sklep",
        done: ranToday.length > 0,
      };
    }
  }

  // A rest day in a plan: the readiness card below already says so, once is enough.
  if (!hero && (hasPlan || plan)) return null;
  if (!hero) {
    const km = week.reduce((a, r) => a + r.km, 0);
    const hours = week.reduce((a, r) => a + r.sec, 0) / 3600;
    return (
      <section className="flex min-h-[300px] flex-col items-center justify-center rounded-[26px] bg-[radial-gradient(120%_80%_at_50%_0%,#1c1c1f_0%,#0a0a0b_70%)] px-6 py-10 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">Dziś</p>
        <p className="mt-2 text-[26px] font-semibold tracking-[-0.02em]">{ranToday.length ? "Zrobione" : "Nie masz jeszcze planu"}</p>
        <p className="mt-1.5 max-w-[32ch] text-[13.5px] leading-snug text-white/45">
          {ranToday.length ? "Trening jest w dzienniku. Odpocznij dobrze." : "Ułóż plan pod swój start, a tu codziennie zobaczysz, co masz zrobić. Pierwsze 14 dni za darmo."}
        </p>
        <Stats stats={[{ v: String(week.length), l: "Treningi" }, { v: kmFmt(km), l: "Km w tyg." }, { v: kmFmt(hours), l: "Godziny" }]} />
        <Link href="/app/cel" className="mt-7 inline-flex h-12 w-full max-w-[320px] items-center justify-center rounded-full bg-white text-[15px] font-semibold text-black active:scale-[0.98]">
          Ułóż plan pod start
        </Link>
        <Link href="/app/dziennik?add=1" className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] text-white/60">
          <Plus className="size-3.5" /> Dodaj trening
        </Link>
      </section>
    );
  }

  return (
    <Link href={hero.href} className="relative block overflow-hidden rounded-[26px] active:scale-[0.99]" data-tour="today-session">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PHOTOS[hero.photo]} alt="" aria-hidden className="absolute inset-0 size-full object-cover grayscale contrast-[1.2] brightness-90" />
      <span aria-hidden className="app-grain absolute inset-0" />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
      <div className="relative flex min-h-[380px] flex-col justify-end p-5">
        {hero.done ? <span className="mb-auto self-start rounded-full bg-white/15 px-3 py-1 text-[12px] font-medium backdrop-blur">Zrobione ✓</span> : null}
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-white/60">{hero.sub}</p>
        <p className="mt-1.5 text-[30px] font-semibold leading-[1.05] tracking-[-0.025em]">{hero.title}</p>
        <Stats stats={hero.stats} />
        {hero.locked ? (
          <span className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-white text-[14.5px] font-semibold text-black">Odblokuj tempa: 14 dni za darmo</span>
        ) : null}
      </div>
    </Link>
  );
}

function Stats({ stats }: { stats: { v: string; l: string }[] }) {
  return (
    <div className="mt-5 grid w-full grid-cols-3 divide-x divide-white/15">
      {stats.map((x) => (
        <div key={x.l} className="flex flex-col items-center gap-0.5 px-2">
          <span className="text-[18px] font-semibold tabular-nums">{x.v}</span>
          <span className="text-[11px] text-white/45">{x.l}</span>
        </div>
      ))}
    </div>
  );
}
