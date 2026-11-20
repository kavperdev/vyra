"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChevronRight, HeartPulse, Sparkles } from "lucide-react";
import { useForm } from "@/components/app/form-hub";
import { HealthSheet, useHealth, useHealthSignal } from "@/components/app/health-entry";
import { mmss } from "@/lib/app/form";
import type { HealthSignal } from "@/lib/app/health";
import { useActivities, useLog, type Run } from "@/lib/app/log";
import { GOAL_DISTS, GOAL_KEY, type GoalStore } from "@/lib/app/goal-plan";
import { blockNow, blockWeek, daysTo, focusOf, mergeSeason, nextRace, SEASON_KEY, validSeason, type Season } from "@/lib/app/season";
import { planSeason } from "@/lib/actions/season";
import { load, todayWaw, useStore, useStoreTick } from "@/lib/app/store";
import { todayCall, type TodayPlan } from "@/lib/app/today-call";
import { cn } from "@/lib/utils";

const card = "rounded-[22px] border border-white/[0.06] bg-[#111113] p-4";
const label = "text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45";
const TONE = { good: "#34d399", info: "#fbbf24", warn: "#ff5a60" } as const;

/** Opens Puls with a question already asked (the assistant listens for this event). */
export const askPuls = (q: string) => window.dispatchEvent(new CustomEvent("vyra:ask-puls", { detail: q }));

let planCache: Promise<Season | null> | null = null;
/** Phases and races from the runner's plan in VYRA (read once per app start). */
export function usePlanSeason(): Season | null {
  const [p, setP] = useState<Season | null>(null);
  useEffect(() => {
    let on = true;
    planCache ??= planSeason().catch(() => null);
    planCache.then((v) => on && setP(v ? validSeason(v) : null));
    return () => {
      on = false;
    };
  }, []);
  return p;
}

/** The season as shown: the runner's own blocks or the plan's phases, races from both. Writes go to the runner's own copy. */
export function useSeason(): [ReturnType<typeof mergeSeason>, (s: Season) => void, Season] {
  const [raw, setRaw] = useStore<unknown>(SEASON_KEY, null);
  const own = useMemo(() => validSeason(raw), [raw]);
  const plan = usePlanSeason();
  const merged = useMemo(() => mergeSeason(own, plan), [own, plan]);
  return [merged, (s) => setRaw(s), own];
}

/** Best time over a distance from real runs that covered it (scaled to the exact distance). */
function best(log: Run[], km: number): number | null {
  const xs = log.filter((r) => !r.auto && r.sec > 0 && r.km >= km && r.km <= km * 1.06).map((r) => Math.round((r.sec * km) / r.km));
  return xs.length ? Math.min(...xs) : null;
}
const hm = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const hms = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : mmss(s));

function Spark({ ys, color }: { ys: number[]; color: string }) {
  if (ys.length < 2) return null;
  const max = Math.max(...ys, 1);
  const min = Math.min(...ys);
  const w = 120;
  const h = 34;
  const pts = ys.map((y, i) => `${((i / (ys.length - 1)) * w).toFixed(1)},${(h - ((y - min) / Math.max(1, max - min)) * (h - 4) - 2).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-9 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Delta({ now, base, unit, goodUp }: { now?: number; base: number | null; unit: string; goodUp: boolean }) {
  if (now == null) return <span className="text-white/30">–</span>;
  const d = base == null ? 0 : Math.round((now - base) * 10) / 10;
  const bad = base != null && (goodUp ? d < 0 : d > 0) && Math.abs(d) >= (unit === "ms" ? 5 : unit === "h" ? 0.5 : 3);
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[17px] font-semibold tabular-nums">{unit === "h" ? hm(now) : now}</span>
      {unit !== "h" ? <span className="text-[11px] text-white/40">{unit}</span> : null}
      {base != null && d !== 0 ? (
        <span className={cn("flex items-center text-[11.5px] tabular-nums", bad ? "text-[#ff8a8f]" : "text-white/45")}>
          {d > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {unit === "h" ? hm(Math.abs(d)) : Math.abs(d)}
        </span>
      ) : null}
    </span>
  );
}

function HealthCard({ h, onOpen }: { h: HealthSignal; onOpen: () => void }) {
  const t = h.today;
  return (
    <button type="button" onClick={onOpen} className={cn(card, "text-left transition active:scale-[0.99]")}>
      <div className="flex items-center justify-between">
        <p className={label}>Zdrowie</p>
        <span className="size-2 rounded-full" style={{ background: h.level === "warn" ? TONE.warn : h.level === "watch" ? TONE.info : h.level === "ok" ? TONE.good : "#3a3a3f" }} />
      </div>
      {t ? (
        <div className="mt-2.5 grid gap-1.5 text-[12.5px] text-white/55">
          <div className="flex items-center justify-between gap-2">
            <span>Tętno</span>
            <Delta now={t.rhr} base={h.base.rhr} unit="ud" goodUp={false} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>HRV</span>
            <Delta now={t.hrv} base={h.base.hrv} unit="ms" goodUp />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Sen</span>
            <Delta now={t.sleep} base={h.base.sleep} unit="h" goodUp />
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-[15px] font-semibold leading-snug">Wpisz poranne liczby</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-white/50">Tętno, HRV i sen z zegarka. 10 sekund.</p>
          <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-black">
            <HeartPulse className="size-3.5" /> Wpisz
          </span>
        </>
      )}
      {t && h.days < 4 ? <p className="mt-2 text-[11.5px] text-white/35">Norma po 4 porankach</p> : null}
    </button>
  );
}

/**
 * Ty jako zawodnik: the athlete's operating system on one screen. Today's call (pain, morning numbers,
 * load), the goal with its countdown, form, health, strength, records and where the season is now.
 */
export function AthleteBoard({ plan }: { plan?: TodayPlan }) {
  const f = useForm();
  const log = useLog();
  const all = useActivities();
  const [healthAll] = useHealth();
  const h = useHealthSignal();
  const [season] = useSeason();
  const tick = useStoreTick();
  const [sheet, setSheet] = useState(false);
  const [pain, setPain] = useState(false);
  const [goal, setGoal] = useState<GoalStore | null>(null);
  const today = todayWaw();
  useEffect(() => {
    setPain(!!load<{ pain?: boolean } | null>(`vyra-ready-${today}`, null)?.pain);
    setGoal(load<GoalStore | null>(GOAL_KEY, null));
  }, [tick, today]);

  const call = todayCall(f, h, pain, plan);
  const race = nextRace(season, today) ?? (goal && goal.race >= today ? { name: goal.name || `Start ${GOAL_DISTS.find((d) => d.k === goal.dist)?.label ?? ""}`, date: goal.race, goal: GOAL_DISTS.find((d) => d.k === goal.dist)?.label } : null);
  const block = blockNow(season, today);
  const bw = block ? blockWeek(block, today) : null;
  const since14 = new Date(Date.parse(`${today}T12:00:00Z`) - 13 * 864e5).toISOString().slice(0, 10);
  const gym = all.filter((r) => r.sport === "gym" && r.day >= since14);
  const fit = f.days.slice(-42).map((d) => d.fitness);
  const recs = [
    { k: "5 km", v: best(log, 5) },
    { k: "10 km", v: best(log, 10) },
    { k: "Półmaraton", v: best(log, 21.0975) },
  ];
  const longest = log.reduce((m, r) => Math.max(m, r.km), 0);

  return (
    <section className="mt-4 lg:col-span-2">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
          Athlete OS <span className="text-white/30">· Ty jako zawodnik</span>
        </p>
        <Link href="/app/sezon" className="flex items-center gap-0.5 text-[12.5px] text-white/50">
          Sezon <ChevronRight className="size-3.5" />
        </Link>
      </div>

      {/* Today's call */}
      <div className={cn(card, "relative overflow-hidden p-5")}>
        <div className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full opacity-25 blur-3xl" style={{ background: TONE[call.tone] }} />
        <p className="relative flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: TONE[call.tone] }}>
          <span className="size-2 rounded-full" style={{ background: TONE[call.tone], boxShadow: `0 0 10px ${TONE[call.tone]}` }} />
          Decyzja na dziś
        </p>
        <p className="relative mt-2 text-[22px] font-semibold leading-tight tracking-[-0.02em]">{call.title}</p>
        <p className="relative mt-1.5 text-[15px] leading-relaxed text-white/75">{call.action}</p>
        {call.reasons.length ? (
          <ul className="relative mt-3 grid gap-1 border-t border-white/[0.06] pt-3 text-[13px] leading-relaxed text-white/55">
            {call.reasons.slice(0, 3).map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-white/40" />
                {r}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="relative mt-4 flex flex-wrap gap-2">
          {!h.today ? (
            <button type="button" onClick={() => setSheet(true)} className="flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13.5px] font-semibold text-black active:scale-95">
              <HeartPulse className="size-4" /> Poranne liczby
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => askPuls("Spójrz na moje dane z ostatnich tygodni. Jak mi idzie i co mam zrobić w tym tygodniu?")}
            className="flex h-10 items-center gap-1.5 rounded-full bg-white/[0.08] px-4 text-[13.5px] font-medium text-white/85 active:scale-95"
          >
            <Sparkles className="size-4 text-[#ff8a8f]" /> Zapytaj Pulsa o tydzień
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Goal */}
        <Link href="/app/sezon" className={cn(card, "col-span-2 flex items-end justify-between gap-3 transition active:scale-[0.99]")}>
          <div className="min-w-0">
            <p className={label}>Cel</p>
            {race ? (
              <>
                <p className="mt-1.5 truncate text-[16px] font-semibold">{race.name}</p>
                <p className="mt-0.5 text-[12.5px] text-white/50">
                  {new Date(`${race.date}T12:00:00Z`).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
                  {race.goal ? ` · ${race.goal}` : ""}
                </p>
                {block && bw ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ background: `${focusOf(block.focus).color}22`, color: focusOf(block.focus).color }}>
                    {block.name} · tydz. {bw.n} z {bw.of}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="mt-1.5 text-[16px] font-semibold">Ustaw swój sezon</p>
                <p className="mt-0.5 text-[12.5px] text-white/50">Starty i bloki treningowe na jednej osi</p>
              </>
            )}
          </div>
          {race ? (
            <div className="shrink-0 text-right">
              <p className="text-[44px] font-black leading-none tracking-[-0.05em] tabular-nums">{daysTo(today, race.date)}</p>
              <p className="mt-1 text-[11.5px] text-white/45">dni do startu</p>
            </div>
          ) : (
            <ChevronRight className="size-5 shrink-0 text-white/40" />
          )}
        </Link>

        {/* Form */}
        <Link href="/app/forma" className={cn(card, "transition active:scale-[0.99]")}>
          <p className={label}>Forma</p>
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-[28px] font-black leading-none tracking-[-0.04em] tabular-nums">{f.fitness || "–"}</span>
            {f.fitnessChange != null ? (
              <span className={cn("text-[12px] font-semibold tabular-nums", f.fitnessChange >= 0 ? "text-[#34d399]" : "text-[#ff8a8f]")}>
                {f.fitnessChange >= 0 ? "+" : "−"}
                {Math.abs(Math.round(f.fitnessChange * 100))}%
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-[12px] text-white/50">{f.state.label}</p>
          <Spark ys={fit} color="#7c8cff" />
          {f.p5k ? <p className="mt-1 text-[12px] text-white/50">5 km teraz: <span className="font-semibold text-white tabular-nums">{mmss(f.p5k)}</span></p> : null}
        </Link>

        <HealthCard h={h} onOpen={() => setSheet(true)} />

        {/* Strength */}
        <Link href="/app/cwiczenia" className={cn(card, "transition active:scale-[0.99]")}>
          <p className={label}>Siła</p>
          <p className="mt-1.5 flex items-baseline gap-1">
            <span className="text-[28px] font-black leading-none tracking-[-0.04em] tabular-nums">{gym.length}</span>
            <span className="text-[13px] text-white/45">z 4 w 2 tyg.</span>
          </p>
          <div className="mt-3 flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn("h-2 flex-1 rounded-full", i < gym.length ? "bg-[#34d399]" : "bg-white/10")} />
            ))}
          </div>
          <p className="mt-2.5 text-[12px] leading-snug text-white/50">{gym.length >= 4 ? "Tak trzymaj" : gym.length ? "Jeszcze " + (4 - gym.length) + " do normy" : "Siła 2× w tygodniu chroni przed kontuzją"}</p>
        </Link>

        {/* Records */}
        <Link href="/app/postepy" className={cn(card, "transition active:scale-[0.99]")}>
          <p className={label}>Rekordy</p>
          <div className="mt-2 grid gap-1.5 text-[12.5px]">
            {recs.map((r) => (
              <div key={r.k} className="flex items-baseline justify-between gap-2">
                <span className="text-white/55">{r.k}</span>
                <span className={cn("font-semibold tabular-nums", !r.v && "text-white/25")}>{r.v ? hms(r.v) : "–"}</span>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-white/55">Najdłuższy</span>
              <span className={cn("font-semibold tabular-nums", !longest && "text-white/25")}>{longest ? `${longest.toFixed(1).replace(".", ",")} km` : "–"}</span>
            </div>
          </div>
        </Link>
      </div>

      <SeasonStrip season={season} today={today} />
      <HealthSheet key={sheet ? healthAll.length : "closed"} open={sheet} onClose={() => setSheet(false)} />
    </section>
  );
}

/** The next 20 weeks of the season as one bar, today marked. */
export function SeasonStrip({ season, today, weeks = 20 }: { season: Season; today: string; weeks?: number }) {
  if (!season.blocks.length && !season.races.length) return null;
  const start = new Date(Date.parse(`${today}T12:00:00Z`) - 21 * 864e5).toISOString().slice(0, 10);
  const total = weeks * 7;
  const pos = (d: string) => Math.max(0, Math.min(100, (daysTo(start, d) / total) * 100));
  const end = new Date(Date.parse(`${start}T12:00:00Z`) + total * 864e5).toISOString().slice(0, 10);
  return (
    <Link href="/app/sezon" className={cn(card, "mt-3 block transition active:scale-[0.99]")}>
      <div className="flex items-center justify-between">
        <p className={label}>Sezon</p>
        <ChevronRight className="size-4 text-white/35" />
      </div>
      <div className="relative mt-3 h-7 overflow-hidden rounded-lg bg-white/[0.04]">
        {season.blocks
          .filter((b) => b.to >= start && b.from <= end)
          .map((b) => (
            <span key={b.id} className="absolute inset-y-0 border-r border-black/40" style={{ left: `${pos(b.from)}%`, width: `${Math.max(1, pos(b.to) - pos(b.from) + 100 / total)}%`, background: `${focusOf(b.focus).color}55` }} />
          ))}
        {season.races
          .filter((r) => r.date >= start && r.date <= end)
          .map((r) => (
            <span key={r.id} className="absolute inset-y-0 w-[3px] bg-white" style={{ left: `${pos(r.date)}%` }} title={r.name} />
          ))}
        <span className="absolute inset-y-[-2px] w-[2px] bg-[#ff3b43] shadow-[0_0_8px_#ff3b43]" style={{ left: `${pos(today)}%` }} />
      </div>
      <div className="relative mt-1.5 flex h-4 justify-between text-[10.5px] text-white/35">
        <span>{new Date(`${start}T12:00:00Z`).toLocaleDateString("pl-PL", { month: "short" })}</span>
        <span className="absolute -translate-x-1/2 text-[#ff8a8f]" style={{ left: `${pos(today)}%` }}>
          dziś
        </span>
        <span>{new Date(`${end}T12:00:00Z`).toLocaleDateString("pl-PL", { month: "short" })}</span>
      </div>
    </Link>
  );
}
