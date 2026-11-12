import type { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import type { SessionPayload } from "@/lib/types";
import { assess, initialState, mondayOf, nextWeek, type Assessment, type MethodProfile, type MethodState, type PlannedSession, type WeekFeedback, type WeekPlan } from "./engine";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export interface Checkin {
  fatigue: 1 | 2 | 3 | 4 | 5;
  sleep: 1 | 2 | 3 | 4 | 5;
  pain: boolean;
  test_time_s: number | null;
  test_distance_m: number | null;
  note: string | null;
}

export interface MethodWeekRow {
  id: string;
  athlete_id: string;
  week_start: string;
  idx: number;
  plan: Pick<WeekPlan, "period" | "lighter" | "mode" | "km" | "notes"> & { titles?: string[] };
  session_ids: string[];
  checkin: Checkin | null;
}

export interface MethodProfileRow {
  athlete_id: string;
  answers: Record<string, unknown> & { profile?: MethodProfile };
  health_consent_at: string;
  assessment: Assessment | null;
  state: MethodState | null;
  active: boolean;
}

export interface MethodData {
  /** null = the migration hasn't been run yet. */
  access: boolean | null;
  profile: MethodProfileRow | null;
  weeks: MethodWeekRow[];
}

export async function loadMethod(supabase: ServerSupabase, userId: string): Promise<MethodData> {
  const { data: acc, error } = await supabase.rpc("has_method_access", { p_user: userId });
  if (error) return { access: null, profile: null, weeks: [] };
  const [{ data: p }, { data: w }] = await Promise.all([
    supabase.from("method_profiles").select("*").eq("athlete_id", userId).maybeSingle(),
    supabase.from("method_weeks").select("*").eq("athlete_id", userId).order("week_start", { ascending: false }).limit(12),
  ]);
  return { access: !!acc, profile: (p as MethodProfileRow | null) ?? null, weeks: (w ?? []) as MethodWeekRow[] };
}

const STRUCTURE: Record<PlannedSession["category"], "continuous" | "intervals" | "fartlek" | "custom"> = {
  easy: "continuous",
  recovery: "continuous",
  long: "continuous",
  threshold: "intervals",
  intervals: "intervals",
  fartlek: "fartlek",
  hills: "intervals",
  race_pace: "intervals",
  test: "custom",
  race: "continuous",
  custom_run: "intervals",
};

/** One generated session → the save_session payload (an ordinary self-planned running session). */
export function toPayload(s: PlannedSession, athleteId: string): SessionPayload {
  const work = s.segments.find((x) => x.segment_type === "work" || x.segment_type === "steady");
  const clamp = (v: number | null, a: number, b: number) => (v === null ? null : Math.max(a, Math.min(b, Math.round(v))));
  return {
    athlete_id: athleteId,
    plan_id: null,
    template_id: null,
    kind: "running",
    category: s.category,
    title: s.title.slice(0, 160),
    scheduled_date: s.date,
    scheduled_time: null,
    goal: s.goal.slice(0, 500),
    instructions: `${s.instructions}\n\nPlan VYRA Method.`.slice(0, 8000),
    notes: null,
    planned_rpe: s.planned_rpe,
    planned_duration_s: clamp(s.planned_duration_s, 0, 86400),
    running: {
      structure: STRUCTURE[s.category],
      planned_distance_m: clamp(s.planned_distance_m, 0, 1_000_000),
      planned_duration_s: clamp(s.planned_duration_s, 0, 172800),
      target_pace_min_s: work?.target_pace_min_s ?? null,
      target_pace_max_s: work?.target_pace_max_s ?? null,
      target_hr_min: work?.target_hr_min ?? null,
      target_hr_max: work?.target_hr_max ?? null,
      intensity_zone: null,
    },
    segments: s.segments.map((x) => ({
      segment_type: x.segment_type,
      label: x.label,
      repeats: Math.max(1, Math.min(100, x.repeats)),
      distance_m: clamp(x.distance_m, 1, 200000),
      duration_s: clamp(x.duration_s, 1, 86400),
      target_pace_min_s: x.target_pace_min_s,
      target_pace_max_s: x.target_pace_max_s,
      target_hr_min: x.target_hr_min,
      target_hr_max: x.target_hr_max,
      intensity: x.intensity,
      recovery_type: x.recovery_type,
      recovery_duration_s: clamp(x.recovery_duration_s, 0, 3600),
      recovery_distance_m: clamp(x.recovery_distance_m, 0, 10000),
      notes: x.notes,
    })),
  };
}

/** What happened in a generated week: planned vs done, from the calendar, plus the runner's check-in. */
async function feedbackFor(supabase: ServerSupabase, week: MethodWeekRow): Promise<WeekFeedback> {
  let completion = 1;
  let rpeDelta: number | null = null;
  if (week.session_ids.length) {
    const { data } = await supabase
      .from("training_sessions")
      .select("id, planned_duration_s, planned_rpe, workout_executions(status, rpe)")
      .in("id", week.session_ids);
    const rows = (data ?? []) as {
      planned_duration_s: number | null;
      planned_rpe: number | null;
      workout_executions: { status: string; rpe: number | null }[] | { status: string; rpe: number | null } | null;
    }[];
    let planned = 0;
    let done = 0;
    const deltas: number[] = [];
    for (const r of rows) {
      const ex = Array.isArray(r.workout_executions) ? r.workout_executions[0] : r.workout_executions;
      const mins = r.planned_duration_s ?? 1800;
      planned += mins;
      if (ex && ex.status === "completed") done += mins;
      else if (ex && ex.status === "partial") done += mins * 0.5;
      if (ex && ex.rpe != null && r.planned_rpe != null && ex.status !== "skipped") deltas.push(Number(ex.rpe) - Number(r.planned_rpe));
    }
    completion = planned ? done / planned : 1;
    rpeDelta = deltas.length ? deltas.reduce((s, x) => s + x, 0) / deltas.length : null;
  }
  const c = week.checkin;
  let test5k: number | null = null;
  if (c?.test_time_s && c.test_distance_m) {
    // Riegel: an equivalent 5 km time from the test distance.
    test5k = Math.round(c.test_time_s * Math.pow(5000 / c.test_distance_m, 1.06));
  }
  return {
    completion,
    rpe_delta: rpeDelta,
    pain: !!c?.pain,
    fatigue: c?.fatigue ?? 3,
    sleep: c?.sleep ?? 3,
    test_5k_seconds: test5k,
  };
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Makes sure the plan exists for this week (and for next week from Sunday on). Weeks are generated
 * lazily when the runner opens the app, each from what happened in the week before.
 * Returns how many weeks were generated.
 */
export async function ensureWeeks(supabase: ServerSupabase, userId: string, data: MethodData): Promise<number> {
  const p = data.profile;
  if (!data.access || !p || !p.active || !p.answers.profile) return 0;
  const profile = p.answers.profile;
  const today = todayISO();
  const thisMonday = mondayOf(today);
  const isSunday = addDays(thisMonday, 6) === today;
  const targets = isSunday ? [thisMonday, addDays(thisMonday, 7)] : [thisMonday];
  const known = new Set(data.weeks.map((w) => w.week_start));
  const assessment = p.assessment ?? assess(profile, today);
  if (!p.assessment) await supabase.from("method_profiles").update({ assessment }).eq("athlete_id", userId);
  if (!assessment.eligible) return 0;
  let state: MethodState = p.state ?? initialState(profile, assessment);
  let prev = data.weeks[0] ?? null;
  let made = 0;
  for (const ws of targets) {
    if (known.has(ws)) continue;
    // Don't skip back: after a long break the plan restarts from the last state, not from missed weeks.
    const feedback = prev && prev.week_start < ws ? await feedbackFor(supabase, prev) : null;
    const week = nextWeek(profile, assessment, state, ws, feedback);
    // Claim the week first: two tabs opening at once can't create sessions twice.
    const { data: row, error } = await supabase
      .from("method_weeks")
      .insert({ athlete_id: userId, week_start: ws, idx: week.index, plan: { period: week.period, lighter: week.lighter, mode: week.mode, km: week.km, notes: week.notes } })
      .select("*")
      .single();
    if (error || !row) break;
    const ids: string[] = [];
    for (const s of week.sessions) {
      if (s.date < today) continue; // started mid-week: nothing in the past
      const { data: id, error: e } = await supabase.rpc("save_session", { p: toPayload(s, userId) });
      if (e) console.error("[method] save_session", e.message);
      else if (id) ids.push(id as string);
    }
    await supabase.from("method_weeks").update({ session_ids: ids }).eq("id", (row as MethodWeekRow).id);
    state = week.state;
    await supabase.from("method_profiles").update({ state }).eq("athlete_id", userId);
    prev = { ...(row as MethodWeekRow), session_ids: ids };
    made++;
  }
  return made;
}

/** The assessment again after the runner changed their answers (weight, days, goal …): state keeps going. */
export function reassess(profile: MethodProfile): Assessment {
  return assess(profile, todayISO());
}
