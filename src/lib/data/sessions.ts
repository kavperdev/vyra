import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";
import type {
  ExecutionStatus, ExerciseResult, LapResult, RunningResult, RunningSegment, RunningWorkout, SessionDetail, SessionKind,
  SessionStatus, SessionSummary, StrengthExercise, StrengthSet, TrainingComment, WorkoutExecution,
} from "@/lib/types";

/** PostgREST returns one-to-one embeds as an object or a one-element array depending on version. */
export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const SUMMARY_SELECT = `
  id, athlete_id, kind, category, title, scheduled_date, scheduled_time, status, plan_id, planned_duration_s,
  athlete:profiles!training_sessions_athlete_id_fkey ( full_name ),
  running:running_workouts ( planned_distance_m, planned_duration_s ),
  execution:workout_executions ( id, status, performed_on, rpe, comment,
    running:running_execution_results ( distance_m, duration_s, avg_pace_s, avg_hr ) )
`;

interface SummaryRow {
  id: string;
  athlete_id: string;
  kind: SessionKind;
  category: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: SessionStatus;
  plan_id: string | null;
  planned_duration_s: number | null;
  athlete: { full_name: string } | { full_name: string }[] | null;
  running: { planned_distance_m: number | null; planned_duration_s: number | null } | { planned_distance_m: number | null; planned_duration_s: number | null }[] | null;
  execution:
    | ExecRow
    | ExecRow[]
    | null;
}

interface ExecRow {
  id: string;
  status: ExecutionStatus;
  performed_on: string;
  rpe: number | null;
  comment: string | null;
  running: RunRow | RunRow[] | null;
}
interface RunRow {
  distance_m: number | null;
  duration_s: number | null;
  avg_pace_s: number | null;
  avg_hr: number | null;
}

function toSummary(r: SummaryRow): SessionSummary {
  const running = one(r.running);
  const exec = one(r.execution);
  const execRun = exec ? one(exec.running) : null;
  return {
    id: r.id,
    athlete_id: r.athlete_id,
    athlete_name: one(r.athlete)?.full_name,
    kind: r.kind,
    category: r.category,
    title: r.title,
    scheduled_date: r.scheduled_date,
    scheduled_time: r.scheduled_time,
    status: r.status,
    plan_id: r.plan_id,
    planned_distance_m: running?.planned_distance_m ?? null,
    planned_duration_s: running?.planned_duration_s ?? r.planned_duration_s ?? null,
    execution: exec
      ? {
          id: exec.id,
          status: exec.status,
          performed_on: exec.performed_on,
          rpe: exec.rpe,
          comment: exec.comment,
          distance_m: execRun?.distance_m ?? null,
          duration_s: execRun?.duration_s ?? null,
          avg_pace_s: execRun?.avg_pace_s ?? null,
          avg_hr: execRun?.avg_hr ?? null,
        }
      : null,
  };
}

export interface SessionQuery {
  athleteIds?: string[];
  from?: string;
  to?: string;
  kinds?: SessionKind[];
  categories?: string[];
  statuses?: SessionStatus[];
  search?: string;
  order?: "asc" | "desc";
  limit?: number;
}

/** Sessions visible to the current user (RLS), as light summaries. */
export async function listSessions(supabase: ServerSupabase, q: SessionQuery = {}): Promise<SessionSummary[]> {
  let query = supabase.from("training_sessions").select(SUMMARY_SELECT);
  if (q.athleteIds?.length) query = query.in("athlete_id", q.athleteIds);
  if (q.from) query = query.gte("scheduled_date", q.from);
  if (q.to) query = query.lte("scheduled_date", q.to);
  if (q.kinds?.length) query = query.in("kind", q.kinds);
  if (q.categories?.length) query = query.in("category", q.categories);
  if (q.statuses?.length) query = query.in("status", q.statuses);
  if (q.search) query = query.ilike("title", `%${q.search.replace(/[%_]/g, "")}%`);
  query = query
    .order("scheduled_date", { ascending: q.order !== "desc" })
    .order("scheduled_time", { ascending: q.order !== "desc", nullsFirst: true })
    .limit(q.limit ?? 2000);
  const { data, error } = await query;
  if (error) throw new Error(`Nie udało się pobrać treningów: ${error.message}`);
  return ((data ?? []) as unknown as SummaryRow[]).map(toSummary);
}

const DETAIL_SELECT = `
  *,
  athlete:profiles!training_sessions_athlete_id_fkey ( id, full_name ),
  plan:training_plans ( id, name ),
  running:running_workouts ( * ),
  segments:running_segments ( * ),
  exercises:strength_exercises ( *, sets:strength_sets ( * ) ),
  execution:workout_executions ( *,
    running:running_execution_results ( * ),
    laps:running_lap_results ( * ),
    exercise_results:exercise_execution_results ( *, sets:set_execution_results ( * ) ) )
`;

interface DetailRow extends Omit<SessionDetail, "running" | "segments" | "exercises" | "execution" | "athlete" | "plan"> {
  athlete: SessionDetail["athlete"] | SessionDetail["athlete"][];
  plan: SessionDetail["plan"] | SessionDetail["plan"][];
  running: RunningWorkout | RunningWorkout[] | null;
  segments: RunningSegment[] | null;
  exercises: (Omit<StrengthExercise, "sets"> & { sets: StrengthSet[] | null })[] | null;
  execution:
    | (WorkoutExecution & { running: RunningResult | RunningResult[] | null; laps: LapResult[] | null; exercise_results: (Omit<ExerciseResult, "sets"> & { sets: ExerciseResult["sets"] | null })[] | null })
    | (WorkoutExecution & { running: RunningResult | RunningResult[] | null; laps: LapResult[] | null; exercise_results: (Omit<ExerciseResult, "sets"> & { sets: ExerciseResult["sets"] | null })[] | null })[]
    | null;
}

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

export async function getSessionDetail(supabase: ServerSupabase, id: string): Promise<SessionDetail | null> {
  const { data, error } = await supabase.from("training_sessions").select(DETAIL_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`Nie udało się pobrać treningu: ${error.message}`);
  if (!data) return null;
  const r = data as unknown as DetailRow;
  const exec = one(r.execution);
  return {
    ...r,
    athlete: one(r.athlete),
    plan: one(r.plan),
    running: one(r.running),
    segments: [...(r.segments ?? [])].sort(byPosition),
    exercises: [...(r.exercises ?? [])].sort(byPosition).map((e) => ({ ...e, sets: [...(e.sets ?? [])].sort(byPosition) })),
    execution: exec
      ? {
          ...exec,
          running: one(exec.running),
          laps: [...(exec.laps ?? [])].sort(byPosition),
          exercise_results: [...(exec.exercise_results ?? [])]
            .sort(byPosition)
            .map((x) => ({ ...x, sets: [...(x.sets ?? [])].sort(byPosition) })),
        }
      : null,
  };
}

export interface CommentWithAuthor extends TrainingComment {
  author_name: string;
  author_role: "coach" | "athlete";
}

export async function listComments(supabase: ServerSupabase, sessionId: string): Promise<CommentWithAuthor[]> {
  const { data, error } = await supabase
    .from("training_comments")
    .select("*, author:profiles!training_comments_author_id_fkey ( full_name, role )")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Nie udało się pobrać komentarzy: ${error.message}`);
  type Row = TrainingComment & { author: { full_name: string; role: "coach" | "athlete" } | { full_name: string; role: "coach" | "athlete" }[] | null };
  return ((data ?? []) as unknown as Row[]).map((c) => {
    const a = one(c.author);
    return { ...c, author_name: a?.full_name ?? "Użytkownik", author_role: a?.role ?? "athlete" };
  });
}

export interface RecentComment extends CommentWithAuthor {
  session_title: string;
  session_date: string;
  athlete_id: string;
}

/** Latest comments across sessions visible to the user (optionally for one athlete). */
export async function listRecentComments(supabase: ServerSupabase, opts: { athleteId?: string; onlyRole?: "coach" | "athlete"; limit?: number } = {}): Promise<RecentComment[]> {
  let q = supabase
    .from("training_comments")
    .select("*, author:profiles!training_comments_author_id_fkey ( full_name, role ), session:training_sessions!inner ( title, scheduled_date, athlete_id )")
    .order("created_at", { ascending: false })
    .limit((opts.limit ?? 10) * (opts.onlyRole ? 3 : 1));
  if (opts.athleteId) q = q.eq("session.athlete_id", opts.athleteId);
  const { data, error } = await q;
  if (error) throw new Error(`Nie udało się pobrać komentarzy: ${error.message}`);
  type Row = TrainingComment & {
    author: { full_name: string; role: "coach" | "athlete" } | { full_name: string; role: "coach" | "athlete" }[] | null;
    session: { title: string; scheduled_date: string; athlete_id: string } | { title: string; scheduled_date: string; athlete_id: string }[] | null;
  };
  return ((data ?? []) as unknown as Row[])
    .map((c) => {
      const a = one(c.author);
      const s = one(c.session);
      return {
        ...c,
        author_name: a?.full_name ?? "Użytkownik",
        author_role: a?.role ?? "athlete",
        session_title: s?.title ?? "",
        session_date: s?.scheduled_date ?? "",
        athlete_id: s?.athlete_id ?? "",
      };
    })
    .filter((c) => !opts.onlyRole || c.author_role === opts.onlyRole)
    .slice(0, opts.limit ?? 10);
}
