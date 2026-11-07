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
  source: "race" | "test" | "record" | "tempo" | "hard" | "reps";
  title: string;
  sessionId: string | null;
  vdot: number;
  avgHr?: number | null;
}

export interface Source extends Effort {
  /** Share of this effort in the 10 km estimate, 0–100. */
  share: number;
}

export interface Prediction {
  /** Overall fitness (VDOT at 10 km), blended from all recent efforts. */
  vdot: number;
  /** The effort with the largest share, kept for short labels. */
  basis: Effort;
  /** Every effort that fed the estimate, with its share. */
  sources: Source[];
  /** Speed vs endurance: how long-distance results compare with short ones. */
  profile: { kind: "speed" | "endurance" | "balanced" | "unknown"; short: number | null; long: number | null };
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

/** Work reps of a threshold session (from lap results): total distance, time and HR of the reps only. */
export interface ThresholdReps {
  sessionId: string;
  date: string;
  title: string;
  distanceM: number;
  seconds: number;
  avgHr: number | null;
  rpe: number | null;
}

/** Hard efforts from logged sessions, records and threshold reps. */
export function collectEfforts(sessions: SessionSummary[], records: PersonalRecord[], reps: ThresholdReps[] = []): Effort[] {
  const out: Effort[] = [];
  const withReps = new Set(reps.map((r) => r.sessionId));
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
      out.push({ date: e.performed_on, distanceM: d, seconds: sec, source, title: s.title, sessionId: s.id, vdot: vdotOf(d, sec), avgHr: e.avg_hr });
    } else if (TEMPO_CATEGORIES.has(s.category) && !withReps.has(s.id) && sec >= 900 && d >= 3000) {
      // Whole session including warm-up: a cautious, low-weight signal.
      out.push({ date: e.performed_on, distanceM: d, seconds: sec, source: "tempo", title: s.title, sessionId: s.id, vdot: vo2At(d / (sec / 60)) / TEMPO_FRACTION, avgHr: e.avg_hr });
    }
  }
  for (const r of reps) {
    if (r.distanceM < 2000 || r.seconds < 480) continue;
    // Controlled sub-threshold reps (the method's 10–15% slower than 5 km pace) sit at about 84% of VO2max;
    // reps run harder (RPE 8+) are closer to 10 km–half effort.
    const fraction = (r.rpe ?? 7) >= 8 ? 0.9 : 0.84;
    out.push({ date: r.date, distanceM: r.distanceM, seconds: r.seconds, source: "reps", title: `${r.title} (odcinki)`, sessionId: r.sessionId, vdot: vo2At(r.distanceM / (r.seconds / 60)) / fraction, avgHr: r.avgHr });
  }
  for (const rec of records) {
    if (rec.kind !== "running" || rec.unit !== "s" || !rec.distance_m || rec.distance_m < 1500 || rec.value < 240) continue;
    out.push({ date: rec.achieved_on, distanceM: rec.distance_m, seconds: Number(rec.value), source: "record", title: rec.label, sessionId: rec.session_id, vdot: vdotOf(rec.distance_m, Number(rec.value)) });
  }
  return out;
}

/** How much each kind of effort is trusted. */
const RELIABILITY: Record<Effort["source"], number> = { race: 1, test: 0.9, record: 0.75, reps: 0.7, hard: 0.55, tempo: 0.4 };

/** Fitness as of a day: slight discount for older efforts (about 0.75% per month after 8 weeks). */
function adjusted(e: Effort, asOf: string): number | null {
  const age = days(e.date, asOf);
  if (age < 0 || age > MAX_AGE_DAYS) return null;
  const v = e.vdot * (age <= RECENT_DAYS ? 1 : 1 - 0.00025 * (age - RECENT_DAYS));
  return v >= 25 && v <= 90 ? v : null;
}

/** Recency weight: full for 6 weeks, then fading with a half-life of about 3 months. */
const recency = (age: number) => (age <= 42 ? 1 : Math.exp(-(age - 42) / 120));
/** Distance similarity: a half marathon says more about a marathon than a 5 km does. */
const similarity = (a: number, b: number) => Math.exp(-Math.abs(Math.log(a / b)) * 1.3);

interface Weighted {
  effort: Effort;
  v: number;
  w: number;
}

/**
 * Fitness for one distance: weighted mean of all efforts of the last year, weighted by reliability,
 * recency and distance similarity. Clearly sub-maximal efforts (below 92% of the best) are left out.
 */
function fitnessFor(efforts: Effort[], asOf: string, distanceM: number): { v: number; parts: Weighted[] } | null {
  const scored = efforts
    .map((e) => ({ effort: e, v: adjusted(e, asOf) }))
    .filter((x): x is { effort: Effort; v: number } => x.v != null);
  if (!scored.length) return null;
  const best = Math.max(...scored.map((x) => x.v));
  const parts = scored
    .filter((x) => x.v >= best * 0.92)
    .map((x) => ({ ...x, w: RELIABILITY[x.effort.source] * recency(days(x.effort.date, asOf)) * similarity(x.effort.distanceM, distanceM) }))
    .filter((x) => x.w > 0.02);
  const total = parts.reduce((a, x) => a + x.w, 0);
  if (!total) return null;
  return { v: parts.reduce((a, x) => a + x.v * x.w, 0) / total, parts };
}

/** Best race-type effort (race, test, record) up to 6 km and from 15 km, for the speed/endurance profile. */
function profileOf(efforts: Effort[], asOf: string): Prediction["profile"] {
  const real = efforts.filter((e) => e.source === "race" || e.source === "test" || e.source === "record");
  const best = (pred: (e: Effort) => boolean) => {
    const vs = real.filter(pred).map((e) => adjusted(e, asOf)).filter((v): v is number => v != null);
    return vs.length ? Math.max(...vs) : null;
  };
  const short = best((e) => e.distanceM <= 6000);
  const long = best((e) => e.distanceM >= 15000);
  if (short == null || long == null) return { kind: "unknown", short, long };
  const diff = (long - short) / short;
  return { kind: diff < -0.03 ? "speed" : diff > 0.02 ? "endurance" : "balanced", short, long };
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

function timesAt(efforts: Effort[], asOf: string, weeklyKm: number) {
  return PREDICTION_DISTANCES.map((d) => {
    const fit = fitnessFor(efforts, asOf, d.m);
    if (!fit) return null;
    const f = volumeFactor(d.key, weeklyKm);
    const seconds = timeFor(fit.v, d.m) * f;
    return { key: d.key, label: d.label, m: d.m, seconds, pace: seconds / (d.m / 1000), adjusted: f > 1.005 };
  });
}

/**
 * Prediction for today from everything the athlete ran: races and tests at every distance, records,
 * threshold reps and hard sessions, each weighted by how much it can be trusted, how recent it is and how
 * close its distance is to the predicted one. Null when there is no hard effort to go on.
 */
export function predictRaces(sessions: SessionSummary[], records: PersonalRecord[], today: string, reps: ThresholdReps[] = []): Prediction | null {
  const efforts = collectEfforts(sessions, records, reps).filter((e) => e.date <= today);
  const ten = fitnessFor(efforts, today, 10000);
  if (!ten) return null;
  const weeklyKm = weeklyKmBefore(sessions, today);
  const times = timesAt(efforts, today, weeklyKm).filter((t): t is NonNullable<typeof t> => t != null);
  const before = addDaysISO(today, -28);
  const old = timesAt(efforts, before, weeklyKmBefore(sessions, before));
  const change = old.every((t) => t != null) ? Object.fromEntries(times.map((t, i) => [t.key, Math.round(t.seconds - old[i]!.seconds)])) : null;
  const total = ten.parts.reduce((a, x) => a + x.w, 0);
  const sources = ten.parts
    .map((x) => ({ ...x.effort, share: Math.round((x.w / total) * 100) }))
    .sort((a, b) => b.share - a.share);
  const recent = efforts.filter((e) => days(e.date, today) <= RECENT_DAYS);
  const confidence = recent.some((e) => e.source === "race" || e.source === "test") && sources.length >= 2 ? "high" : recent.length ? "medium" : "low";
  return { vdot: Math.round(ten.v * 10) / 10, basis: sources[0], sources, profile: profileOf(efforts, today), confidence, weeklyKm, times, change };
}
