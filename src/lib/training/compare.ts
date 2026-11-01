import { formatDistance, formatDuration, formatPace, paceFrom } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";

export interface PlannedRunning {
  planned_distance_m?: number | null;
  planned_duration_s?: number | null;
  target_pace_min_s?: number | null;
  target_pace_max_s?: number | null;
  target_hr_min?: number | null;
  target_hr_max?: number | null;
}

export interface ActualRunning {
  distance_m?: number | null;
  duration_s?: number | null;
  avg_pace_s?: number | null;
  avg_hr?: number | null;
}

export type Verdict = "on_target" | "above" | "below" | "faster" | "slower" | "unknown";

export interface ComparisonRow {
  key: "distance" | "duration" | "pace" | "hr" | "rpe";
  label: string;
  planned: string;
  actual: string;
  /** Human readable difference; null when the values cannot be compared reliably. */
  difference: string | null;
  verdict: Verdict;
}

const pct = (a: number, b: number) => (a - b) / b;

/**
 * Plan vs actual for a running session. Differences are only reported when both sides exist.
 * Tolerances: distance/time ±3 %, pace inside the target range (±3 s), heart rate inside range.
 */
export function compareRunning(
  plan: PlannedRunning | null | undefined,
  actual: ActualRunning | null | undefined,
  rpe?: { planned: number | null | undefined; actual: number | null | undefined },
): ComparisonRow[] {
  const p = plan ?? {};
  const a = actual ?? {};
  const rows: ComparisonRow[] = [];

  // distance
  {
    const pl = p.planned_distance_m ?? null;
    const ac = a.distance_m ?? null;
    let difference: string | null = null;
    let verdict: Verdict = "unknown";
    if (pl && ac) {
      const d = ac - pl;
      difference = `${d >= 0 ? "+" : "−"}${formatDistance(Math.abs(d), { unit: "km" })}`;
      verdict = Math.abs(pct(ac, pl)) <= 0.03 ? "on_target" : d > 0 ? "above" : "below";
      if (d === 0) difference = "0";
    }
    rows.push({ key: "distance", label: tl("Dystans", "Distance"), planned: formatDistance(pl), actual: formatDistance(ac), difference, verdict });
  }

  // duration
  {
    const pl = p.planned_duration_s ?? null;
    const ac = a.duration_s ?? null;
    let difference: string | null = null;
    let verdict: Verdict = "unknown";
    if (pl && ac) {
      const d = ac - pl;
      difference = d === 0 ? "0" : `${d > 0 ? "+" : "−"}${formatDuration(Math.abs(d))}`;
      verdict = Math.abs(pct(ac, pl)) <= 0.03 ? "on_target" : d > 0 ? "above" : "below";
    }
    rows.push({ key: "duration", label: tl("Czas", "Time"), planned: formatDuration(pl), actual: formatDuration(ac), difference, verdict });
  }

  // pace (target is a range: min = faster bound, max = slower bound)
  {
    const lo = p.target_pace_min_s ?? null;
    const hi = p.target_pace_max_s ?? lo;
    const ac = a.avg_pace_s ?? paceFrom(a.distance_m, a.duration_s);
    const planned = lo == null ? "–" : lo === hi || hi == null ? `${formatPace(lo)} /km` : `${formatPace(lo)}–${formatPace(hi)} /km`;
    let difference: string | null = null;
    let verdict: Verdict = "unknown";
    if (lo != null && ac != null) {
      const upper = hi ?? lo;
      if (ac < lo - 3) {
        verdict = "faster";
        difference = `${lo - ac} s/km szybciej`;
      } else if (ac > upper + 3) {
        verdict = "slower";
        difference = `${ac - upper} s/km wolniej`;
      } else {
        verdict = "on_target";
        difference = tl("w zakresie", "on target");
      }
    }
    rows.push({ key: "pace", label: tl("Tempo", "Pace"), planned, actual: ac ? `${formatPace(ac)} /km` : "–", difference, verdict });
  }

  // heart rate
  {
    const lo = p.target_hr_min ?? null;
    const hi = p.target_hr_max ?? null;
    const ac = a.avg_hr ?? null;
    const planned = lo && hi ? `${lo}–${hi} bpm` : hi ? `≤ ${hi} bpm` : lo ? `≥ ${lo} bpm` : "–";
    let difference: string | null = null;
    let verdict: Verdict = "unknown";
    if (ac && (lo || hi)) {
      if (hi && ac > hi) {
        verdict = "above";
        difference = tl(`+${ac - hi} bpm ponad zakres`, `+${ac - hi} bpm above range`);
      } else if (lo && ac < lo) {
        verdict = "below";
        difference = tl(`${lo - ac} bpm poniżej zakresu`, `${lo - ac} bpm below range`);
      } else {
        verdict = "on_target";
        difference = tl("w zakresie", "on target");
      }
    }
    rows.push({ key: "hr", label: tl("Śr. tętno", "Avg HR"), planned, actual: ac ? `${ac} bpm` : "–", difference, verdict });
  }

  if (rpe) {
    const pl = rpe.planned ?? null;
    const ac = rpe.actual ?? null;
    let difference: string | null = null;
    let verdict: Verdict = "unknown";
    if (pl != null && ac != null) {
      const d = Math.round((ac - pl) * 10) / 10;
      difference = d === 0 ? "0" : `${d > 0 ? "+" : "−"}${Math.abs(d)}`;
      verdict = Math.abs(d) <= 1 ? "on_target" : d > 0 ? "above" : "below";
    }
    rows.push({ key: "rpe", label: tl("Intensywność (RPE)", "Effort (RPE)"), planned: pl != null ? String(pl) : "–", actual: ac != null ? String(ac) : "–", difference, verdict });
  }

  return rows;
}

export interface PlannedSet {
  planned_reps?: number | null;
  planned_load_kg?: number | null;
  planned_duration_s?: number | null;
}

export interface ActualSet {
  reps?: number | null;
  load_kg?: number | null;
  duration_s?: number | null;
  completed?: boolean;
}

export interface SetComparison {
  reps: number | null;
  load: number | null;
  duration: number | null;
}

/** Differences for one strength set; null where either side is missing. */
export function compareSet(plan: PlannedSet | null | undefined, actual: ActualSet | null | undefined): SetComparison {
  const diff = (a?: number | null, b?: number | null) => (a != null && b != null ? Math.round((a - b) * 100) / 100 : null);
  return {
    reps: diff(actual?.reps, plan?.planned_reps),
    load: diff(actual?.load_kg, plan?.planned_load_kg),
    duration: diff(actual?.duration_s, plan?.planned_duration_s),
  };
}
