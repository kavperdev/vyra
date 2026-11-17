import { FREE_PLAN } from "@/lib/free-plan";
import { GOAL_KEY, buildPlan, freeEvent, todayLocal, type GoalSession, type GoalStore } from "@/lib/app/goal-plan";
import { readGoal } from "@/lib/app/goal-store";
import { readLog, type Run } from "@/lib/app/log";
import { load, save } from "@/lib/app/store";
import { celebrate } from "@/components/app/motion";
import { fmtPace } from "@/lib/method/engine";

/**
 * The plans as one system: which plan is active, what is on today, and how a run anywhere in the app
 * (timer, GPS, manual entry, Strava) ticks the matching session.
 * A session reference is "goal:<id>" (race plan) or "start:<week>-<n>" (Zacznij biegać).
 */

export const START_KEY = "vyra-start-plan";
const SWAPS = "vyra-swaps";

/* ---------- Zacznij biegać ---------- */

/** "8 × (1 min truchtu + 2 min marszu)" → timer settings. */
export function timerFor(s: string, ref?: string): string | null {
  const m = s.match(/^(\d+)\s*×\s*\((\d+(?:,\d+)?)\s*min[^+]*\+\s*(\d+(?:,\d+)?)\s*min/);
  if (!m) return null;
  const sec = (x: string) => Math.round(Number(x.replace(",", ".")) * 60);
  return `/app/timer?n=${m[1]}&w=${sec(m[2])}&r=${sec(m[3])}&label=${encodeURIComponent(s)}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}&walk=1`;
}
export const startDone = () => {
  const v = load<unknown>(START_KEY, []);
  return Array.isArray(v) ? (v as string[]) : [];
};
export const startActive = () => startDone().length > 0 || load<boolean>("vyra-start-on", false);
export function startNext() {
  const done = startDone();
  for (const w of FREE_PLAN)
    for (let i = 0; i < w.sessions.length; i++) {
      const id = `${w.week}-${i}`;
      if (!done.includes(id)) return { week: w.week, i, id, text: w.sessions[i].pl, minutes: w.minutes, focus: w.focus.pl };
    }
  return null;
}

/* ---------- plan pod start ---------- */

/** Sessions done: ticked by hand, or a run in the log on that day (a race needs nearly the full distance). */
export function goalDoneSet(g: GoalStore, sessions: GoalSession[], log: Run[] = readLog()): Set<string> {
  const done = new Set(g.done);
  for (const s of sessions) {
    if (done.has(s.id)) continue;
    const runs = log.filter((r) => r.day === s.date);
    if (runs.some((r) => r.ref === `goal:${s.id}`)) done.add(s.id);
    else if (s.kind === "race" ? runs.some((r) => r.km >= s.km * 0.9) : runs.some((r) => r.km >= Math.min(2, s.km * 0.5) || (!r.km && r.sec >= 900))) done.add(s.id);
  }
  return done;
}

/* ---------- ticking from anywhere ---------- */

export function completeRef(ref: string | null | undefined) {
  if (!ref) return;
  const [kind, id] = [ref.slice(0, ref.indexOf(":")), ref.slice(ref.indexOf(":") + 1)];
  if (kind === "start" && /^\d{1,2}-\d$/.test(id)) {
    const d = startDone();
    if (!d.includes(id)) {
      save(START_KEY, [...d, id]);
      celebrate();
    }
    save("vyra-start-on", true);
    save("vyra-start-last", todayLocal());
  }
  if (kind === "goal") {
    const g = readGoal();
    if (g && !g.done.includes(id)) {
      save(GOAL_KEY, { ...g, done: [...g.done, id] });
      celebrate();
    }
  }
}

/* ---------- readiness and easy swaps ---------- */

export function readinessToday(): number | null {
  const v = load<{ sleep: number; energy: number; soreness: number; pain: boolean } | null>(`vyra-ready-${todayLocal()}`, null);
  if (!v) return null;
  return v.pain ? 25 : Math.round(((v.sleep + v.energy + (6 - v.soreness) - 3) / 12) * 100);
}
export const swapped = (id: string) => !!load<Record<string, boolean>>(SWAPS, {})[id];
export function setSwap(id: string, on: boolean) {
  const s = load<Record<string, boolean>>(SWAPS, {});
  if (on) s[id] = true;
  else delete s[id];
  save(SWAPS, s);
}

/* ---------- today ---------- */

export type TodayItem = {
  source: "goal" | "start";
  ref: string;
  title: string;
  sub: string;
  desc: string;
  when: "today" | "next";
  date: string | null;
  quality: boolean;
  timer: string | null;
  run: string; // GPS run with this session
  doneToday: boolean;
  countdown?: { days: number; label: string };
  week?: number; // race plan: week number, from 1
  free?: boolean; // partner race: the whole plan is open
  plan: string; // where the whole plan lives
  km?: number;
  pace?: [number, number] | null;
  minutes?: number;
  next?: { title: string; sub: string; date: string | null } | null;
};

const runUrl = (ref: string, title: string, pace?: [number, number] | null) =>
  `/app/bieg?ref=${encodeURIComponent(ref)}&t=${encodeURIComponent(title)}${pace ? `&p=${pace[0]}-${pace[1]}` : ""}`;

/** The session to show on the home screen, from the active free plan. Race plan wins over the starter plan. */
export function todayItem(): TodayItem | null {
  const today = todayLocal();
  const g = readGoal();
  if (g && g.race >= today) {
    const plan = buildPlan(g, today);
    const all = plan.weeks.flatMap((w) => w.sessions);
    const done = goalDoneSet(g, all);
    const days = Math.round((Date.parse(`${g.race}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
    const countdown = { days, label: g.name || { "5k": "5 km", "10k": "10 km", half: "Półmaraton", marathon: "Maraton" }[g.dist] };
    const t = all.find((s) => s.date === today);
    const s = t ?? all.find((x) => x.date > today && !done.has(x.id));
    if (!s) return null;
    const ref = `goal:${s.id}`;
    const nx = all.find((x) => x.date > today && !done.has(x.id));
    const easy = swapped(s.id) && s.kind === "quality";
    const title = easy ? `Spokojnie ${Math.max(4, Math.round(s.km * 0.6))} km (zamiast akcentu)` : s.title;
    return {
      source: "goal",
      ref,
      title,
      sub: `${s.km} km${s.pace ? ` · ${fmtPace(s.pace[0])}–${fmtPace(s.pace[1])}/km` : ""}`,
      desc: easy ? "Gotowość jest dziś niska, więc zamiast mocnego treningu biegniesz luźno. Akcent wróci w kolejnym tygodniu." : s.desc,
      when: t ? "today" : "next",
      date: s.date,
      quality: s.kind === "quality" && !easy,
      timer: easy || !s.timer ? null : `${s.timer}&ref=${encodeURIComponent(ref)}`,
      run: runUrl(ref, title, easy ? null : s.pace),
      doneToday: !!t && done.has(t.id),
      countdown,
      week: plan.weeks.findIndex((w) => w.sessions.some((x) => x.id === s.id)) + 1,
      free: freeEvent(g),
      plan: "/app/cel",
      km: easy ? Math.max(4, Math.round(s.km * 0.6)) : s.km,
      pace: easy ? null : s.pace,
      next: nx && nx.id !== s.id ? { title: nx.title, sub: `${nx.km} km`, date: nx.date } : null,
    };
  }
  if (startActive()) {
    const n = startNext();
    if (!n) return null;
    const ref = `start:${n.id}`;
    const ranToday = readLog().some((r) => r.day === today && r.ref?.startsWith("start:")) || load<string>("vyra-start-last", "") === today;
    return {
      source: "start",
      ref,
      title: `Tydzień ${n.week} · trening ${n.i + 1}`,
      sub: n.text,
      desc: `${n.focus}. Całość ok. ${n.minutes} min z rozgrzewką marszem. Timer poprowadzi Cię sygnałami.`,
      when: ranToday ? "next" : "today",
      date: null,
      quality: false,
      timer: timerFor(n.text, ref),
      run: runUrl(ref, `Tydzień ${n.week} · trening ${n.i + 1}`),
      doneToday: ranToday,
      plan: "/app/plan",
      minutes: n.minutes,
      next: ranToday ? { title: `Tydzień ${n.week} · trening ${n.i + 1}`, sub: n.text, date: null } : null,
    };
  }
  return null;
}
