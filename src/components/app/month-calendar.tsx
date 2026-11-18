"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Bike, ChevronLeft, ChevronRight, Dumbbell, Footprints, Mountain, PersonStanding, Snowflake, Users, Waves } from "lucide-react";
import { SPORTS, sportName, useActivities, type Run, type Sport } from "@/lib/app/log";
import { buildPlan, GOAL_KEY, type GoalInput } from "@/lib/app/goal-plan";
import { load, todayWaw, useStoreTick } from "@/lib/app/store";
import { fmtPace } from "@/lib/method/engine";
import { cn } from "@/lib/utils";

const ICON: Record<Sport, typeof Footprints> = { run: Footprints, bike: Bike, swim: Waves, gym: Dumbbell, walk: Mountain, mobility: PersonStanding, ski: Snowflake, team: Users, other: Activity };
const TONE: Record<Sport, string> = {
  run: "bg-[#ff5a60]/18 text-[#ff8a8f]",
  bike: "bg-[#7c8cff]/18 text-[#a8b3ff]",
  swim: "bg-sky-400/18 text-sky-300",
  gym: "bg-amber-400/18 text-amber-300",
  walk: "bg-emerald-400/15 text-emerald-300",
  mobility: "bg-emerald-400/15 text-emerald-300",
  ski: "bg-sky-400/18 text-sky-300",
  team: "bg-amber-400/18 text-amber-300",
  other: "bg-white/10 text-white/70",
};
const DOW = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const MONTHS = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
const add = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

export type PlannedDay = { date: string; title: string; sport: Sport; km?: number | null; href?: string };

/**
 * A month at a glance: every day shows what was done (filled icon in the sport's colour) or what is
 * planned (dashed outline). Tap a day to see it. Plans: the race plan on this phone + `planned` (coach / Method).
 */
export function MonthCalendar({ planned = [] }: { planned?: PlannedDay[] }) {
  const all = useActivities();
  const tick = useStoreTick();
  const today = todayWaw();
  const [ym, setYm] = useState(today.slice(0, 7));
  const [sel, setSel] = useState(today);
  const [goal, setGoal] = useState<PlannedDay[]>([]);
  useEffect(() => {
    const g = load<GoalInput | null>(GOAL_KEY, null);
    if (!g) return setGoal([]);
    setGoal(buildPlan(g).weeks.flatMap((w) => w.sessions).map((s) => ({ date: s.date, title: s.title, sport: "run" as Sport, km: s.km, href: "/app/cel" })));
  }, [tick]);

  const plan = useMemo(() => [...planned, ...goal], [planned, goal]);
  const first = `${ym}-01`;
  const lead = (new Date(`${first}T12:00:00Z`).getUTCDay() || 7) - 1;
  const days = Array.from({ length: 42 }, (_, i) => add(first, i - lead));
  const byDay = (d: string) => all.filter((r) => r.day === d);
  const planOn = (d: string) => plan.filter((p) => p.date === d);
  const shift = (n: number) => {
    const [y, m] = ym.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1 + n, 1));
    setYm(t.toISOString().slice(0, 7));
  };
  const lastRow = days.slice(35).every((d) => d.slice(0, 7) !== ym) ? 35 : 42;
  const done = byDay(sel);
  const todo = planOn(sel).filter((p) => !done.some((r) => (r.sport ?? "run") === p.sport));
  const monthActs = all.filter((r) => r.day.startsWith(ym));

  return (
    <div className="min-w-0 overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#111113] p-3.5">
      <div className="flex items-center justify-between px-1">
        <p className="text-[18px] font-semibold">
          {MONTHS[Number(ym.slice(5)) - 1]} <span className="text-white/40">{ym.slice(0, 4)}</span>
        </p>
        <div className="flex gap-1">
          <button type="button" aria-label="Poprzedni miesiąc" onClick={() => shift(-1)} className="grid size-9 place-items-center rounded-full bg-white/[0.06] active:scale-90">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" aria-label="Następny miesiąc" onClick={() => shift(1)} className="grid size-9 place-items-center rounded-full bg-white/[0.06] active:scale-90">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <p className="mt-0.5 px-1 text-[12px] text-white/45">
        {monthActs.length} treningów · {monthActs.filter((r) => !r.sport || r.sport === "run").reduce((a, r) => a + r.km, 0).toFixed(0)} km biegu
      </p>
      <div className="mt-3 grid grid-cols-7 gap-y-1.5 text-center">
        {DOW.map((d) => (
          <span key={d} className="pb-1 text-[11px] font-medium text-white/35">
            {d}
          </span>
        ))}
        {days.slice(0, lastRow).map((d) => {
          const out = d.slice(0, 7) !== ym;
          const acts = byDay(d);
          const pl = planOn(d);
          const main = acts[0];
          const sport: Sport | null = main ? (main.sport ?? "run") : pl[0]?.sport ?? null;
          const Icon = sport ? ICON[sport] : null;
          const isToday = d === today;
          return (
            <button key={d} type="button" onClick={() => setSel(d)} className={cn("relative mx-auto grid size-9 place-items-center rounded-full text-[13px] tabular-nums transition sm:size-10", out && "opacity-25", sel === d && "ring-2 ring-white/70", isToday && sel !== d && "ring-1 ring-white/30")}>
              {main && Icon ? (
                <span className={cn("grid size-9 place-items-center rounded-full sm:size-10", TONE[sport!])}>
                  <Icon className="size-[18px]" />
                </span>
              ) : pl.length && Icon ? (
                <span className={cn("grid size-9 place-items-center rounded-full border border-dashed sm:size-10", d < today ? "border-white/15 text-white/25" : "border-white/35 text-white/70")}>
                  <Icon className="size-[16px]" />
                </span>
              ) : (
                <span className={cn(isToday ? "font-semibold text-white" : "text-white/55")}>{Number(d.slice(8))}</span>
              )}
              {acts.length > 1 ? <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-amber-400 text-[9.5px] font-bold text-black">{acts.length}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="mt-3 border-t border-white/[0.06] pt-3">
        <p className="px-1 text-[12.5px] font-medium capitalize text-white/55">
          {sel === today ? "Dziś, " : ""}
          {new Intl.DateTimeFormat("pl-PL", { weekday: sel === today ? undefined : "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${sel}T12:00:00Z`))}
        </p>
        <div className="mt-2 grid min-w-0 grid-cols-1 gap-1.5">
          {done.map((r) => (
            <Entry key={r.id} r={r} />
          ))}
          {todo.map((p, i) => {
            const Icon = ICON[p.sport];
            return (
              <Link key={i} href={p.href ?? "/app/cel"} className="flex min-w-0 items-center gap-3 rounded-2xl border border-dashed border-white/15 px-3 py-2.5 active:scale-[0.99]">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-dashed border-white/30 text-white/70">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{p.title}</span>
                  <span className="block text-[12px] text-white/45">{sel < today ? "Nie odhaczony" : "W planie"}{p.km ? ` · ${String(p.km).replace(".", ",")} km` : ""}</span>
                </span>
              </Link>
            );
          })}
          {!done.length && !todo.length ? <p className="px-1 py-1.5 text-[13px] text-white/40">Dzień wolny.</p> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] text-white/40">
        {SPORTS.filter((s) => all.some((r) => (r.sport ?? "run") === s.k)).map((s) => {
          const Icon = ICON[s.k];
          return (
            <span key={s.k} className="flex items-center gap-1">
              <span className={cn("grid size-4 place-items-center rounded-full", TONE[s.k])}>
                <Icon className="size-2.5" />
              </span>
              {s.name}
            </span>
          );
        })}
        <span className="flex items-center gap-1">
          <span className="size-3.5 rounded-full border border-dashed border-white/40" /> w planie
        </span>
      </div>
    </div>
  );
}

function Entry({ r }: { r: Run }) {
  const sport = r.sport ?? "run";
  const Icon = ICON[sport];
  const run = sport === "run" && r.km > 0;
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-2.5">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", TONE[sport])}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium">{r.note && !r.note.startsWith("Strava") ? r.note : sportName(r.sport)}</span>
        <span className="block text-[12px] tabular-nums text-white/50">
          {[run ? `${String(r.km).replace(".", ",")} km` : null, r.sec ? `${Math.floor(r.sec / 60)} min` : null, run && r.sec ? `${fmtPace(r.sec / r.km)}/km` : null].filter(Boolean).join(" · ")}
          {r.auto ? " · z planu" : ""}
        </span>
      </span>
      <span className="text-[11px] font-medium text-emerald-300">✓</span>
    </div>
  );
}
