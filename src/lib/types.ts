import { localized } from "@/lib/i18n/runtime";
// Domain types mirroring the database schema (supabase/migrations).
// Run `npm run db:types` to generate the full Supabase types if you need them.

export type UserRole = "coach" | "athlete";
export type SessionKind = "running" | "strength" | "mobility" | "other";
export type SessionStatus = "planned" | "in_progress" | "completed" | "partial" | "skipped";
export type ExecutionStatus = "in_progress" | "completed" | "partial" | "skipped";
export type DisplayStatus = SessionStatus | "needs_update";
export type RecordKind = "running" | "strength" | "other";
export type GoalStatus = "active" | "achieved" | "abandoned";
export type InviteStatus = "pending" | "accepted" | "revoked";
export type StaffRole = "founder" | "running_coach" | "strength_coach" | "physio";

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = localized<StaffRole>({
  founder: "Założyciel",
  running_coach: "Trener biegowy",
  strength_coach: "Trener przygotowania siłowego",
  physio: "Fizjoterapeuta",
}, { founder: "Founder", running_coach: "Running coach", strength_coach: "Strength & conditioning coach", physio: "Physiotherapist" });

/** Staff who plan training. A physiotherapist reads and writes notes but does not plan. */
export function canPlan(role: StaffRole | null | undefined): boolean {
  return role === "founder" || role === "running_coach" || role === "strength_coach";
}

export interface Profile {
  id: string;
  role: UserRole;
  /** Set for staff accounts (role = coach), null for athletes. */
  staff_role: StaffRole | null;
  full_name: string;
  email: string | null;
  timezone: string;
  created_at: string;
}

export interface AthleteProfile {
  athlete_id: string;
  sport_goal: string | null;
  primary_sport: string;
  birth_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  resting_hr: number | null;
  max_hr: number | null;
  lthr: number | null;
  easy_hr_max: number | null;
  athlete_notes: string | null;
}

export interface CoachAthlete {
  coach_id: string;
  athlete_id: string;
  status: "active" | "archived";
  created_at: string;
}

export interface Invitation {
  id: string;
  coach_id: string;
  email: string;
  full_name: string | null;
  message: string | null;
  token: string;
  /** Non-null for invitations to the VYRA team (staff). */
  staff_role: StaffRole | null;
  status: InviteStatus;
  expires_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface TrainingPlan {
  id: string;
  coach_id: string;
  athlete_id: string;
  name: string;
  description: string | null;
  goal: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface TrainingSession {
  id: string;
  coach_id: string;
  athlete_id: string;
  plan_id: string | null;
  template_id: string | null;
  kind: SessionKind;
  category: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string | null;
  goal: string | null;
  instructions: string | null;
  notes: string | null;
  planned_rpe: number | null;
  planned_duration_s: number | null;
  status: SessionStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface RunningWorkout {
  session_id: string;
  structure: "continuous" | "intervals" | "fartlek" | "progression" | "custom";
  planned_distance_m: number | null;
  planned_duration_s: number | null;
  target_pace_min_s: number | null;
  target_pace_max_s: number | null;
  target_hr_min: number | null;
  target_hr_max: number | null;
  intensity_zone: string | null;
}

export interface RunningSegment {
  id: string;
  session_id: string;
  position: number;
  segment_type: "warmup" | "work" | "recovery" | "steady" | "strides" | "cooldown";
  label: string | null;
  repeats: number;
  distance_m: number | null;
  duration_s: number | null;
  target_pace_min_s: number | null;
  target_pace_max_s: number | null;
  target_hr_min: number | null;
  target_hr_max: number | null;
  intensity: string | null;
  recovery_type: string | null;
  recovery_duration_s: number | null;
  recovery_distance_m: number | null;
  notes: string | null;
}

export interface StrengthSet {
  id: string;
  exercise_id: string;
  position: number;
  planned_reps: number | null;
  planned_load_kg: number | null;
  planned_duration_s: number | null;
  planned_rpe: number | null;
  planned_rir: number | null;
}

export interface StrengthExercise {
  id: string;
  session_id: string;
  position: number;
  name: string;
  description: string | null;
  muscle_group: string | null;
  rest_s: number | null;
  tempo: string | null;
  notes: string | null;
  sets: StrengthSet[];
}

export interface WorkoutExecution {
  id: string;
  session_id: string;
  athlete_id: string;
  status: ExecutionStatus;
  performed_on: string;
  started_at: string | null;
  completed_at: string | null;
  rpe: number | null;
  feeling: number | null;
  comment: string | null;
  plan_snapshot: PlanSnapshot;
  plan_version: number;
  created_at: string;
  updated_at: string;
}

export interface PlanSnapshot {
  session?: Partial<TrainingSession>;
  running?: Partial<RunningWorkout> | null;
  segments?: Partial<RunningSegment>[];
  exercises?: (Partial<StrengthExercise> & { sets?: Partial<StrengthSet>[] })[];
  captured_at?: string;
}

export interface RunningResult {
  execution_id: string;
  distance_m: number | null;
  duration_s: number | null;
  avg_pace_s: number | null;
  pace_is_manual: boolean;
  avg_hr: number | null;
  max_hr: number | null;
  elevation_gain_m: number | null;
  cadence_spm: number | null;
  conditions: string | null;
}

export interface LapResult {
  id: string;
  execution_id: string;
  segment_id: string | null;
  position: number;
  rep_index: number;
  distance_m: number | null;
  duration_s: number | null;
  avg_hr: number | null;
  notes: string | null;
}

export interface SetResult {
  id: string;
  exercise_result_id: string;
  set_id: string | null;
  position: number;
  reps: number | null;
  load_kg: number | null;
  duration_s: number | null;
  rpe: number | null;
  rir: number | null;
  completed: boolean;
}

export interface ExerciseResult {
  id: string;
  execution_id: string;
  exercise_id: string | null;
  exercise_name: string;
  position: number;
  status: "done" | "partial" | "skipped" | "pending";
  comment: string | null;
  sets: SetResult[];
}

export interface TrainingComment {
  id: string;
  session_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingTemplate {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  kind: SessionKind;
  category: string;
  payload: SessionPayload;
  created_at: string;
  updated_at: string;
}

export interface PersonalRecord {
  id: string;
  athlete_id: string;
  kind: RecordKind;
  label: string;
  distance_m: number | null;
  exercise_name: string | null;
  value: number;
  unit: "s" | "kg" | "reps" | "m";
  achieved_on: string;
  source: "manual" | "execution" | "race" | "test";
  session_id: string | null;
  comment: string | null;
  confirmed: boolean;
  created_at: string;
}

export interface AthleteGoal {
  id: string;
  athlete_id: string;
  name: string;
  description: string | null;
  start_value: number | null;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  lower_is_better: boolean;
  deadline: string | null;
  status: GoalStatus;
  created_at: string;
}

export interface CoachNote {
  id: string;
  coach_id: string;
  athlete_id: string;
  body: string;
  created_at: string;
  /** Author's name and role, filled in by listCoachNotes. */
  author_name?: string | null;
  author_role?: StaffRole | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  session_id: string | null;
  read_at: string | null;
  created_at: string;
}

/** Shape accepted by the save_session database function. */
export interface SessionPayload {
  id?: string;
  athlete_id?: string;
  plan_id?: string | null;
  template_id?: string | null;
  kind: SessionKind;
  category: string;
  title: string;
  scheduled_date?: string;
  scheduled_time?: string | null;
  goal?: string | null;
  instructions?: string | null;
  notes?: string | null;
  planned_rpe?: number | null;
  planned_duration_s?: number | null;
  running?: Omit<RunningWorkout, "session_id"> | null;
  segments?: (Omit<RunningSegment, "id" | "session_id" | "position"> & { id?: string })[];
  exercises?: (Omit<StrengthExercise, "id" | "session_id" | "position" | "sets"> & {
    id?: string;
    sets: (Omit<StrengthSet, "id" | "exercise_id" | "position"> & { id?: string })[];
  })[];
}

/** A session with everything needed to show plan and execution. */
export interface SessionDetail extends TrainingSession {
  running: RunningWorkout | null;
  segments: RunningSegment[];
  exercises: StrengthExercise[];
  execution: (WorkoutExecution & {
    running: RunningResult | null;
    laps: LapResult[];
    exercise_results: ExerciseResult[];
  }) | null;
  athlete: Pick<Profile, "id" | "full_name"> | null;
  plan: Pick<TrainingPlan, "id" | "name"> | null;
}

/** Light row used in calendars, lists and analytics. */
export interface SessionSummary {
  id: string;
  athlete_id: string;
  athlete_name?: string;
  kind: SessionKind;
  category: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: SessionStatus;
  plan_id: string | null;
  planned_distance_m: number | null;
  planned_duration_s: number | null;
  execution: {
    id: string;
    status: ExecutionStatus;
    performed_on: string;
    rpe: number | null;
    comment: string | null;
    distance_m: number | null;
    duration_s: number | null;
    avg_pace_s: number | null;
    avg_hr: number | null;
  } | null;
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };
