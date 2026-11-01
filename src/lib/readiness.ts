export interface Readiness {
  id: string;
  athlete_id: string;
  day: string;
  sleep: number;
  energy: number;
  soreness: number;
  pain: boolean;
  pain_area: string | null;
  note: string | null;
}

export type ReadinessLevel = "good" | "watch" | "low";

/**
 * Simple traffic light from the morning check-in (1–5 scales; soreness 5 = very sore).
 * Pain or a very low score always turns it red, so the coach can react before an injury.
 */
export function readinessLevel(r: Pick<Readiness, "sleep" | "energy" | "soreness" | "pain">): ReadinessLevel {
  const score = r.sleep + r.energy + (6 - r.soreness); // 3–15
  if (r.pain || score <= 7 || r.sleep === 1 || r.energy === 1) return "low";
  if (score <= 10 || r.soreness >= 4) return "watch";
  return "good";
}

export const READINESS_TONE: Record<ReadinessLevel, string> = {
  good: "bg-done",
  watch: "bg-warning",
  low: "bg-problem",
};
