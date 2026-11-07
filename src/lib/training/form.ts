import { addDaysISO } from "@/lib/dates";
import { formatPace } from "@/lib/format";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { AthleteProfile, SessionSummary } from "@/lib/types";
import type { Effort, ThresholdReps } from "@/lib/training/prediction";
import { isDone } from "@/lib/training/status";

/**
 * Heart rate and observed threshold from the athlete's own data, so zones do not rest on one race:
 * threshold HR (entered, or estimated from races, tests and threshold reps), max and resting HR,
 * the pace actually held on controlled threshold reps, aerobic efficiency over time, and easy runs run too hard.
 */

const THRESHOLD_CATS = ["threshold", "tempo", "race_pace"];

/** Work reps of recent threshold sessions: only the work parts, without warm-up and cool-down. */
export async function loadThresholdReps(supabase: ServerSupabase, sessions: SessionSummary[], from: string): Promise<ThresholdReps[]> {
  const picked = sessions.filter((s) => THRESHOLD_CATS.includes(s.category) && s.scheduled_date >= from && s.execution && isDone(s.execution.status));
  if (!picked.length) return [];
  const [segs, laps] = await Promise.all([
    supabase.from("running_segments").select("id, session_id").in("session_id", picked.map((s) => s.id)).eq("segment_type", "work"),
    supabase
      .from("running_lap_results")
      .select("execution_id, segment_id, distance_m, duration_s, avg_hr")
      .in("execution_id", picked.map((s) => s.execution!.id)),
  ]);
  const work = new Set(((segs.data ?? []) as { id: string }[]).map((r) => r.id));
  const rows = (laps.data ?? []) as { execution_id: string; segment_id: string | null; distance_m: number | null; duration_s: number | null; avg_hr: number | null }[];
  const out: ThresholdReps[] = [];
  for (const s of picked) {
    const e = s.execution!;
    let mine = rows.filter((l) => l.execution_id === e.id && l.distance_m && l.duration_s);
    const tagged = mine.filter((l) => l.segment_id && work.has(l.segment_id));
    if (tagged.length) mine = tagged;
    else if (e.avg_pace_s) {
      // Laps not linked to the plan: keep the ones clearly faster than the session average (the reps).
      mine = mine.filter((l) => l.duration_s! / (l.distance_m! / 1000) < e.avg_pace_s! * 0.95 && l.distance_m! <= 5000);
    } else mine = [];
    const distanceM = mine.reduce((a, l) => a + l.distance_m!, 0);
    const seconds = mine.reduce((a, l) => a + l.duration_s!, 0);
    if (distanceM < 1000) continue;
    const withHr = mine.filter((l) => l.avg_hr);
    const avgHr = withHr.length ? Math.round(withHr.reduce((a, l) => a + l.avg_hr! * l.duration_s!, 0) / withHr.reduce((a, l) => a + l.duration_s!, 0)) : null;
    out.push({ sessionId: s.id, date: e.performed_on, title: s.title, distanceM, seconds, avgHr, rpe: e.rpe });
  }
  return out;
}

export interface HrProfile {
  lthr: { bpm: number; source: string } | null;
  max: { bpm: number; source: string } | null;
  resting: number | null;
}

/** Average HR of an all-out effort relative to threshold HR, by duration. */
function lthrFactor(minutes: number): number {
  if (minutes < 25) return 1.04; // 5 km
  if (minutes < 50) return 1.01; // 10 km, 30-min test
  if (minutes < 110) return 0.97; // half marathon
  return 0.93; // marathon
}

export function hrProfile(profile: Pick<AthleteProfile, "lthr" | "max_hr" | "resting_hr"> | null, efforts: Effort[], reps: ThresholdReps[], today: string): HrProfile {
  let lthr: HrProfile["lthr"] = profile?.lthr ? { bpm: profile.lthr, source: "wpisane w profilu" } : null;
  if (!lthr) {
    const recent = efforts
      .filter((e) => (e.source === "race" || e.source === "test") && e.avgHr && e.date >= addDaysISO(today, -180))
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (recent) {
      lthr = { bpm: Math.round(recent.avgHr! / lthrFactor(recent.seconds / 60)), source: `szacunkowo z: ${recent.title} (${recent.date}), śr. HR ${recent.avgHr}` };
    } else {
      const controlled = reps.filter((r) => r.avgHr && (r.rpe ?? 7) <= 7 && r.date >= addDaysISO(today, -60));
      if (controlled.length >= 2) {
        // Controlled sub-threshold reps sit at about 95–97% of threshold HR.
        const hr = controlled.reduce((a, r) => a + r.avgHr!, 0) / controlled.length;
        lthr = { bpm: Math.round(hr / 0.96), source: `szacunkowo z ${controlled.length} sesji progowych (śr. HR odcinków ${Math.round(hr)})` };
      }
    }
  }
  const max: HrProfile["max"] = profile?.max_hr ? { bpm: profile.max_hr, source: "wpisane w profilu" } : null;
  return { lthr, max, resting: profile?.resting_hr ?? null };
}

/** HR range for each zone of the method: from threshold HR when known (most individual), otherwise from max HR. */
export function hrRanges(hr: HrProfile): { regeneracja: string; spokojnie: string; maraton: string; prog: string; dycha: string; vo2: string; basis: string } | null {
  const fmt = (lo: number | null, hi: number | null, base: number) =>
    lo == null ? `< ${Math.round(base * hi!)} bpm` : hi == null ? `> ${Math.round(base * lo)} bpm` : `${Math.round(base * lo)}–${Math.round(base * hi)} bpm`;
  if (hr.lthr) {
    const b = hr.lthr.bpm;
    return {
      regeneracja: fmt(null, 0.78, b),
      spokojnie: fmt(0.78, 0.87, b),
      maraton: fmt(0.87, 0.93, b),
      prog: fmt(0.91, 0.98, b),
      dycha: fmt(0.98, 1.02, b),
      vo2: fmt(1.02, null, b),
      basis: `od tętna progowego ${b} bpm (${hr.lthr.source})`,
    };
  }
  if (hr.max) {
    const b = hr.max.bpm;
    return {
      regeneracja: fmt(null, 0.7, b),
      spokojnie: fmt(0.7, 0.78, b),
      maraton: fmt(0.78, 0.84, b),
      prog: fmt(0.82, 0.88, b),
      dycha: fmt(0.88, 0.92, b),
      vo2: fmt(0.92, null, b),
      basis: `od tętna maksymalnego ${b} bpm (${hr.max.source}); dokładniej będzie po wpisaniu albo teście tętna progowego`,
    };
  }
  return null;
}

export interface ObservedThreshold {
  pace: number;
  avgHr: number | null;
  sessions: number;
}

/** Pace actually held on controlled threshold reps (RPE up to 7) in the last six weeks. */
export function observedThreshold(reps: ThresholdReps[], today: string): ObservedThreshold | null {
  const ok = reps.filter((r) => r.date >= addDaysISO(today, -42) && (r.rpe ?? 7) <= 7);
  if (!ok.length) return null;
  const d = ok.reduce((a, r) => a + r.distanceM, 0);
  const t = ok.reduce((a, r) => a + r.seconds, 0);
  const hrs = ok.filter((r) => r.avgHr);
  return { pace: t / (d / 1000), avgHr: hrs.length ? Math.round(hrs.reduce((a, r) => a + r.avgHr!, 0) / hrs.length) : null, sessions: ok.length };
}

export interface Efficiency {
  /** Metres per heart beat on easy runs, last 6 weeks vs the 6 before; positive = more economical. */
  changePct: number | null;
  recentPaceAt: string | null;
  /** Easy runs whose average HR was above the easy ceiling. */
  tooHard: number;
  easyRuns: number;
}

/** Aerobic efficiency from easy runs with HR, and how many easy runs were run too hard. */
export function aerobicEfficiency(sessions: SessionSummary[], today: string, easyCeiling: number | null): Efficiency {
  const easy = sessions.filter(
    (s) => ["easy", "recovery", "long"].includes(s.category) && s.execution && isDone(s.execution.status) && s.execution.avg_hr && s.execution.distance_m && s.execution.duration_s,
  );
  const perBeat = (list: SessionSummary[]) => {
    if (list.length < 3) return null;
    const m = list.reduce((a, s) => a + s.execution!.distance_m!, 0);
    const beats = list.reduce((a, s) => a + s.execution!.avg_hr! * (s.execution!.duration_s! / 60), 0);
    return m / beats;
  };
  const recent = easy.filter((s) => s.execution!.performed_on > addDaysISO(today, -42));
  const earlier = easy.filter((s) => s.execution!.performed_on <= addDaysISO(today, -42) && s.execution!.performed_on > addDaysISO(today, -84));
  const a = perBeat(recent);
  const b = perBeat(earlier);
  const hr = recent.length ? Math.round(recent.reduce((x, s) => x + s.execution!.avg_hr!, 0) / recent.length) : null;
  const pace = recent.length ? recent.reduce((x, s) => x + s.execution!.duration_s!, 0) / (recent.reduce((x, s) => x + s.execution!.distance_m!, 0) / 1000) : null;
  return {
    changePct: a && b ? Math.round(((a - b) / b) * 1000) / 10 : null,
    recentPaceAt: pace && hr ? `${formatPace(pace)}/km przy śr. HR ${hr}` : null,
    tooHard: easyCeiling ? recent.filter((s) => s.category !== "long" && s.execution!.avg_hr! > easyCeiling).length : 0,
    easyRuns: recent.length,
  };
}
