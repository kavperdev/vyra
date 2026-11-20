"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, HeartPulse, ListChecks, Sparkles } from "lucide-react";
import { useForm } from "@/components/app/form-hub";
import { HealthSheet, useHealth, useHealthSignal } from "@/components/app/health-entry";
import { PlanToday, type PlanSession } from "@/components/app/plan-today";
import { PHOTOS, photoOfDay } from "@/components/app/ui";
import { CountUp, ParticleRing } from "@/components/charts/particle-ring";
import { planSeason } from "@/lib/actions/season";
import { dayScore, mmss } from "@/lib/app/form";
import { buildPlan, GOAL_DISTS, GOAL_KEY, type GoalInput, type GoalStore } from "@/lib/app/goal-plan";
import type { HealthDay } from "@/lib/app/health";
import { useActivities, useLog, type Run } from "@/lib/app/log";
import { readinessToday } from "@/lib/app/plans";
import { blockNow, blockWeek, daysTo, focusOf, mergeSeason, nextRace, SEASON_KEY, validSeason, type Season } from "@/lib/app/season";
import { load, todayWaw, useStore, useStoreTick } from "@/lib/app/store";
import { lowBase, todayCall, type TodayPlan } from "@/lib/app/today-call";
import { cn } from "@/lib/utils";

/* ---------- shared ---------- */

const card = "relative overflow-hidden rounded-[26px] border border-white/[0.07] bg-[linear-gradient(180deg,#161618,#0e0e10)]";
const mono = "font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/45";
const TONE = { good: "#34d399", info: "#fbbf24", warn: "#ff4d55" } as const;
const DAY = 864e5;
const addD = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const mondayOf = (iso: string) => addD(iso, -((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7));
const hm = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const hms = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : mmss(s));
const comma = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

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

/* ---------- Dziś: the one card on top ---------- */

/**
 * Today, as Whoop or Oura open: one score, one verdict, today's session from the plan and the three
 * morning actions (check-in, numbers from the watch, Puls). Replaces the separate rings and check-in card.
 */
export function OsToday({ plan, sessions = [] }: { plan?: TodayPlan; sessions?: PlanSession[] }) {
  const f = useForm();
  const h = useHealthSignal();
  const tick = useStoreTick();
  const [sheet, setSheet] = useState(false);
  const [check, setCheck] = useState<{ pain?: boolean } | null>(null);
  const [ready, setReady] = useState<number | null>(null);
  const [healthAll] = useHealth();
  const today = todayWaw();
  useEffect(() => {
    setCheck(load<{ pain?: boolean } | null>(`vyra-ready-${today}`, null));
    setReady(readinessToday());
  }, [tick, today]);

  const call = todayCall(f, h, !!check?.pain, plan);
  const s = dayScore(f, ready, h.level);
  const score = s?.score ?? null;
  const tone = TONE[call.tone];
  const date = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Warsaw" }).format(new Date());

  return (
    <section className={cn(card, "p-5 lg:col-span-2")}>
      <span aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full opacity-30 blur-3xl" style={{ background: tone }} />
      <div className="relative flex items-center justify-between">
        <p className={mono}>Dziś · {date}</p>
        <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: `${tone}1f`, color: tone }}>
          <span className="size-1.5 rounded-full" style={{ background: tone, boxShadow: `0 0 8px ${tone}` }} />
          {call.tone === "good" ? "Zielone" : call.tone === "info" ? "Uważaj" : "Lżej"}
        </span>
      </div>

      <div className="relative mt-3 flex items-center gap-4">
        <div className="shrink-0">
          <ParticleRing value={score} size={118}>
            <span className="flex flex-col items-center">
              {score != null ? <CountUp value={score} className="text-[34px] font-light leading-none tabular-nums" /> : <span className="text-[30px] font-light text-white/35">–</span>}
              <span className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/45">gotowość</span>
            </span>
          </ParticleRing>
        </div>
        <div className="min-w-0">
          <p className="text-[23px] font-semibold leading-[1.08] tracking-[-0.025em]">{call.title}</p>
          <p className="mt-1.5 text-[14px] leading-snug text-white/70">{call.action}</p>
        </div>
      </div>

      {call.reasons.length ? (
        <ul className="relative mt-4 grid gap-1.5 text-[12.5px] leading-snug text-white/55">
          {call.reasons.slice(0, 2).map((r) => (
            <li key={r} className="flex gap-2">
              <span className="mt-[6px] size-1 shrink-0 rounded-full" style={{ background: tone }} />
              {r}
            </li>
          ))}
        </ul>
      ) : null}

      {sessions.length ? (
        <div className="relative mt-4">
          <PlanToday sessions={sessions} variant="hero" />
        </div>
      ) : null}

      <div className="relative mt-4 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => window.dispatchEvent(new Event("vyra:open-check"))} className={cn("flex flex-col items-center gap-1 rounded-2xl py-2.5 text-[12px] font-medium active:scale-95", check ? "bg-white/[0.05] text-white/70" : "bg-white text-black")}>
          <ListChecks className="size-[18px]" />
          {check ? "Samopoczucie ✓" : "Samopoczucie"}
        </button>
        <button type="button" onClick={() => setSheet(true)} className={cn("flex flex-col items-center gap-1 rounded-2xl py-2.5 text-[12px] font-medium active:scale-95", h.today ? "bg-white/[0.05] text-white/70" : check ? "bg-white text-black" : "bg-white/[0.08]")}>
          <HeartPulse className="size-[18px]" />
          {h.today ? "Liczby ✓" : "Poranne liczby"}
        </button>
        <button type="button" onClick={() => askPuls("Spójrz na moje dane z ostatnich tygodni i na plan. Jak mi idzie i na co uważać w tym tygodniu?")} className="flex flex-col items-center gap-1 rounded-2xl bg-white/[0.05] py-2.5 text-[12px] font-medium text-white/80 active:scale-95">
          <Sparkles className="size-[18px] text-[#ff8a8f]" />
          Puls o tygodniu
        </button>
      </div>
      <HealthSheet key={sheet ? healthAll.length : "closed"} open={sheet} onClose={() => setSheet(false)} />
    </section>
  );
}

/* ---------- three numbers ---------- */

function Tile({ href, label, children, onClick }: { href?: string; label: string; children: React.ReactNode; onClick?: () => void }) {
  const cls = cn(card, "flex min-h-[132px] flex-col p-3.5 text-left transition active:scale-[0.98]");
  const body = (
    <>
      <p className={cn(mono, "text-[9.5px]")}>{label}</p>
      {children}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

/** Load, the week, last night: Whoop-style numbers you read in a second. */
export function OsTiles({ planned = [] }: { planned?: { date: string; done: boolean }[] }) {
  const f = useForm();
  const all = useActivities();
  const log = useLog();
  const [health] = useHealth();
  const tick = useStoreTick();
  const [target, setTarget] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const today = todayWaw();
  useEffect(() => {
    const g = load<GoalInput | null>(GOAL_KEY, null);
    const w = g ? buildPlan(g).weeks.find((x) => today >= x.monday && today <= addD(x.monday, 6)) : null;
    setTarget(w ? w.km : null);
  }, [tick, today]);

  const base = lowBase(f);
  const strain = f.ratio ? Math.min(1, f.ratio / 1.3) : 0;
  const loadLabel = !f.ratio ? "brak danych" : base ? "po przerwie" : f.ratioZone === "risk" ? "za dużo" : f.ratioZone === "watch" ? "wysoko" : f.ratioZone === "low" ? "lekko" : "w normie";
  const loadColor = base || !f.ratio ? "#7c8cff" : f.ratioZone === "risk" ? "#ff4d55" : f.ratioZone === "watch" ? "#fbbf24" : "#34d399";

  const mon = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => addD(mon, i));
  const perDay = days.map((d) => all.filter((r) => r.day === d).reduce((a, r) => a + r.km, 0));
  const weekKm = perDay.reduce((a, b) => a + b, 0);
  const since = addD(today, -28);
  const usual = Math.max(10, log.filter((r) => r.day >= since).reduce((a, r) => a + r.km, 0) / 4);
  const goal = target ?? usual;
  const maxDay = Math.max(8, ...perDay);
  const plannedDays = new Set(planned.map((p) => p.date));

  const nights = days.map((d) => health.find((x) => x.day === d)?.sleep ?? null);
  const last: HealthDay | undefined = [...health].reverse().find((x) => x.sleep != null);

  return (
    <div className="mt-3 grid grid-cols-3 gap-2.5 lg:col-span-2">
      <Tile href="/app/forma" label="Obciążenie">
        <p className="mt-auto text-[28px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{f.ratio ? `${Math.round(strain * 100)}%` : "–"}</p>
        <p className="mt-1 text-[11.5px]" style={{ color: loadColor }}>
          {loadLabel}
        </p>
        <span className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <span className="block h-full rounded-full" style={{ width: `${Math.max(4, strain * 100)}%`, background: loadColor }} />
        </span>
      </Tile>
      <Tile href="/app/dziennik" label="Tydzień">
        <p className="mt-auto text-[28px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{weekKm < 10 ? comma(weekKm) : Math.round(weekKm)}</p>
        <p className="mt-1 text-[11.5px] text-white/45">z {Math.round(goal)} km</p>
        <div className="mt-2.5 flex h-6 items-end gap-[3px]">
          {perDay.map((km, i) => (
            <span
              key={days[i]}
              className={cn("flex-1 rounded-[2px]", days[i] === today && "ring-1 ring-white/60")}
              style={{ height: `${km ? Math.max(18, (km / maxDay) * 100) : 14}%`, background: km ? "#ff4d55" : plannedDays.has(days[i]) && days[i] >= today ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.08)" }}
            />
          ))}
        </div>
      </Tile>
      <Tile label="Sen" onClick={() => setSheet(true)}>
        <p className="mt-auto text-[28px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{last?.sleep != null ? hm(last.sleep) : "–"}</p>
        <p className="mt-1 text-[11.5px] text-white/45">{last ? (last.day === today ? "ostatnia noc" : "ostatni wpis") : "wpisz rano"}</p>
        <div className="mt-2.5 flex h-6 items-end gap-[3px]">
          {nights.map((n, i) => (
            <span key={days[i]} className="flex-1 rounded-[2px]" style={{ height: `${n ? Math.max(18, Math.min(100, (n / 9) * 100)) : 14}%`, background: n == null ? "rgba(255,255,255,0.08)" : n < 6 ? "#fbbf24" : "#7c8cff" }} />
          ))}
        </div>
      </Tile>
      <HealthSheet key={sheet ? health.length : "closed"} open={sheet} onClose={() => setSheet(false)} />
    </div>
  );
}

/* ---------- the grid ---------- */

/** Fitness over the last 8 weeks as a dot matrix: each column is two days, lit dots = fitness. */
function DotMatrix({ ys }: { ys: number[] }) {
  const cols = 28;
  const rows = 7;
  const step = Math.max(1, Math.floor(ys.length / cols));
  const vals = Array.from({ length: cols }, (_, i) => ys[Math.min(ys.length - 1, i * step + step - 1)] ?? 0);
  const max = Math.max(1, ...vals);
  return (
    <div className="mt-3 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden>
      {Array.from({ length: rows }).flatMap((_, r) =>
        vals.map((v, c) => {
          const lit = Math.round((v / max) * rows) >= rows - r && v > 0;
          const lastCol = c === cols - 1;
          return <span key={`${r}-${c}`} className="aspect-square rounded-full" style={{ background: lit ? (lastCol ? "#ff4d55" : `rgba(124,140,255,${0.45 + (c / cols) * 0.55})`) : "rgba(255,255,255,0.06)" }} />;
        }),
      )}
    </div>
  );
}

/** Twelve weeks of the season as a day grid, coloured by the block's focus (columns = weeks). */
function SeasonGrid({ season, today }: { season: Season; today: string }) {
  const start = addD(mondayOf(today), -14);
  const weeks = 12;
  const races = new Map(season.races.map((r) => [r.date, r]));
  const blockOf = (d: string) => season.blocks.find((b) => d >= b.from && d <= b.to);
  const months: { col: number; label: string }[] = [];
  for (let w = 0; w < weeks; w++) {
    const days = Array.from({ length: 7 }, (_, i) => addD(start, w * 7 + i));
    const first = days.find((d) => d.endsWith("-01")) ?? (w === 0 ? days[0] : null);
    if (first) months.push({ col: w, label: new Date(`${first}T12:00:00Z`).toLocaleDateString("pl-PL", { month: "short" }) });
  }
  return (
    <div className="mt-3">
      <div className="relative mb-1 h-3.5 text-[10px] capitalize text-white/40">
        {months.map((m) => (
          <span key={m.col} className="absolute" style={{ left: `${(m.col / weeks) * 100}%` }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="grid grid-flow-col gap-[3px]" style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))", gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
        {Array.from({ length: weeks * 7 }).map((_, i) => {
          const d = addD(start, Math.floor(i / 7) * 7 + (i % 7));
          const b = blockOf(d);
          const race = races.get(d);
          const past = d < today;
          return (
            <span
              key={d}
              title={race?.name ?? b?.name}
              className={cn("aspect-square rounded-[3px]", d === today && "ring-[1.5px] ring-white")}
              style={{ background: race ? "#fff" : b ? `${focusOf(b.focus).color}${past ? "40" : "b0"}` : past ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)" }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Goal on a photo, form as dots, health against the normal, strength, records, the season grid. */
export function OsBento() {
  const f = useForm();
  const log = useLog();
  const all = useActivities();
  const [health] = useHealth();
  const h = useHealthSignal();
  const [season] = useSeason();
  const tick = useStoreTick();
  const [goal, setGoal] = useState<GoalStore | null>(null);
  const [sheet, setSheet] = useState(false);
  const today = todayWaw();
  useEffect(() => setGoal(load<GoalStore | null>(GOAL_KEY, null)), [tick]);

  const race = nextRace(season, today) ?? (goal && goal.race >= today ? { name: goal.name || `Start ${GOAL_DISTS.find((d) => d.k === goal.dist)?.label ?? ""}`, date: goal.race, goal: GOAL_DISTS.find((d) => d.k === goal.dist)?.label } : null);
  const block = blockNow(season, today);
  const bw = block ? blockWeek(block, today) : null;
  const gym = all.filter((r) => r.sport === "gym" && r.day >= addD(today, -13));
  const fit = f.days.slice(-56).map((d) => d.fitness);
  const recs = [
    { k: "5 km", v: best(log, 5) },
    { k: "10 km", v: best(log, 10) },
    { k: "Półm.", v: best(log, 21.0975) },
  ];
  const longest = log.reduce((m, r) => Math.max(m, r.km), 0);
  const photo = PHOTOS[photoOfDay(today)];
  const t = h.today;
  const rows: { k: string; v: number | undefined; base: number | null; unit: string; upGood: boolean; tol: number; fmt: (n: number) => string }[] = [
    { k: "Tętno spocz.", v: t?.rhr, base: h.base.rhr, unit: "ud", upGood: false, tol: 3, fmt: (n) => String(Math.round(n)) },
    { k: "HRV", v: t?.hrv, base: h.base.hrv, unit: "ms", upGood: true, tol: 6, fmt: (n) => String(Math.round(n)) },
    { k: "Sen", v: t?.sleep, base: h.base.sleep, unit: "", upGood: true, tol: 0.5, fmt: hm },
  ];

  return (
    <section className="mt-3 grid grid-cols-2 gap-2.5 lg:col-span-2 lg:grid-cols-4">
      {/* Goal: the countdown on a photo */}
      <Link href="/app/sezon" className={cn(card, "col-span-2 flex min-h-[168px] flex-col justify-end p-4 transition active:scale-[0.99]")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" aria-hidden className="absolute inset-0 size-full object-cover opacity-70 grayscale contrast-[1.15]" loading="lazy" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
        <span aria-hidden className="absolute -bottom-20 -left-10 size-60 rounded-full bg-[radial-gradient(closest-side,rgba(229,52,59,0.5),transparent)]" />
        <div className="relative flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className={cn(mono, "text-white/60")}>Cel</p>
            {race ? (
              <>
                <p className="mt-1 truncate text-[17px] font-semibold">{race.name}</p>
                <p className="mt-0.5 text-[12.5px] text-white/60">
                  {new Date(`${race.date}T12:00:00Z`).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
                  {race.goal ? ` · cel ${race.goal}` : ""}
                </p>
                {block && bw ? (
                  <p className="mt-2 flex max-w-full items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11.5px] font-medium backdrop-blur" style={{ color: focusOf(block.focus).color }}>
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: focusOf(block.focus).color }} />
                    <span className="truncate">{block.name.replace(/^[0-9A-Z] · /, "")}</span>
                    <span className="shrink-0 text-white/60">· {bw.n}/{bw.of} tydz.</span>
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-1 text-[17px] font-semibold">Ustaw start i sezon →</p>
            )}
          </div>
          {race ? (
            <div className="shrink-0 text-right">
              <p className="text-[58px] font-black leading-[0.85] tracking-[-0.06em] tabular-nums">{daysTo(today, race.date)}</p>
              <p className="mt-1.5 text-[11px] text-white/60">dni do startu</p>
            </div>
          ) : null}
        </div>
      </Link>

      {/* Form: dots */}
      <Link href="/app/forma" className={cn(card, "col-span-2 p-4 transition active:scale-[0.99]")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={mono}>Forma · 8 tygodni</p>
            <p className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[30px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{f.fitness || "–"}</span>
              {f.fitnessChange != null ? (
                <span className={cn("text-[12.5px] font-semibold tabular-nums", f.fitnessChange >= 0 ? "text-[#34d399]" : "text-[#ff8a8f]")}>
                  {f.fitnessChange >= 0 ? "▲" : "▼"} {Math.abs(Math.round(f.fitnessChange * 100))}% w 4 tyg.
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-[12px] text-white/50">{lowBase(f) && f.state.label === "Przeciążenie" ? "Powrót po przerwie" : f.state.label}</p>
          </div>
          {f.p5k ? (
            <div className="text-right">
              <p className={cn(mono, "text-[9.5px]")}>5 km teraz</p>
              <p className="mt-1 text-[20px] font-semibold tabular-nums">{mmss(f.p5k)}</p>
            </div>
          ) : null}
        </div>
        <DotMatrix ys={fit} />
      </Link>

      {/* Health against the normal */}
      <button type="button" onClick={() => setSheet(true)} className={cn(card, "p-4 text-left transition active:scale-[0.98]")}>
        <div className="flex items-center justify-between">
          <p className={mono}>Zdrowie</p>
          <span className="size-2 rounded-full" style={{ background: h.level === "warn" ? TONE.warn : h.level === "watch" ? TONE.info : h.level === "ok" ? TONE.good : "#3a3a3f" }} />
        </div>
        {t ? (
          <div className="mt-3 grid gap-2.5">
            {rows.map((r) => {
              const d = r.v != null && r.base != null ? r.v - r.base : null;
              const bad = d != null && (r.upGood ? d < -r.tol : d > r.tol);
              const pos = d == null ? 50 : Math.max(6, Math.min(94, 50 + (d / (r.tol * 3)) * 44));
              return (
                <div key={r.k}>
                  <div className="flex items-baseline justify-between text-[11.5px] text-white/50">
                    <span>{r.k}</span>
                    <span className={cn("text-[15px] font-semibold tabular-nums", r.v == null ? "text-white/25" : bad ? "text-[#ff8a8f]" : "text-white")}>
                      {r.v != null ? r.fmt(r.v) : "–"}
                      {r.unit && r.v != null ? <span className="ml-0.5 text-[10px] font-normal text-white/40">{r.unit}</span> : null}
                    </span>
                  </div>
                  <span className="relative mt-1 block h-1 rounded-full bg-white/[0.07]">
                    <span className="absolute inset-y-[-2px] left-1/2 w-px bg-white/25" />
                    {r.v != null && r.base != null ? <span className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${pos}%`, background: bad ? "#ff4d55" : "#34d399" }} /> : null}
                  </span>
                </div>
              );
            })}
            {h.days < 4 ? <p className="text-[10.5px] text-white/35">Norma po 4 porankach</p> : null}
          </div>
        ) : (
          <>
            <p className="mt-3 text-[15px] font-semibold leading-snug">Wpisz poranne liczby</p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/50">Tętno, HRV i sen z zegarka. Kreska to Twoja norma.</p>
          </>
        )}
      </button>

      {/* Strength */}
      <Link href="/app/cwiczenia" className={cn(card, "flex flex-col p-4 transition active:scale-[0.98]")}>
        <p className={mono}>Siła · 14 dni</p>
        <p className="mt-3 flex items-baseline gap-1">
          <span className="text-[34px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{gym.length}</span>
          <span className="text-[13px] text-white/40">/ 4</span>
        </p>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn("h-8 rounded-lg", i < gym.length ? "bg-[#34d399]" : "bg-white/[0.07]")} />
          ))}
        </div>
        <p className="mt-auto pt-3 text-[11.5px] leading-snug text-white/50">{gym.length >= 4 ? "Tak trzymaj" : `Jeszcze ${4 - gym.length} do normy`}</p>
      </Link>

      {/* Records */}
      <Link href="/app/postepy" className={cn(card, "col-span-2 grid grid-cols-4 gap-2 p-4 transition active:scale-[0.99]")}>
        {[...recs.map((r) => ({ k: r.k, v: r.v ? hms(r.v) : null })), { k: "Najdłuższy", v: longest ? `${comma(longest)} km` : null }].map((r) => (
          <div key={r.k} className="min-w-0">
            <p className={cn(mono, "truncate text-[9.5px] tracking-[0.08em]")}>{r.k}</p>
            <p className={cn("mt-1.5 truncate text-[16px] font-semibold tabular-nums", !r.v && "text-white/25")}>{r.v ?? "–"}</p>
          </div>
        ))}
      </Link>

      {/* Season */}
      {season.blocks.length || season.races.length ? (
        <Link href="/app/sezon" className={cn(card, "col-span-2 p-4 transition active:scale-[0.99]")}>
          <div className="flex items-center justify-between">
            <p className={mono}>Sezon · 12 tygodni</p>
            <ChevronRight className="size-4 text-white/35" />
          </div>
          <SeasonGrid season={season} today={today} />
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/50">
            {[...new Set(season.blocks.filter((b) => b.to >= addD(today, -14) && b.from <= addD(today, 70)).map((b) => b.focus))].map((k) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="size-2 rounded-[2px]" style={{ background: focusOf(k).color }} />
                {focusOf(k).name}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-[2px] bg-white" />
              start
            </span>
          </div>
        </Link>
      ) : null}
      <HealthSheet key={sheet ? health.length : "closed"} open={sheet} onClose={() => setSheet(false)} />
    </section>
  );
}
