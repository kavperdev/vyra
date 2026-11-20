"use client";

/**
 * The pictures that make people come back: week ring, road to the race, runner level, body map, the year in dots
 * and the form wave. Each reads in one glance, animates once on entry and never needs a legend to make sense.
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useForm } from "@/components/app/form-hub";
import { useGuard } from "@/components/app/guard";
import { GOAL_DISTS, buildPlan, todayLocal, type GoalPlan, type GoalStore } from "@/lib/app/goal-plan";
import { readGoal } from "@/lib/app/goal-store";
import type { Light } from "@/lib/app/guard";
import { useLog } from "@/lib/app/log";
import { todayWaw, useStoreTick } from "@/lib/app/store";
import { fmtTime, timeFor, vdotOf } from "@/lib/method/engine";
import { cn } from "@/lib/utils";

const DAY = 864e5;
const add = (s: string, n: number) => new Date(Date.parse(`${s}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const mondayOf = (s: string) => add(s, -((new Date(`${s}T12:00:00Z`).getUTCDay() || 7) - 1));
const km1 = (x: number) => (Math.round(x * 10) / 10).toString().replace(".", ",");
const card = "rounded-[22px] border border-white/[0.07] bg-[#111113] p-5";
const label = "text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45";
const LIGHT: Record<Light, string> = { green: "#4ade80", yellow: "#facc15", red: "#ff4d55" };

function useGoalPlan(): { goal: GoalStore | null; plan: GoalPlan | null } {
  const tick = useStoreTick();
  const [s, set] = useState<{ goal: GoalStore | null; plan: GoalPlan | null }>({ goal: null, plan: null });
  useEffect(() => {
    const g = readGoal();
    set(g && g.race >= todayLocal() ? { goal: g, plan: buildPlan(g, todayLocal()) } : { goal: null, plan: null });
  }, [tick]);
  return s;
}

/** Animate once after mount: 0 → 1. */
function useEnter(delay = 60) {
  const [on, set] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => set(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return on;
}

// ------------------------------------------------------------------ week ring

/** A ring that fills with every session this week, and the streak of weeks underneath. */
export function WeekRing({ planned = [] }: { planned?: { date: string; done: boolean }[] }) {
  const log = useLog();
  const { plan } = useGoalPlan();
  const on = useEnter();
  const today = todayWaw();
  const mon = mondayOf(today);
  const sun = add(mon, 6);
  const runs = log.filter((r) => r.day >= mon && r.day <= sun);
  const doneDays = new Set([...runs.map((r) => r.day), ...planned.filter((p) => p.done).map((p) => p.date)]);
  const plannedDays = new Set([...(plan ? plan.weeks.flatMap((w) => w.sessions).filter((s) => s.date >= mon && s.date <= sun).map((s) => s.date) : []), ...planned.map((p) => p.date)]);
  const target = Math.max(plannedDays.size || 3, 1);
  const done = Math.min(doneDays.size, target);
  const km = runs.reduce((s, r) => s + r.km, 0);

  // Weeks in a row (before this one) with at least two sessions.
  const streak = useMemo(() => {
    let n = 0;
    for (let w = 1; w < 60; w++) {
      const a = add(mon, -7 * w);
      const b = add(a, 6);
      if (new Set(log.filter((r) => r.day >= a && r.day <= b).map((r) => r.day)).size >= 2) n++;
      else break;
    }
    return n;
  }, [log, mon]);

  const R = 42;
  const C = 2 * Math.PI * R;
  const frac = done / target;
  const full = done >= target;
  return (
    <Link href="/app/cel" className={cn(card, "flex items-center gap-5 active:scale-[0.99]")}>
      <svg width="108" height="108" viewBox="0 0 108 108" role="img" aria-label={`Tydzień: ${done} z ${target} treningów`} className="shrink-0">
        <circle cx="54" cy="54" r={R} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="10" />
        {Array.from({ length: target }, (_, i) => {
          const a = (i / target) * 2 * Math.PI - Math.PI / 2;
          return <circle key={i} cx={54 + R * Math.cos(a)} cy={54 + R * Math.sin(a)} r="1.6" fill="rgb(255 255 255 / 0.35)" />;
        })}
        <circle
          cx="54"
          cy="54"
          r={R}
          fill="none"
          stroke={full ? "#4ade80" : "#ffffff"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={on ? C * (1 - frac) : C}
          transform="rotate(-90 54 54)"
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)", filter: full ? "drop-shadow(0 0 8px rgb(74 222 128 / 0.6))" : undefined }}
        />
        <text x="54" y="52" textAnchor="middle" fill="white" fontSize="26" fontWeight="600" fontFamily="inherit">
          {done}/{target}
        </text>
        <text x="54" y="70" textAnchor="middle" fill="rgb(255 255 255 / 0.5)" fontSize="10.5" fontFamily="inherit">
          treningi
        </text>
      </svg>
      <div className="min-w-0 flex-1">
        <p className={label}>Ten tydzień</p>
        <p className="mt-1.5 text-[18px] font-semibold leading-tight">{full ? "Tydzień zrobiony" : done === 0 ? "Zaczynamy tydzień" : `Jeszcze ${target - done} ${target - done === 1 ? "trening" : "treningi"}`}</p>
        <p className="mt-1 text-[13.5px] text-white/55">{km1(km)} km w tym tygodniu</p>
        <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[12px] text-white/75">
          <span aria-hidden className="text-[#ff6a6f]">●</span> Seria: {streak} {streak === 1 ? "tydzień" : streak >= 2 && streak <= 4 ? "tygodnie" : "tygodni"}
        </p>
      </div>
    </Link>
  );
}

// ------------------------------------------------------------------ road to the race

/** From the first day of the plan to the race: a dot where you are, your forecast then and now. */
export function GoalRoad() {
  const f = useForm();
  const { goal, plan } = useGoalPlan();
  const on = useEnter(120);
  if (!goal || !plan || !plan.weeks.length) {
    return (
      <Link href="/app/cel" className={cn(card, "flex items-center gap-3 active:scale-[0.99]")}>
        <span className="min-w-0 flex-1">
          <span className={cn(label, "block")}>Droga do celu</span>
          <span className="mt-1 block text-[16px] font-semibold">Wybierz start</span>
          <span className="mt-1 block text-[13.5px] leading-snug text-white/55">5 km, 10 km, półmaraton albo maraton. Pokażę Ci drogę od dziś do mety i jak się na niej poruszasz.</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-white/35" />
      </Link>
    );
  }
  const today = todayWaw();
  const start = plan.weeks[0].monday;
  const span = Math.max(1, Date.parse(goal.race) - Date.parse(start));
  const pos = Math.min(1, Math.max(0, (Date.parse(today) - Date.parse(start)) / span));
  const dist = GOAL_DISTS.find((d) => d.k === goal.dist)!;
  const then = goal.p5k ? timeFor(vdotOf(5000, goal.p5k), dist.m) : null;
  const now = f.vdot ? timeFor(f.vdot, dist.m) : then;
  const gain = then != null && now != null ? then - now : 0;
  const daysLeft = Math.round((Date.parse(`${goal.race}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / DAY);
  // Phase boundaries as ticks on the road.
  const ticks: number[] = [];
  plan.weeks.forEach((w, i) => {
    if (i && w.phase !== plan.weeks[i - 1].phase && w.phase !== "Odpoczynek" && plan.weeks[i - 1].phase !== "Odpoczynek") ticks.push((Date.parse(w.monday) - Date.parse(start)) / span);
  });

  return (
    <Link href="/app/cel" className={cn(card, "block active:scale-[0.99]")}>
      <div className="flex items-baseline justify-between gap-3">
        <p className={label}>Droga do celu · {dist.label}</p>
        <p className="shrink-0 text-[12px] text-white/50">{daysLeft} dni do startu</p>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-[11px] text-white/45">Gdybyś biegł dziś</p>
          <p className="text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{now != null ? fmtTime(now) : "–"}</p>
        </div>
        {gain >= 1 ? <p className="pb-1 text-[14px] font-semibold text-emerald-300">−{fmtTime(Math.round(gain))} od startu planu</p> : null}
      </div>

      <div className="relative mt-6 h-10">
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/[0.08]" />
        <div className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-gradient-to-r from-white/30 to-white" style={{ width: on ? `${pos * 100}%` : "0%", transition: "width 1.2s cubic-bezier(.2,.8,.2,1)" }} />
        {ticks.map((t) => (
          <span key={t} aria-hidden className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-white/25" style={{ left: `${t * 100}%` }} />
        ))}
        <span aria-hidden className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_6px_rgb(255_255_255/0.12),0_0_20px_rgb(255_255_255/0.5)]" style={{ left: on ? `${pos * 100}%` : "0%", transition: "left 1.2s cubic-bezier(.2,.8,.2,1)" }} />
        <span aria-hidden className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 text-[18px]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff6a6f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
          </svg>
        </span>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-white/45">
        <span>start planu{then != null ? ` · ${fmtTime(then)}` : ""}</span>
        <span>{goal.event ? "zawody" : "start"}</span>
      </div>
    </Link>
  );
}

// ------------------------------------------------------------------ runner level

/** Seven levels from the race form (VDOT), each with what it takes on 5 km. */
export const LEVELS = [
  { name: "Start", min: 0 },
  { name: "Rozbieg", min: 30 },
  { name: "Regularny", min: 35 },
  { name: "Ambitny", min: 40 },
  { name: "Zaawansowany", min: 45 },
  { name: "Wyczynowy", min: 50 },
  { name: "Elita", min: 57 },
] as const;

export function levelOf(vdot: number) {
  let i = 0;
  while (i < LEVELS.length - 1 && vdot >= LEVELS[i + 1].min) i++;
  const next = LEVELS[i + 1] ?? null;
  const from = LEVELS[i].min || 25;
  const frac = next ? Math.min(1, Math.max(0, (vdot - from) / (next.min - from))) : 1;
  return { i, level: LEVELS[i], next, frac, nextFiveK: next ? timeFor(next.min, 5000) : null };
}

export function RunnerLevel({ detailed = false }: { detailed?: boolean }) {
  const f = useForm();
  const on = useEnter(180);
  if (!f.vdot) return null;
  const L = levelOf(f.vdot);
  return (
    <Link href="/app/forma" className={cn(card, "block active:scale-[0.99]")}>
      <div className="flex items-center justify-between">
        <p className={label}>Twój poziom</p>
        <p className="text-[12px] text-white/45">
          {L.i + 1} z {LEVELS.length}
        </p>
      </div>
      <p className="mt-1.5 text-[26px] font-semibold tracking-[-0.02em]">{L.level.name}</p>
      <div className="mt-4 grid grid-cols-7 gap-1.5" aria-hidden>
        {LEVELS.map((lv, i) => (
          <span key={lv.name} className="relative h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <span
              className={cn("absolute inset-y-0 left-0 rounded-full", i < L.i ? "bg-white/60" : "bg-white")}
              style={{ width: on ? (i < L.i ? "100%" : i === L.i ? `${L.frac * 100}%` : "0%") : "0%", transition: `width .9s cubic-bezier(.2,.8,.2,1) ${i * 70}ms` }}
            />
          </span>
        ))}
      </div>
      <p className="mt-3 text-[13.5px] leading-snug text-white/60">
        {L.next && L.nextFiveK ? (
          <>
            Do poziomu <span className="font-semibold text-white">{L.next.name}</span>: 5 km poniżej {fmtTime(L.nextFiveK)}. Jesteś w {Math.round(L.frac * 100)}% drogi.
          </>
        ) : (
          "Najwyższy poziom. Teraz walczysz o sekundy."
        )}
      </p>
      {detailed ? (
        <ul className="mt-4 grid gap-1.5 border-t border-white/[0.06] pt-3 text-[13px]">
          {LEVELS.map((lv, i) => (
            <li key={lv.name} className={cn("flex justify-between", i === L.i ? "font-semibold text-white" : "text-white/45")}>
              <span>
                {i + 1}. {lv.name}
              </span>
              <span className="tabular-nums">{i === 0 ? "pierwsze kilometry" : `5 km < ${fmtTime(timeFor(lv.min, 5000))}`}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Link>
  );
}

// ------------------------------------------------------------------ body map

type Spot = { x: number; y: number };
/** Back view, so left is left. Coordinates in a 160×330 box. */
const SPOTS: Record<string, { l: Spot; r: Spot } | Spot> = {
  Plecy: { x: 80, y: 120 },
  "Biodro / pachwina": { l: { x: 63, y: 158 }, r: { x: 97, y: 158 } },
  "Udo tył": { l: { x: 64, y: 192 }, r: { x: 96, y: 192 } },
  "Udo przód": { l: { x: 64, y: 180 }, r: { x: 96, y: 180 } },
  Kolano: { l: { x: 65, y: 222 }, r: { x: 95, y: 222 } },
  Łydka: { l: { x: 64, y: 252 }, r: { x: 96, y: 252 } },
  Piszczel: { l: { x: 66, y: 262 }, r: { x: 94, y: 262 } },
  "Pięta / Achilles": { l: { x: 65, y: 292 }, r: { x: 95, y: 292 } },
  Stopa: { l: { x: 62, y: 310 }, r: { x: 98, y: 310 } },
};

function spotsFor(area: string): Spot[] {
  const m = area.match(/^(.*?)(?: \((lewa|prawa|obie)\))?$/);
  const part = m?.[1]?.trim() ?? area;
  const side = m?.[2];
  const p = part.toLowerCase();
  const keys = Object.keys(SPOTS);
  const key = keys.find((k) => k.toLowerCase() === p) ?? keys.find((k) => p.startsWith(k.toLowerCase().split(" ")[0]));
  if (!key) return [];
  const s = SPOTS[key];
  if ("x" in s) return [s];
  return side === "lewa" ? [s.l] : side === "prawa" ? [s.r] : [s.l, s.r];
}

/** The runner from behind with the guard's lights on the body. Quiet when all is well. */
export function BodyMap() {
  const { areas } = useGuard();
  const lit = areas.flatMap((a) => spotsFor(a.area).map((p) => ({ ...p, light: a.light, area: a.area })));
  const worst = areas[0];
  return (
    <section className={cn(card, "flex items-center gap-4")}>
      <svg width="150" height="310" viewBox="0 0 160 330" role="img" aria-label={areas.length ? `Mapa ciała: ${areas.map((a) => `${a.area} ${a.light === "red" ? "czerwone" : a.light === "yellow" ? "żółte" : "zielone"}`).join(", ")}` : "Mapa ciała: wszystko zielone"} className="shrink-0">
        <defs>
          <linearGradient id="vyra-body" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#2a2a2e" />
            <stop offset="1" stopColor="#161618" />
          </linearGradient>
        </defs>
        <g fill="url(#vyra-body)" stroke="rgb(255 255 255 / 0.1)" strokeWidth="1">
          <circle cx="80" cy="26" r="18" />
          <path d="M60 50 Q80 44 100 50 L108 66 Q112 110 104 150 L56 150 Q48 110 52 66 Z" />
          <path d="M52 62 Q40 70 36 100 L32 140 Q31 148 38 148 L44 104 Q48 84 56 74 Z" />
          <path d="M108 62 Q120 70 124 100 L128 140 Q129 148 122 148 L116 104 Q112 84 104 74 Z" />
          <path d="M56 148 L78 150 L76 230 Q75 262 72 300 L70 318 L56 318 L57 296 Q54 262 54 230 Z" />
          <path d="M104 148 L82 150 L84 230 Q85 262 88 300 L90 318 L104 318 L103 296 Q106 262 106 230 Z" />
        </g>
        {Object.values(SPOTS)
          .flatMap((s) => ("x" in s ? [s] : [s.l, s.r]))
          .map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2" fill="rgb(255 255 255 / 0.18)" />
          ))}
        {lit.map((p, i) => (
          <g key={`${p.area}-${i}`}>
            {p.light !== "green" ? (
              <circle cx={p.x} cy={p.y} r="8" fill={LIGHT[p.light]} opacity="0.35">
                <animate attributeName="r" values="7;15;7" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.45;0;0.45" dur="2.2s" repeatCount="indefinite" />
              </circle>
            ) : null}
            <circle cx={p.x} cy={p.y} r="6" fill={LIGHT[p.light]} />
          </g>
        ))}
        <text x="80" y="328" textAnchor="middle" fontSize="9" fill="rgb(255 255 255 / 0.35)" fontFamily="inherit">
          widok z tyłu
        </text>
      </svg>
      <div className="min-w-0 flex-1">
        <p className={label}>Strażnik</p>
        {worst ? (
          <>
            <p className="mt-1.5 text-[19px] font-semibold leading-tight">{worst.area}</p>
            <p className="mt-1 text-[13px] leading-snug text-white/60">{worst.reason}</p>
            <p className="mt-3 text-[12px] text-white/45">
              {areas.length > 1 ? `+ ${areas.length - 1} ${areas.length - 1 === 1 ? "inne miejsce" : "inne miejsca"} niżej` : "Szczegóły niżej"}
            </p>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-[19px] font-semibold leading-tight">Wszystko zielone</p>
            <p className="mt-1 text-[13px] leading-snug text-white/60">Nic nie bolało w ostatnich 14 dniach. Gdy coś się odezwie, zaznacz to rano w check-inie.</p>
          </>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ the year in dots

/** Every day of the last year as a dot; brighter means more kilometres. All sessions, one history. */
export function YearDots() {
  const log = useLog();
  const on = useEnter(100);
  const today = todayWaw();
  const end = add(mondayOf(today), 6);
  const start = add(mondayOf(today), -52 * 7);
  const per = new Map<string, number>();
  for (const r of log) if (r.day >= start && r.day <= today) per.set(r.day, (per.get(r.day) ?? 0) + r.km);
  const max = Math.max(5, ...per.values());
  const total = [...per.values()].reduce((a, b) => a + b, 0);
  const active = per.size;
  const weeks = 53;
  const cell = 6;
  const gap = 2;
  return (
    <section className={card}>
      <div className="flex items-baseline justify-between">
        <p className={label}>Twój rok</p>
        <p className="text-[12px] text-white/50">
          {km1(total)} km · {active} dni biegania
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg width={weeks * (cell + gap)} height={7 * (cell + gap)} role="img" aria-label={`Ostatni rok: ${active} dni z bieganiem, ${km1(total)} km`}>
          {Array.from({ length: weeks }, (_, w) =>
            Array.from({ length: 7 }, (_, d) => {
              const day = add(start, w * 7 + d);
              if (day > end) return null;
              const k = per.get(day) ?? 0;
              const future = day > today;
              const o = future ? 0.03 : k ? 0.25 + 0.75 * Math.min(1, k / max) : 0.08;
              return (
                <rect
                  key={day}
                  x={w * (cell + gap)}
                  y={d * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx="1.5"
                  fill={day === today ? "#ff6a6f" : "#ffffff"}
                  opacity={on ? (day === today ? 1 : o) : 0}
                  style={{ transition: `opacity .5s ease ${Math.min(w * 12, 600)}ms` }}
                />
              );
            }),
          )}
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-white/40">
        <span>rok temu</span>
        <span>dziś</span>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ form wave

/** Fitness as a soft wave over 90 days, fatigue as a faint line. Words instead of numbers. */
export function FormWave() {
  const f = useForm();
  const on = useEnter(100);
  const days = f.days.slice(-90);
  if (days.length < 14 || !days.some((d) => d.fitness > 1)) return null;
  const W = 330;
  const H = 120;
  const max = Math.max(...days.map((d) => Math.max(d.fitness, d.fatigue)), 1);
  const x = (i: number) => (i / (days.length - 1)) * W;
  const y = (v: number) => H - 8 - (v / max) * (H - 20);
  const line = (k: "fitness" | "fatigue") => days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d[k]).toFixed(1)}`).join(" ");
  const fit = line("fitness");
  const area = `${fit} L${W} ${H} L0 ${H} Z`;
  const first = days[0].fitness;
  const last = days[days.length - 1].fitness;
  const change = first > 1 ? (last - first) / first : null;
  const words = change == null ? "Forma się buduje" : change > 0.05 ? "Forma rośnie" : change < -0.1 ? "Forma spada" : "Forma stabilna";
  const len = 900;
  return (
    <Link href="/app/forma" className={cn(card, "block active:scale-[0.99]")}>
      <div className="flex items-baseline justify-between">
        <p className={label}>Forma · 90 dni</p>
        {change != null ? <p className={cn("text-[13px] font-semibold", change > 0.05 ? "text-emerald-300" : "text-white/60")}>{change > 0 ? "+" : ""}{Math.round(change * 100)}%</p> : null}
      </div>
      <p className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em]">{words}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-[120px] w-full" preserveAspectRatio="none" role="img" aria-label={`${words} w ostatnich 90 dniach`}>
        <defs>
          <linearGradient id="vyra-wave" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#vyra-wave)" style={{ opacity: on ? 1 : 0, transition: "opacity 1s ease .4s" }} />
        <path d={line("fatigue")} fill="none" stroke="#ff6a6f" strokeOpacity="0.45" strokeWidth="1.2" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        <path d={fit} fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" strokeDasharray={len} strokeDashoffset={on ? 0 : len} style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1)" }} pathLength={len} />
        <circle cx={x(days.length - 1)} cy={y(last)} r="4" fill="#ffffff" style={{ opacity: on ? 1 : 0, transition: "opacity .4s ease 1.3s" }} />
      </svg>
      <div className="mt-2 flex items-center gap-4 text-[11.5px] text-white/45">
        <span className="flex items-center gap-1.5">
          <i className="h-0.5 w-4 rounded bg-white" /> forma
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-0.5 w-4 rounded border-t border-dashed border-[#ff6a6f]" /> zmęczenie
        </span>
      </div>
    </Link>
  );
}
