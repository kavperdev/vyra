import { matchStandardDistance } from "@/lib/training/records";

export interface Achievement {
  kind: "distance_pr" | "heaviest_set" | "longest_run" | "fastest_pace";
  /** Distance label or exercise name. */
  label: string;
  /** Seconds (distance_pr), kg (heaviest_set), metres (longest_run) or s/km (fastest_pace). */
  value: number;
  /** Improvement in the same unit (always positive), null when there was nothing to beat. */
  delta: number | null;
}

export interface RunRow {
  execution_id: string;
  distance_m: number | null;
  duration_s: number | null;
}

export interface LiftRow {
  execution_id: string;
  exercise_name: string;
  load_kg: number | null;
}

/**
 * What the just-saved session beat in the athlete's own history. Comparisons need history
 * (a few earlier runs, or an earlier set of the same exercise), so a first workout is never
 * a "record". Records the athlete confirmed are also counted for standard distances.
 */
export function detectAchievements(
  current: string,
  runs: RunRow[],
  lifts: LiftRow[],
  confirmedBest: Map<string, number> = new Map(),
): Achievement[] {
  const out: Achievement[] = [];
  const mine = runs.find((r) => r.execution_id === current);
  const prior = runs.filter((r) => r.execution_id !== current && (r.distance_m ?? 0) > 0);

  if (mine?.distance_m) {
    const std = matchStandardDistance(mine.distance_m);
    if (std && mine.duration_s) {
      const times = prior.filter((r) => r.duration_s && matchStandardDistance(r.distance_m)?.meters === std.meters).map((r) => r.duration_s!);
      const conf = confirmedBest.get(std.label);
      if (conf != null) times.push(conf);
      const best = times.length ? Math.min(...times) : null;
      if (best != null && mine.duration_s < best) out.push({ kind: "distance_pr", label: std.label, value: mine.duration_s, delta: best - mine.duration_s });
    }
    if (prior.length >= 3 && mine.distance_m >= 5000) {
      const longest = Math.max(...prior.map((r) => r.distance_m!));
      if (mine.distance_m > longest) out.push({ kind: "longest_run", label: "", value: mine.distance_m, delta: mine.distance_m - longest });
    }
    if (mine.duration_s && mine.distance_m >= 5000) {
      const pace = (r: RunRow) => r.duration_s! / (r.distance_m! / 1000);
      const comparable = prior.filter((r) => r.duration_s && r.distance_m! >= 5000);
      if (comparable.length >= 2) {
        const best = Math.min(...comparable.map(pace));
        const now = pace(mine);
        if (now < best - 0.5 && !out.some((a) => a.kind === "distance_pr")) out.push({ kind: "fastest_pace", label: "", value: Math.round(now), delta: Math.round(best - now) });
      }
    }
  }

  const key = (n: string) => n.trim().toLocaleLowerCase("pl-PL");
  const heaviestNow = new Map<string, { name: string; kg: number }>();
  const heaviestBefore = new Map<string, number>();
  for (const l of lifts) {
    if (!l.load_kg || !l.exercise_name.trim()) continue;
    const k = key(l.exercise_name);
    if (l.execution_id === current) {
      const cur = heaviestNow.get(k);
      if (!cur || l.load_kg > cur.kg) heaviestNow.set(k, { name: l.exercise_name.trim(), kg: l.load_kg });
    } else heaviestBefore.set(k, Math.max(heaviestBefore.get(k) ?? 0, l.load_kg));
  }
  const lifted = [...heaviestNow.entries()]
    .filter(([k, v]) => (heaviestBefore.get(k) ?? 0) > 0 && v.kg > heaviestBefore.get(k)!)
    .map(([k, v]) => ({ kind: "heaviest_set" as const, label: v.name, value: v.kg, delta: Math.round((v.kg - heaviestBefore.get(k)!) * 100) / 100 }))
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
  out.push(...lifted);

  const order = { distance_pr: 0, heaviest_set: 1, longest_run: 2, fastest_pace: 3 };
  return out.sort((a, b) => order[a.kind] - order[b.kind]).slice(0, 3);
}
