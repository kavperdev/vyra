import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";
import type {
  AppNotification, AthleteGoal, AthleteProfile, CoachNote, Invitation, PersonalRecord, Profile, TrainingPlan, TrainingTemplate,
} from "@/lib/types";
import { one } from "./sessions";

export interface AthleteRow {
  id: string;
  full_name: string;
  email: string | null;
  link_status: "active" | "archived";
  linked_at: string;
  profile: AthleteProfile | null;
}

/** Athletes linked to the signed-in coach. */
export async function listAthletes(supabase: ServerSupabase, coachId: string): Promise<AthleteRow[]> {
  const { data, error } = await supabase
    .from("coach_athletes")
    .select(
      "status, created_at, athlete:profiles!coach_athletes_athlete_id_fkey ( id, full_name, email, details:athlete_profiles ( * ) )",
    )
    .eq("coach_id", coachId);
  if (error) throw new Error(`Nie udało się pobrać zawodników: ${error.message}`);
  type Row = {
    status: "active" | "archived";
    created_at: string;
    athlete:
      | { id: string; full_name: string; email: string | null; details: AthleteProfile | AthleteProfile[] | null }
      | { id: string; full_name: string; email: string | null; details: AthleteProfile | AthleteProfile[] | null }[]
      | null;
  };
  return ((data ?? []) as unknown as Row[])
    .map((r) => {
      const a = one(r.athlete);
      if (!a) return null;
      return { id: a.id, full_name: a.full_name, email: a.email, link_status: r.status, linked_at: r.created_at, profile: one(a.details) };
    })
    .filter((x): x is AthleteRow => x !== null)
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "pl"));
}

export async function getAthlete(supabase: ServerSupabase, coachId: string, athleteId: string): Promise<AthleteRow | null> {
  const all = await listAthletes(supabase, coachId);
  return all.find((a) => a.id === athleteId) ?? null;
}

export async function getAthleteProfile(supabase: ServerSupabase, athleteId: string): Promise<AthleteProfile | null> {
  const { data } = await supabase.from("athlete_profiles").select("*").eq("athlete_id", athleteId).maybeSingle();
  return (data as AthleteProfile | null) ?? null;
}

/** The athlete's coaches (normally one). */
export async function listCoaches(supabase: ServerSupabase, athleteId: string): Promise<Pick<Profile, "id" | "full_name" | "email">[]> {
  const { data } = await supabase
    .from("coach_athletes")
    .select("coach:profiles!coach_athletes_coach_id_fkey ( id, full_name, email )")
    .eq("athlete_id", athleteId)
    .eq("status", "active");
  type Row = { coach: Pick<Profile, "id" | "full_name" | "email"> | Pick<Profile, "id" | "full_name" | "email">[] | null };
  return ((data ?? []) as unknown as Row[]).map((r) => one(r.coach)).filter((c): c is Pick<Profile, "id" | "full_name" | "email"> => !!c);
}

export async function listInvitations(supabase: ServerSupabase): Promise<Invitation[]> {
  const { data, error } = await supabase.from("invitations").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Nie udało się pobrać zaproszeń: ${error.message}`);
  return (data ?? []) as Invitation[];
}

export async function listPlans(supabase: ServerSupabase, athleteId: string): Promise<TrainingPlan[]> {
  const { data, error } = await supabase
    .from("training_plans")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("start_date", { ascending: false });
  if (error) throw new Error(`Nie udało się pobrać planów: ${error.message}`);
  return (data ?? []) as TrainingPlan[];
}

export async function listTemplates(supabase: ServerSupabase): Promise<TrainingTemplate[]> {
  const { data, error } = await supabase.from("training_templates").select("*").order("name");
  if (error) throw new Error(`Nie udało się pobrać szablonów: ${error.message}`);
  return (data ?? []) as TrainingTemplate[];
}

export async function getTemplate(supabase: ServerSupabase, id: string): Promise<TrainingTemplate | null> {
  const { data } = await supabase.from("training_templates").select("*").eq("id", id).maybeSingle();
  return (data as TrainingTemplate | null) ?? null;
}

export async function listRecords(supabase: ServerSupabase, athleteId: string): Promise<PersonalRecord[]> {
  const { data, error } = await supabase
    .from("personal_records")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("achieved_on", { ascending: false });
  if (error) throw new Error(`Nie udało się pobrać rekordów: ${error.message}`);
  return ((data ?? []) as PersonalRecord[]).map((r) => ({ ...r, value: Number(r.value) }));
}

export async function listGoals(supabase: ServerSupabase, athleteId: string): Promise<AthleteGoal[]> {
  const { data, error } = await supabase
    .from("athlete_goals")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("status")
    .order("deadline", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Nie udało się pobrać celów: ${error.message}`);
  const num = (v: number | null) => (v == null ? null : Number(v));
  return ((data ?? []) as AthleteGoal[]).map((g) => ({
    ...g,
    start_value: num(g.start_value),
    target_value: num(g.target_value),
    current_value: num(g.current_value),
  }));
}

export async function listCoachNotes(supabase: ServerSupabase, athleteId: string): Promise<CoachNote[]> {
  const { data, error } = await supabase
    .from("coach_notes")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Nie udało się pobrać notatek: ${error.message}`);
  return (data ?? []) as CoachNote[];
}

export async function listNotifications(supabase: ServerSupabase, limit = 100): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Nie udało się pobrać powiadomień: ${error.message}`);
  return (data ?? []) as AppNotification[];
}

export async function unreadCount(supabase: ServerSupabase): Promise<number> {
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}

export interface StrengthHistoryEntry {
  performed_on: string;
  session_id: string;
  session_title: string;
  exercise_name: string;
  status: string;
  sets: { reps: number | null; load_kg: number | null; completed: boolean; rpe: number | null; duration_s: number | null }[];
}

/** Every recorded strength exercise of an athlete, newest first. */
export async function strengthHistory(supabase: ServerSupabase, athleteId: string, from?: string): Promise<StrengthHistoryEntry[]> {
  let q = supabase
    .from("workout_executions")
    .select(
      "performed_on, session_id, status, session:training_sessions ( title ), results:exercise_execution_results ( exercise_name, status, position, sets:set_execution_results ( reps, load_kg, completed, rpe, duration_s, position ) )",
    )
    .eq("athlete_id", athleteId)
    .neq("status", "skipped")
    .order("performed_on", { ascending: false })
    .limit(500);
  if (from) q = q.gte("performed_on", from);
  const { data, error } = await q;
  if (error) throw new Error(`Nie udało się pobrać historii siłowej: ${error.message}`);
  type SetRow = StrengthHistoryEntry["sets"][number] & { position: number };
  type Row = {
    performed_on: string;
    session_id: string;
    session: { title: string } | { title: string }[] | null;
    results: { exercise_name: string; status: string; position: number; sets: SetRow[] | null }[] | null;
  };
  const out: StrengthHistoryEntry[] = [];
  for (const r of (data ?? []) as unknown as Row[]) {
    for (const x of [...(r.results ?? [])].sort((a, b) => a.position - b.position)) {
      if (!x.exercise_name) continue;
      out.push({
        performed_on: r.performed_on,
        session_id: r.session_id,
        session_title: one(r.session)?.title ?? "",
        exercise_name: x.exercise_name,
        status: x.status,
        sets: [...(x.sets ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((s) => ({ ...s, load_kg: s.load_kg == null ? null : Number(s.load_kg), rpe: s.rpe == null ? null : Number(s.rpe) })),
      });
    }
  }
  return out;
}
