import { formatDuration, formatNumber } from "@/lib/format";
import type { PersonalRecord } from "@/lib/types";

export const STANDARD_DISTANCES: { label: string; meters: number }[] = [
  { label: "1 km", meters: 1000 },
  { label: "3 km", meters: 3000 },
  { label: "5 km", meters: 5000 },
  { label: "10 km", meters: 10000 },
  { label: "Półmaraton", meters: 21097 },
  { label: "Maraton", meters: 42195 },
];

/** Distance band accepted as "this distance": the run may be up to 2 % longer, never shorter. */
export function matchStandardDistance(distanceM: number | null | undefined): { label: string; meters: number } | null {
  if (!distanceM) return null;
  return STANDARD_DISTANCES.find((d) => distanceM >= d.meters && distanceM <= d.meters * 1.02) ?? null;
}

export interface RunCandidate {
  session_id: string;
  title: string;
  category: string;
  performed_on: string;
  distance_m: number | null;
  duration_s: number | null;
}

export interface RecordSuggestion {
  label: string;
  distance_m: number;
  value: number;
  achieved_on: string;
  session_id: string;
  title: string;
  previous: number | null;
}

/**
 * Suggests possible running records from logged runs. Suggestions are never saved automatically:
 * the athlete or coach confirms them. Only tests, races and race-pace efforts are considered,
 * because an easy 5 km run is not a 5 km record attempt.
 */
export function suggestRunningRecords(runs: RunCandidate[], records: PersonalRecord[]): RecordSuggestion[] {
  const eligible = new Set(["test", "race", "race_pace", "tempo", "threshold"]);
  const best = new Map<string, number>();
  for (const r of records) {
    if (r.kind !== "running" || r.unit !== "s" || !r.confirmed) continue;
    const prev = best.get(r.label);
    if (prev == null || r.value < prev) best.set(r.label, r.value);
  }
  const already = new Set(records.filter((r) => r.session_id).map((r) => r.session_id));
  const out = new Map<string, RecordSuggestion>();
  for (const run of runs) {
    if (!eligible.has(run.category) || !run.duration_s || already.has(run.session_id)) continue;
    const std = matchStandardDistance(run.distance_m);
    if (!std) continue;
    const previous = best.get(std.label) ?? null;
    if (previous != null && run.duration_s >= previous) continue;
    const current = out.get(std.label);
    if (current && current.value <= run.duration_s) continue;
    out.set(std.label, {
      label: std.label,
      distance_m: std.meters,
      value: run.duration_s,
      achieved_on: run.performed_on,
      session_id: run.session_id,
      title: run.title,
      previous,
    });
  }
  return [...out.values()];
}

/** Best confirmed record per label (lowest time, or highest load/reps). */
export function bestRecords(records: PersonalRecord[]): PersonalRecord[] {
  const map = new Map<string, PersonalRecord>();
  for (const r of records) {
    if (!r.confirmed) continue;
    const key = `${r.kind}:${r.label.toLocaleLowerCase("pl-PL")}`;
    const cur = map.get(key);
    const better = !cur || (r.unit === "s" ? r.value < cur.value : r.value > cur.value);
    if (better) map.set(key, r);
  }
  return [...map.values()].sort((a, b) => a.kind.localeCompare(b.kind) || (a.distance_m ?? 0) - (b.distance_m ?? 0) || a.label.localeCompare(b.label));
}

/** Goal progress 0–100 between a starting value and the target. Null when it cannot be computed. */
export function goalProgress(start: number | null, current: number | null, target: number | null, lowerIsBetter: boolean): number | null {
  if (current == null || target == null) return null;
  if (lowerIsBetter ? current <= target : current >= target) return 100;
  if (start == null || start === target) return null;
  const p = (start - current) / (start - target);
  if (!Number.isFinite(p)) return null;
  return Math.max(0, Math.min(100, Math.round(p * 100)));
}

export function formatRecordValue(r: Pick<PersonalRecord, "value" | "unit">): string {
  if (r.unit === "s") return formatDuration(r.value);
  if (r.unit === "kg") return `${formatNumber(r.value)} kg`;
  if (r.unit === "reps") return `${formatNumber(r.value, 0)} powt.`;
  return `${formatNumber(r.value, 0)} m`;
}
