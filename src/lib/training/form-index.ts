import { addDaysISO } from "@/lib/dates";
import type { SessionSummary } from "@/lib/types";
import { isDone, isDue } from "@/lib/training/status";

/** Running categories counted as "hard" in the easy/hard split (the rest of running is easy). */
const HARD = new Set(["tempo", "threshold", "intervals", "fartlek", "hills", "progression", "race_pace", "test", "race"]);

export function isHardRun(s: Pick<SessionSummary, "kind" | "category">): boolean {
  return s.kind === "running" && HARD.has(s.category);
}

export interface IntensitySplit {
  easyS: number;
  hardS: number;
  /** Easy share of running time, 0–100; null without timed runs. */
  easyPct: number | null;
}

/** Easy vs hard running time of done sessions performed in [from, to]. */
export function intensitySplit(sessions: SessionSummary[], from: string, to: string): IntensitySplit {
  let easyS = 0;
  let hardS = 0;
  for (const s of sessions) {
    const e = s.execution;
    if (s.kind !== "running" || !e || !isDone(e.status)) continue;
    const day = e.performed_on || s.scheduled_date;
    if (day < from || day > to) continue;
    const secs = e.duration_s ?? (e.distance_m ? Math.round((e.distance_m / 1000) * 360) : 0);
    if (isHardRun(s)) hardS += secs;
    else easyS += secs;
  }
  const total = easyS + hardS;
  return { easyS, hardS, easyPct: total > 0 ? Math.round((easyS / total) * 100) : null };
}

export interface FormIndex {
  /** 0–100. */
  score: number;
  /** Change against the same index a week earlier, in points; null when there was none. */
  delta: number | null;
  label: string;
  parts: { consistency: number; load: number; balance: number };
}

/**
 * A simple, explainable 0–100 form index built only from what the athlete logged:
 * consistency (sessions done of those due, last 4 weeks), load (last 4 weeks of running
 * against the 4 weeks before: steady growth scores best, a drop or a spike scores less)
 * and balance (share of easy running, best around 75–90%).
 */
export function formIndex(sessions: SessionSummary[], today: string): FormIndex | null {
  const now = scoreAt(sessions, today);
  if (!now) return null;
  const before = scoreAt(sessions, addDaysISO(today, -7));
  return { ...now, delta: before ? now.score - before.score : null, label: labelFor(now.score) };
}

function scoreAt(sessions: SessionSummary[], day: string): Omit<FormIndex, "delta" | "label"> | null {
  const from = addDaysISO(day, -27);
  const due = sessions.filter((s) => s.scheduled_date >= from && s.scheduled_date <= day && isDue(s.scheduled_date, day));
  if (due.length < 3) return null;
  const done = due.filter((s) => isDone(s.status)).length;
  const consistency = done / due.length;

  const km = (a: string, b: string) =>
    sessions.reduce((n, s) => {
      const e = s.execution;
      if (s.kind !== "running" || !e || !isDone(e.status)) return n;
      const d = e.performed_on || s.scheduled_date;
      return d >= a && d <= b ? n + (e.distance_m ?? 0) / 1000 : n;
    }, 0);
  const recent = km(from, day);
  const base = km(addDaysISO(from, -28), addDaysISO(from, -1));
  let load: number;
  if (base < 1) load = recent > 0 ? 0.7 : 0.3;
  else {
    const r = recent / base;
    // 1.0–1.15 is ideal; falls off below 0.7 and above 1.4.
    load = r < 1 ? Math.max(0, 1 - (1 - r) * 1.2) : r <= 1.15 ? 1 : Math.max(0.3, 1 - (r - 1.15) * 2);
  }

  const split = intensitySplit(sessions, from, day);
  const p = split.easyPct;
  const balance = p == null ? 0.6 : p >= 75 && p <= 90 ? 1 : p > 90 ? Math.max(0.6, 1 - (p - 90) / 25) : Math.max(0.2, 1 - (75 - p) / 40);

  const score = Math.round(100 * (0.5 * consistency + 0.3 * load + 0.2 * balance));
  return { score: Math.max(0, Math.min(100, score)), parts: { consistency: Math.round(consistency * 100), load: Math.round(load * 100), balance: Math.round(balance * 100) } };
}

function labelFor(score: number): string {
  if (score >= 85) return "peak";
  if (score >= 70) return "building";
  if (score >= 50) return "steady";
  return "rebuild";
}

