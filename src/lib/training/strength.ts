export interface SetLike {
  reps?: number | null;
  load_kg?: number | null;
  completed?: boolean;
}

/**
 * Estimated one-rep max (Epley: load × (1 + reps / 30)).
 * Only computed for 1–12 reps with a load: beyond that the estimate is unreliable.
 * Always label the result as an estimate in the UI.
 */
export function estimateOneRepMax(loadKg: number | null | undefined, reps: number | null | undefined): number | null {
  if (!loadKg || !reps || loadKg <= 0 || reps <= 0 || reps > 12) return null;
  if (reps === 1) return round1(loadKg);
  return round1(loadKg * (1 + reps / 30));
}

/** Volume load (kg × reps) of completed sets. Sets without load contribute nothing. */
export function volumeLoad(sets: SetLike[]): number {
  return round1(
    sets.reduce((sum, s) => (s.completed === false || !s.reps || !s.load_kg ? sum : sum + s.reps * s.load_kg), 0),
  );
}

export function totalReps(sets: SetLike[]): number {
  return sets.reduce((sum, s) => (s.completed === false || !s.reps ? sum : sum + s.reps), 0);
}

export function bestSet(sets: SetLike[]): { load_kg: number; reps: number; e1rm: number | null } | null {
  let best: { load_kg: number; reps: number; e1rm: number | null } | null = null;
  for (const s of sets) {
    if (s.completed === false || !s.load_kg || !s.reps) continue;
    const e1rm = estimateOneRepMax(s.load_kg, s.reps);
    if (!best || s.load_kg > best.load_kg || (s.load_kg === best.load_kg && s.reps > best.reps)) {
      best = { load_kg: s.load_kg, reps: s.reps, e1rm };
    }
  }
  return best;
}

/**
 * Exercises are grouped by exact name (case and spacing normalised only). Variants such as
 * "Przysiad przedni" and "Przysiad" stay separate so results are never mixed.
 */
export function exerciseKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("pl-PL");
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
