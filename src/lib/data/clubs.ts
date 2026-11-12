import type { createClient } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export interface SportClub {
  id: string;
  name: string;
  city: string | null;
  logo_url: string | null;
  created_at: string;
  /** Missing before the multi-sport migration: treated as athletics. */
  sport?: string | null;
  /** Martial arts: minimum months between grade exams (sport-modules migration). */
  grade_min_months?: number | null;
}

export interface ClubMember {
  id: string;
  full_name: string;
  role: "coach" | "athlete";
  staff_role: string | null;
  managed: boolean;
  club_id: string | null;
}

/**
 * The club the user belongs to. Null when they have none, or when the clubs migration
 * hasn't been run yet (so every page keeps working without it).
 */
export async function getMyClub(supabase: ServerSupabase, userId: string): Promise<SportClub | null> {
  const { data: me, error } = await supabase.from("profiles").select("club_id").eq("id", userId).maybeSingle();
  const clubId = !error && me ? (me as { club_id: string | null }).club_id : null;
  if (!clubId) return null;
  const { data } = await supabase.from("sport_clubs").select("*").eq("id", clubId).maybeSingle();
  return (data as SportClub | null) ?? null;
}

/** All clubs (founders), or null when the migration hasn't been run. */
export async function listClubs(supabase: ServerSupabase): Promise<SportClub[] | null> {
  const { data, error } = await supabase.from("sport_clubs").select("*").order("name");
  if (error) return null;
  return (data ?? []) as SportClub[];
}

/** People in the given clubs that the caller can see (RLS). */
export async function listClubMembers(supabase: ServerSupabase, clubIds: string[]): Promise<ClubMember[]> {
  if (!clubIds.length) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, staff_role, managed, club_id")
    .in("club_id", clubIds)
    .order("full_name");
  if (error) return [];
  return (data ?? []) as ClubMember[];
}

/** Whether the athlete has no account and is run by the coach (null if unknown / migration missing). */
export async function isManagedAthlete(supabase: ServerSupabase, athleteId: string): Promise<boolean> {
  const { data, error } = await supabase.from("profiles").select("managed").eq("id", athleteId).maybeSingle();
  if (error || !data) return false;
  return !!(data as { managed: boolean | null }).managed;
}

export interface AttendanceRow {
  session_id: string;
  athlete_id: string;
  athlete_name: string;
  managed: boolean;
  title: string;
  status: string;
  present: boolean | null;
}

/** Sessions on one day for the given athletes, with attendance marks. */
export async function attendanceForDay(supabase: ServerSupabase, athleteIds: string[], date: string): Promise<AttendanceRow[]> {
  if (!athleteIds.length) return [];
  const { data, error } = await supabase
    .from("training_sessions")
    .select("id, athlete_id, title, status, athlete:profiles!training_sessions_athlete_id_fkey ( full_name, managed ), attendance:session_attendance ( present )")
    .in("athlete_id", athleteIds)
    .eq("scheduled_date", date)
    .order("title");
  if (error) return [];
  type Row = {
    id: string;
    athlete_id: string;
    title: string;
    status: string;
    athlete: { full_name: string; managed: boolean } | { full_name: string; managed: boolean }[] | null;
    attendance: { present: boolean } | { present: boolean }[] | null;
  };
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
  return ((data ?? []) as Row[])
    .map((r) => {
      const a = one(r.athlete);
      const at = one(r.attendance);
      return {
        session_id: r.id,
        athlete_id: r.athlete_id,
        athlete_name: a?.full_name ?? "",
        managed: !!a?.managed,
        title: r.title,
        status: r.status,
        present: at ? at.present : null,
      };
    })
    .sort((x, y) => x.title.localeCompare(y.title, "pl") || x.athlete_name.localeCompare(y.athlete_name, "pl"));
}
