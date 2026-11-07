import "server-only";
import { addDaysISO } from "@/lib/dates";
import { listInjuries } from "@/lib/data/injuries";
import { getAthleteProfile, listGoals, listRecords } from "@/lib/data/people";
import { listSessions } from "@/lib/data/sessions";
import type { ServerSupabase } from "@/lib/supabase/server";
import { loadThresholdReps } from "@/lib/training/form";
import { methodSnapshot, type MethodSnapshot } from "@/lib/training/method";
import { predictRaces, weeklyKmBefore, type Prediction } from "@/lib/training/prediction";
import { raceCountdown } from "@/lib/training/race";

/**
 * One place that reads everything about an athlete's running and returns the race prediction and the
 * method snapshot (level, zones, HR, period, signals). Used by the athlete's progress page and the coach.
 */
export async function athleteForm(supabase: ServerSupabase, athleteId: string, today: string): Promise<{ prediction: Prediction | null; method: MethodSnapshot }> {
  const [year, records, goals, injuries, profile, readiness] = await Promise.all([
    listSessions(supabase, { athleteIds: [athleteId], from: addDaysISO(today, -365), to: today, kinds: ["running"] }),
    listRecords(supabase, athleteId).catch(() => []),
    listGoals(supabase, athleteId).catch(() => []),
    listInjuries(supabase, athleteId),
    getAthleteProfile(supabase, athleteId),
    supabase
      .from("readiness")
      .select("day, sleep, energy, pain, pain_area")
      .eq("athlete_id", athleteId)
      .gte("day", addDaysISO(today, -21))
      .then((r) => (r.data ?? []) as { day: string; sleep: number; energy: number; pain: boolean; pain_area: string | null }[]),
  ]);
  const reps = await loadThresholdReps(supabase, year, addDaysISO(today, -84)).catch(() => []);
  const prediction = predictRaces(year, records, today, reps);
  const method = methodSnapshot({
    past: year,
    records,
    reps,
    goals,
    today,
    prediction,
    weeklyKm: prediction?.weeklyKm ?? weeklyKmBefore(year, today),
    birthYear: profile?.birth_year ?? null,
    profile: profile ? { lthr: profile.lthr, max_hr: profile.max_hr, resting_hr: profile.resting_hr } : null,
    intake: profile?.intake,
    injuries,
    readiness,
    mainGoal: raceCountdown(goals, today)?.goal ?? null,
  });
  return { prediction, method };
}
