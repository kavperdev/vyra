import { addDaysISO } from "@/lib/dates";
import type { PersonalRecord, SessionSummary } from "@/lib/types";
import { isDone } from "@/lib/training/status";

/**
 * Race-time prediction from what the athlete actually ran.
 *
 * Every hard effort (race, test, personal record, tempo/threshold run, or a run rated RPE 9–10)
 * becomes a fitness score (VDOT, Daniels & Gilbert). The best recent score predicts 5 km to marathon.
 * Older efforts count a little less; half and marathon predictions are made slower for low weekly volume,
 * because the formula assumes the endurance that comes with enough kilometres.
 */

export const PREDICTION_DISTANCES = [
  { key: "5k", m: 5000, label: "5 km" },
  { key: "10k", m: 10000, label: "10 km" },
  { key: "half", m: 21097.5, label: "Półmaraton" },
  { key: "marathon", m: 42195, label: "Maraton" },
] as const;

export type DistanceKey = (typeof PREDICTION_DISTANCES)[number]["key"];

export interface Effort {
  date: string;
  distanceM: number;
  seconds: number;
  /** "race" | "test" | "record" | "tempo" | "hard" */
  source: "race" | "test" | "record" | "tempo" | "hard";
  title: string;
  sessionId: string | null;
  vdot: number;
}

export interface Prediction {
  vdot: number;
  basis: Effort;
  confidence: "high" | "medium" | "low";
  weeklyKm: number;
  times: { key: DistanceKey; label: string; m: number; seconds: number; pace: number; adjusted: boolean }[];
  /** Change of each predicted time against four weeks ago (negative = faster), when there was a prediction then. */
  change: Partial<Record<DistanceKey, number>> | null;
}

const RECENT_DAYS = 56;
const MAX_AGE_DAYS = 365;
const DAY = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY);

/** Oxygen cost of running at v metres per minute. */
const vo2At = (v: number) => -4.6 + 0.182258 * v + 0.000104 * v * v;
/** Fraction of VO2max an athlete can hold for t minutes. */
const fractionFor = (t: number) => 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);

/** VDOT of an all-out effort. */
export function vdotOf(distanceM: number, seconds: number): number {
  const t = seconds / 60;
  return vo2At(distanceM / t) / fractionFor(t);
}

/** Time (s) an athlete with this VDOT could run the distance in. */
export function timeFor(vdot: number, distanceM: number): number {
  let lo = distanceM / 10; // 10 m/s
  let hi = distanceM / 1; // 1 m/s
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (vdotOf(distanceM, mid) > vdot) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** A tempo or threshold run is held at about 88% of VO2max, not all-out. */
const TEMPO_FRACTION = 0.88;
const TEMPO_CATEGORIES = new Set(["tempo", "threshold", "race_pace", "progression"]);

/** Hard efforts from logged sessions and running records. */
export function collectEfforts(sessions: SessionSummary[], records: PersonalRecord[]): Effort[] {
  const out: Effort[] = [];
  for (const s of sessions) {
    const e = s.execution;
    if (s.kind !== "running" || !e || !isDone(e.status)) continue;
    const d = e.distance_m ?? 0;
    const sec = e.duration_s ?? 0;
    if (d < 1500 || sec < 300) continue;
    const pace = sec / (d / 1000);
    if (pace < 150 || pace > 900) continue; // faster than 2:30 or slower than 15:00 per km: a typo
    if (s.category === "race" || s.category === "test" || (e.rpe ?? 0) >= 9) {
      const source = s.category === "race" ? "race" : s.category === "test" ? "test" : "hard";
      out.push({ date: e.performed_on, distanceM: d, seconds: sec, source, title: s.title, sessionId: s.id, vdot: vdotOf(d, sec) });
    } else if (TEMPO_CATEGORIES.has(s.category) && sec >= 900 && d >= 3000) {
      const v = d / (sec / 60);
      out.push({ date: e.performed_on, distanceM: d, seconds: sec, source: "tempo", title: s.title, sessionId: s.id, vdot: vo2At(v) / TEMPO_FRACTION });
    }
  }
  for (const r of records) {
    if (r.kind !== "running" || r.unit !== "s" || !r.distance_m || r.distance_m < 1500 || r.value < 240) continue;
    out.push({ date: r.achieved_on, distanceM: r.distance_m, seconds: Number(r.value), source: "record", title: r.label, sessionId: r.session_id, vdot: vdotOf(r.distance_m, Number(r.value)) });
  }
  return out;
}

/** Score of an effort as of a day: recent efforts count fully, older ones a little less (about 1.5% per month). */
function scoreAt(e: Effort, asOf: string): number | null {
  const age = days(e.date, asOf);
  if (age < 0 || age > MAX_AGE_DAYS) return null;
  return e.vdot * (age <= RECENT_DAYS ? 1 : 1 - 0.0005 * (age - RECENT_DAYS));
}

function bestAt(efforts: Effort[], asOf: string): { effort: Effort; vdot: number } | null {
  let best: { effort: Effort; vdot: number } | null = null;
  for (const e of efforts) {
    const v = scoreAt(e, asOf);
    if (v != null && v >= 25 && v <= 90 && (!best || v > best.vdot)) best = { effort: e, vdot: v };
  }
  return best;
}

/** Average running km per week over the six weeks before `asOf`. */
export function weeklyKmBefore(sessions: SessionSummary[], asOf: string): number {
  const from = addDaysISO(asOf, -42);
  let m = 0;
  for (const s of sessions) {
    const e = s.execution;
    if (s.kind === "running" && e && isDone(e.status) && e.performed_on > from && e.performed_on <= asOf) m += e.distance_m ?? 0;
  }
  return Math.round(m / 1000 / 6);
}

/** Endurance correction: the formula assumes enough volume for long distances. */
function volumeFactor(key: DistanceKey, weeklyKm: number): number {
  if (key === "marathon") return 1 + (Math.max(0, 50 - weeklyKm) / 50) * 0.07;
  if (key === "half") return 1 + (Math.max(0, 30 - weeklyKm) / 30) * 0.03;
  return 1;
}

function timesFor(vdot: number, weeklyKm: number) {
  return PREDICTION_DISTANCES.map((d) => {
    const f = volumeFactor(d.key, weeklyKm);
    const seconds = timeFor(vdot, d.m) * f;
    return { key: d.key, label: d.label, m: d.m, seconds, pace: seconds / (d.m / 1000), adjusted: f > 1.005 };
  });
}

/** Prediction for today, with the change against four weeks earlier. Null when there is no hard effort to go on. */
export function predictRaces(sessions: SessionSummary[], records: PersonalRecord[], today: string): Prediction | null {
  const efforts = collectEfforts(sessions, records).filter((e) => e.date <= today);
  const now = bestAt(efforts, today);
  if (!now) return null;
  const weeklyKm = weeklyKmBefore(sessions, today);
  const times = timesFor(now.vdot, weeklyKm);
  const before = addDaysISO(today, -28);
  const then = bestAt(efforts, before);
  let change: Prediction["change"] = null;
  if (then) {
    const old = timesFor(then.vdot, weeklyKmBefore(sessions, before));
    change = Object.fromEntries(times.map((t, i) => [t.key, Math.round(t.seconds - old[i].seconds)]));
  }
  const age = days(now.effort.date, today);
  const direct = now.effort.source !== "tempo";
  const confidence = direct && age <= RECENT_DAYS ? "high" : age <= RECENT_DAYS ? "medium" : "low";
  return { vdot: Math.round(now.vdot * 10) / 10, basis: now.effort, confidence, weeklyKm, times, change };
}
