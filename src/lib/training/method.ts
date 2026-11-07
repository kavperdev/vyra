import { addDaysISO, weekStartISO } from "@/lib/dates";
import type { AthleteGoal, SessionSummary } from "@/lib/types";
import { isDone } from "@/lib/training/status";

/**
 * The VYRA method in numbers: level, zones from current 5 km form, the period of the cycle,
 * taper length by distance and the safety signals the method names. The assistant gets these
 * already computed, so it plans by the method instead of guessing.
 */

export type Level = "beginner" | "intermediate" | "advanced" | "elite";
export const LEVEL_LABEL: Record<Level, string> = {
  beginner: "Początkujący",
  intermediate: "Średniozaawansowany",
  advanced: "Zaawansowany",
  elite: "Wyczynowy",
};
const ORDER: Level[] = ["beginner", "intermediate", "advanced", "elite"];
const lower = (a: Level, b: Level) => (ORDER.indexOf(a) <= ORDER.indexOf(b) ? a : b);
const down = (l: Level) => ORDER[Math.max(0, ORDER.indexOf(l) - 1)];

/** Weekly template of the level, as the method describes it. */
export const LEVEL_WEEK: Record<Level, string> = {
  beginner: "3–4 biegi, 1 lekki akcent (zabawa biegowa lub krótkie odcinki spokojnie), przebieżki; bez sztywnego progu. Np. spokojnie / wolne / zabawa biegowa / wolne / spokojnie z przebieżkami / wolne / dłuższy spokojny bieg.",
  intermediate: "4–5 biegów, 2 sesje podprogowe, długie wybieganie, przebieżki. Np. spokojnie / próg / spokojnie / wolne / próg / spokojnie z przebieżkami / długie wybieganie.",
  advanced: "5–7 biegów, 3 sesje podprogowe, 1 sesja podbiegów lub szybkości, długie wybieganie. Np. spokojnie / próg / spokojnie / próg / spokojnie / krótki próg lub podbiegi / długie wybieganie.",
  elite: "1–2 dni podwójnego progu, 1 sesja szybkości lub podbiegów, długie wybieganie, czasem drugi spokojny bieg w ciągu dnia. Gdy nie może biegać 2× dziennie: 3 pojedyncze, dłuższe progi.",
};

export interface LevelResult {
  level: Level;
  reasons: string[];
  /** Under 18: no double threshold, no marathon blocks. */
  minor: boolean;
}

/** Level from 5 km form, weekly volume, experience and injuries. When in doubt, the lower level (as the method says). */
export function levelFor(input: { fiveKSeconds: number | null; weeklyKm: number; experienceYears: number | null; activeInjury: boolean; age: number | null }): LevelResult {
  const reasons: string[] = [];
  const byTime = (s: number): Level => (s > 25 * 60 ? "beginner" : s > 20 * 60 ? "intermediate" : s > 17 * 60 ? "advanced" : "elite");
  const byKm = (k: number): Level => (k <= 30 ? "beginner" : k <= 50 ? "intermediate" : k <= 80 ? "advanced" : "elite");
  let level: Level = "elite";
  if (input.fiveKSeconds) {
    level = lower(level, byTime(input.fiveKSeconds));
    reasons.push(`forma na 5 km → ${LEVEL_LABEL[byTime(input.fiveKSeconds)]}`);
  } else {
    level = lower(level, "intermediate");
    reasons.push("brak aktualnej formy na 5 km → ostrożnie");
  }
  level = lower(level, byKm(input.weeklyKm));
  reasons.push(`${input.weeklyKm} km/tydz. → ${LEVEL_LABEL[byKm(input.weeklyKm)]}`);
  if (input.experienceYears != null) {
    if (input.experienceYears < 1) {
      level = "beginner";
      reasons.push("staż poniżej roku → Początkujący");
    } else if (input.experienceYears < 3 && level === "elite") {
      level = "advanced";
      reasons.push("wyczynowy wymaga kilku lat treningu");
    }
  }
  if (input.activeInjury) {
    level = down(level);
    reasons.push("aktywna lub nawracająca kontuzja → poziom niżej");
  }
  const minor = input.age != null && input.age < 18;
  if (minor && level === "elite") {
    level = "advanced";
    reasons.push("niepełnoletni: bez podwójnego progu");
  }
  return { level, reasons, minor };
}

export interface Zone {
  name: string;
  from: number; // s/km, faster bound
  to: number; // s/km, slower bound
  hr: string;
  feel: string;
}

/** Zones from the CURRENT 5 km pace (s/km), as in the method's table. */
export function zonesFrom5k(p5k: number, maxHr: number | null): Zone[] {
  const hr = (a: number, b: number | null) => (maxHr ? `${Math.round(maxHr * a)}${b ? `–${Math.round(maxHr * b)}` : "+"} bpm` : `${Math.round(a * 100)}${b ? `–${Math.round(b * 100)}` : "+"}% HRmax`);
  return [
    { name: "Regeneracja", from: p5k * 1.35, to: p5k * 1.5, hr: maxHr ? `< ${Math.round(maxHr * 0.7)} bpm` : "< 70% HRmax", feel: "bardzo lekko" },
    { name: "Spokojnie", from: p5k * 1.25, to: p5k * 1.35, hr: hr(0.7, 0.78), feel: "swobodna rozmowa" },
    { name: "Tempo maratońskie", from: p5k * 1.12, to: p5k * 1.18, hr: hr(0.78, 0.84), feel: "spokojnie, ale z wysiłkiem" },
    { name: "Próg podprogowy", from: p5k * 1.1, to: p5k * 1.15, hr: hr(0.82, 0.88), feel: "6–7/10, pełna kontrola" },
    { name: "Tempo 10 km–półmaraton", from: p5k * 1.02, to: p5k * 1.08, hr: hr(0.88, 0.92), feel: "8/10" },
    { name: "VO2max (3–5 km)", from: p5k * 0.98, to: p5k, hr: hr(0.92, null), feel: "9/10" },
  ];
}

/** Race distance in metres from the goal's name or description ("półmaraton", "10 km", "maraton"). */
export function raceDistance(goal: Pick<AthleteGoal, "name" | "description"> | null): number | null {
  if (!goal) return null;
  const t = `${goal.name} ${goal.description ?? ""}`.toLowerCase();
  if (/p[oó]ł\s*-?\s*maraton|half|21[.,]1/.test(t)) return 21097.5;
  if (/maraton|marathon|42[.,]2/.test(t)) return 42195;
  const m = /(\d{1,2}(?:[.,]\d)?)\s*(km|k\b)/.exec(t);
  if (m) return Math.round(Number(m[1].replace(",", ".")) * 1000);
  if (/1500|1 500/.test(t)) return 1500;
  if (/3000|3 000/.test(t)) return 3000;
  return null;
}

/** Taper length (days) by distance: 5–10 km 7–10, half 10–14, marathon 14–21. */
export function taperDays(distanceM: number | null): { from: number; to: number } {
  if (!distanceM || distanceM <= 10000) return { from: 7, to: 10 };
  if (distanceM <= 21100) return { from: 10, to: 14 };
  return { from: 14, to: 21 };
}

export type MethodPeriod = "base" | "threshold" | "race" | "taper" | "raceday" | "recovery" | "general";
export const PERIOD_LABEL: Record<MethodPeriod, string> = {
  base: "Baza",
  threshold: "Rozwój progu",
  race: "Okres startowy",
  taper: "Taper",
  raceday: "Start",
  recovery: "Roztrenowanie po starcie",
  general: "Rozwój ogólny (bez startu docelowego)",
};
export const PERIOD_RULES: Record<MethodPeriod, string> = {
  base: "głównie spokojne bieganie, przebieżki, krótkie podbiegi, krótkie odcinki progowe i siłownia; kilometraż rośnie spokojnie",
  threshold: "pełna liczba sesji progowych dla poziomu (u wyczynowych podwójny próg), wydłużamy odcinki i łączny czas pracy, raz w tygodniu podbiegi albo szybkość",
  race: "jeden próg w tygodniu zamieniamy na tempo startowe, reszta progu jako podtrzymanie, długie wybieganie z fragmentami w tempie startowym; siła raz w tygodniu",
  taper: "kilometraż −30–50%, intensywność zostaje (krótsze akcenty w tempie startowym), podwójny próg najpóźniej 10 dni przed startem, ostatni akcent 3–5 dni przed, dzień przed 20–30 min spokojnie z przebieżkami, siła tylko aktywacja",
  raceday: "start",
  recovery: "1–2 tygodnie lżej, bez akcentów",
  general: "baza i rozwój progu według poziomu, cykl 3 tygodnie budowania + 1 lżejszy, bez szczytowania formy",
};

export interface PeriodPlan {
  period: MethodPeriod;
  distanceM: number | null;
  daysLeft: number | null;
  /** Dates when each period starts, for the outline. */
  starts: { period: MethodPeriod; from: string }[];
}

/** Period of the method from days to the main race and its distance; recovery for 14 days after a race. */
export function methodPeriod(goal: AthleteGoal | null, today: string, lastRaceDate: string | null): PeriodPlan {
  if (lastRaceDate && lastRaceDate <= today && lastRaceDate >= addDaysISO(today, -13) && (!goal?.deadline || goal.deadline > addDaysISO(today, 42))) {
    return { period: "recovery", distanceM: null, daysLeft: null, starts: [] };
  }
  if (!goal?.deadline) return { period: "general", distanceM: null, daysLeft: null, starts: [] };
  const d = raceDistance(goal);
  const days = Math.round((Date.parse(`${goal.deadline}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  const taper = taperDays(d).to;
  const raceBlock = 7 * 7; // 6–8 weeks of race-specific work
  const thresholdBlock = 8 * 7; // 6–10 weeks of threshold development
  const period: MethodPeriod = days <= 0 ? "raceday" : days <= taper ? "taper" : days <= taper + raceBlock ? "race" : days <= taper + raceBlock + thresholdBlock ? "threshold" : "base";
  const at = (n: number) => addDaysISO(goal.deadline!, -n);
  return {
    period,
    distanceM: d,
    daysLeft: days,
    starts: [
      { period: "threshold", from: at(taper + raceBlock + thresholdBlock) },
      { period: "race", from: at(taper + raceBlock) },
      { period: "taper", from: at(taper) },
      { period: "raceday", from: goal.deadline },
    ],
  };
}

export interface CycleSignals {
  /** Building weeks in a row since the last lighter week (20–30% less). */
  buildWeeks: number;
  /** No running for 14+ days before today, after earlier training. */
  returning: boolean;
  /** Last race or test, for pace updates every 4–6 weeks. */
  lastTest: string | null;
  /** Threshold sessions done in the last 6 weeks (formats to keep repeatable). */
  thresholdFormats: string[];
  /** Pain reported in the last 3 days. */
  recentPain: string | null;
  /** Readiness: 2+ bad days (sleep or energy ≤ 2) in the last 3. */
  fatigue: boolean;
}

export function cycleSignals(
  past: SessionSummary[],
  today: string,
  readiness: { day: string; sleep: number; energy: number; pain: boolean; pain_area: string | null }[],
): CycleSignals {
  const weekKm = new Map<string, number>();
  for (const s of past) {
    const e = s.execution;
    if (s.kind !== "running" || !e || !isDone(e.status)) continue;
    const w = weekStartISO(e.performed_on);
    weekKm.set(w, (weekKm.get(w) ?? 0) + (e.distance_m ?? 0) / 1000);
  }
  // Completed weeks, newest first.
  const weeks: number[] = [];
  for (let i = 1; i <= 12; i++) weeks.push(weekKm.get(weekStartISO(addDaysISO(today, -7 * i))) ?? 0);
  let buildWeeks = 0;
  for (let i = 0; i < weeks.length - 1; i++) {
    const prevMax = Math.max(...weeks.slice(i + 1, i + 4));
    if (weeks[i] === 0 || prevMax === 0 || weeks[i] <= prevMax * 0.8) break;
    buildWeeks += 1;
  }
  const runsLast14 = past.some((s) => s.kind === "running" && s.execution && isDone(s.execution.status) && s.execution.performed_on > addDaysISO(today, -14));
  const ranBefore = past.some((s) => s.kind === "running" && s.execution && isDone(s.execution.status) && s.execution.performed_on <= addDaysISO(today, -14));
  const tests = past.filter((s) => (s.category === "test" || s.category === "race") && s.execution && isDone(s.execution.status)).map((s) => s.execution!.performed_on).sort();
  const thresholdFormats = past
    .filter((s) => (s.category === "threshold" || s.category === "tempo") && s.scheduled_date > addDaysISO(today, -42))
    .map((s) => `${s.scheduled_date} ${s.title}`);
  const last3 = readiness.filter((r) => r.day > addDaysISO(today, -3));
  const pain = last3.filter((r) => r.pain);
  return {
    buildWeeks,
    returning: !runsLast14 && ranBefore,
    lastTest: tests[tests.length - 1] ?? null,
    thresholdFormats,
    recentPain: pain.length ? pain.map((r) => r.pain_area || "bez miejsca").join(", ") : null,
    fatigue: last3.filter((r) => r.sleep <= 2 || r.energy <= 2).length >= 2,
  };
}

const EXPERIENCE_YEARS: Record<string, number> = { "0": 0, "1": 0.5, "3": 2, "5": 4, "6": 6 };

export interface MethodSnapshot {
  fiveK: { seconds: number; pace: number; source: string } | null;
  weeklyKm: number;
  level: LevelResult;
  zones: Zone[] | null;
  plan: PeriodPlan;
  taper: { from: number; to: number };
  signals: CycleSignals;
  mainGoal: AthleteGoal | null;
}

/**
 * Everything the method needs, computed from data already loaded.
 * `fiveK` comes from the race prediction (current form), never from the goal.
 */
export function methodSnapshot(input: {
  past: SessionSummary[];
  goals: AthleteGoal[];
  today: string;
  prediction: { times: { key: string; seconds: number; pace: number }[]; basis: { title: string; date: string }; weeklyKm: number } | null;
  weeklyKm: number;
  birthYear: number | null;
  maxHr: number | null;
  intake: Record<string, string | string[]> | null | undefined;
  injuries: { status: string }[];
  readiness: { day: string; sleep: number; energy: number; pain: boolean; pain_area: string | null }[];
  mainGoal: AthleteGoal | null;
}): MethodSnapshot {
  const t5 = input.prediction?.times.find((t) => t.key === "5k") ?? null;
  const fiveK = t5 ? { seconds: t5.seconds, pace: t5.pace, source: `${input.prediction!.basis.title}, ${input.prediction!.basis.date}` } : null;
  const exp = input.intake && typeof input.intake.experience === "string" ? (EXPERIENCE_YEARS[input.intake.experience] ?? null) : null;
  const age = input.birthYear ? new Date(`${input.today}T12:00:00Z`).getUTCFullYear() - input.birthYear : null;
  const level = levelFor({
    fiveKSeconds: fiveK?.seconds ?? null,
    weeklyKm: input.weeklyKm,
    experienceYears: exp,
    activeInjury: input.injuries.some((i) => i.status === "active" || i.status === "recurring"),
    age,
  });
  const lastRace = input.past
    .filter((s) => s.category === "race" && s.execution && isDone(s.execution.status))
    .map((s) => s.execution!.performed_on)
    .sort()
    .pop() ?? null;
  const plan = methodPeriod(input.mainGoal, input.today, lastRace);
  return {
    fiveK,
    weeklyKm: input.weeklyKm,
    level,
    zones: fiveK ? zonesFrom5k(fiveK.pace, input.maxHr) : null,
    plan,
    taper: taperDays(plan.distanceM),
    signals: cycleSignals(input.past, input.today, input.readiness),
    mainGoal: input.mainGoal,
  };
}
