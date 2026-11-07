import type { AthleteGoal } from "@/lib/types";

export type RacePhase = "base" | "build" | "peak" | "taper" | "race";

export interface RaceCountdown {
  goal: AthleteGoal;
  daysLeft: number;
  week: number;
  totalWeeks: number;
  phase: RacePhase;
}

const DAY = 86_400_000;
const day = (iso: string) => Date.parse(`${iso.slice(0, 10)}T12:00:00Z`);

/** Training phase from weeks left to the race: base → build → peak → taper. */
export function phaseFor(daysLeft: number): RacePhase {
  if (daysLeft <= 0) return "race";
  if (daysLeft <= 14) return "taper";
  if (daysLeft <= 42) return "peak";
  if (daysLeft <= 98) return "build";
  return "base";
}

/** The athlete's target race: the main race (A start) if marked, otherwise the nearest active goal with a date from today on. */
export function raceCountdown(goals: AthleteGoal[], today: string): RaceCountdown | null {
  const upcoming = goals
    .filter((g) => g.status === "active" && g.deadline && g.deadline >= today)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!));
  const next = upcoming.find((g) => g.is_main) ?? upcoming[0];
  if (!next) return null;
  const start = Math.min(day(next.created_at), day(today));
  const end = day(next.deadline!);
  const daysLeft = Math.round((end - day(today)) / DAY);
  const totalWeeks = Math.max(1, Math.ceil((end - start + DAY) / (7 * DAY)));
  const week = Math.min(totalWeeks, Math.max(1, Math.floor((day(today) - start) / (7 * DAY)) + 1));
  return { goal: next, daysLeft, week, totalWeeks, phase: phaseFor(daysLeft) };
}
