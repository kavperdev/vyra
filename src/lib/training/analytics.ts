import { addDaysISO, lastWeekStarts, weekStartISO } from "@/lib/dates";
import type { SessionSummary } from "@/lib/types";
import { isDone, isDue } from "@/lib/training/status";

export interface WeekBucket {
  weekStart: string;
  plannedKm: number;
  actualKm: number;
  plannedSessions: number;
  doneSessions: number;
  dueSessions: number;
  skippedSessions: number;
  runningSeconds: number;
  /** Completion of sessions due in that week, 0–100, or null when nothing was due. */
  completion: number | null;
}

/** Weekly aggregation of planned vs actual running volume and completion. */
export function weeklyBuckets(sessions: SessionSummary[], today: string, weeks: number): WeekBucket[] {
  const starts = lastWeekStarts(today, weeks);
  const map = new Map<string, WeekBucket>(
    starts.map((w) => [w, { weekStart: w, plannedKm: 0, actualKm: 0, plannedSessions: 0, doneSessions: 0, dueSessions: 0, skippedSessions: 0, runningSeconds: 0, completion: null }]),
  );
  for (const s of sessions) {
    const b = map.get(weekStartISO(s.scheduled_date));
    if (!b) continue;
    b.plannedSessions += 1;
    if (s.kind === "running" && s.planned_distance_m) b.plannedKm += s.planned_distance_m / 1000;
    if (isDue(s.scheduled_date, today)) b.dueSessions += 1;
    if (isDone(s.status)) b.doneSessions += 1;
    if (s.status === "skipped") b.skippedSessions += 1;
    if (s.kind === "running" && s.execution && isDone(s.execution.status)) {
      b.actualKm += (s.execution.distance_m ?? 0) / 1000;
      b.runningSeconds += s.execution.duration_s ?? 0;
    }
  }
  for (const b of map.values()) {
    const doneDue = sessions.filter(
      (s) => weekStartISO(s.scheduled_date) === b.weekStart && isDue(s.scheduled_date, today) && isDone(s.status),
    ).length;
    b.completion = b.dueSessions > 0 ? Math.round((doneDue / b.dueSessions) * 100) : null;
    b.plannedKm = round1(b.plannedKm);
    b.actualKm = round1(b.actualKm);
  }
  return starts.map((w) => map.get(w)!);
}

export interface CompletionStats {
  due: number;
  done: number;
  completed: number;
  partial: number;
  skipped: number;
  missing: number;
  /** 0–100, or null when no session was due. */
  rate: number | null;
}

/** Completion of sessions whose date is on or before `today` and inside [from, today]. */
export function completionStats(sessions: SessionSummary[], from: string, today: string): CompletionStats {
  const due = sessions.filter((s) => s.scheduled_date >= from && isDue(s.scheduled_date, today));
  const completed = due.filter((s) => s.status === "completed").length;
  const partial = due.filter((s) => s.status === "partial").length;
  const skipped = due.filter((s) => s.status === "skipped").length;
  const done = completed + partial;
  const missing = due.length - done - skipped - due.filter((s) => s.status === "in_progress").length;
  return {
    due: due.length,
    done,
    completed,
    partial,
    skipped,
    missing: Math.max(0, missing),
    rate: due.length ? Math.round((done / due.length) * 100) : null,
  };
}

export interface RunningTotals {
  sessions: number;
  distanceM: number;
  durationS: number;
  /** Average pace weighted by distance, s/km; null without timed runs. */
  avgPaceS: number | null;
  avgHr: number | null;
}

export function runningTotals(sessions: SessionSummary[]): RunningTotals {
  const runs = sessions.filter((s) => s.kind === "running" && s.execution && isDone(s.execution.status));
  let distanceM = 0;
  let durationS = 0;
  let timedDistance = 0;
  let timedDuration = 0;
  let hrSum = 0;
  let hrWeight = 0;
  for (const s of runs) {
    const e = s.execution!;
    distanceM += e.distance_m ?? 0;
    durationS += e.duration_s ?? 0;
    if (e.distance_m && e.duration_s) {
      timedDistance += e.distance_m;
      timedDuration += e.duration_s;
    }
    if (e.avg_hr && e.duration_s) {
      hrSum += e.avg_hr * e.duration_s;
      hrWeight += e.duration_s;
    }
  }
  return {
    sessions: runs.length,
    distanceM,
    durationS,
    avgPaceS: timedDistance > 0 ? Math.round(timedDuration / (timedDistance / 1000)) : null,
    avgHr: hrWeight > 0 ? Math.round(hrSum / hrWeight) : null,
  };
}

/** Week-over-week change of running volume, in percent; null when the previous week was empty. */
export function loadChange(buckets: WeekBucket[]): number | null {
  if (buckets.length < 2) return null;
  const prev = buckets[buckets.length - 2].actualKm;
  const cur = buckets[buckets.length - 1].actualKm;
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

/** Share of weeks (out of the given buckets with something due) in which at least 80 % was done. */
export function regularity(buckets: WeekBucket[]): number | null {
  const withDue = buckets.filter((b) => b.completion != null);
  if (!withDue.length) return null;
  return Math.round((withDue.filter((b) => (b.completion ?? 0) >= 80).length / withDue.length) * 100);
}

export function periodStart(today: string, weeks: number): string {
  return addDaysISO(weekStartISO(today), -7 * (weeks - 1));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
