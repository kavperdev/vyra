import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { PlannedDay } from "@/components/app/month-calendar";

const SPORT: Record<string, PlannedDay["sport"]> = { running: "run", strength: "gym", mobility: "mobility" };

/** Plan sessions (coach or VYRA Method) around today, for the month calendar. */
export async function plannedDays(): Promise<PlannedDay[]> {
  if (!isSupabaseConfigured()) return [];
  const user = await getCurrentUser().catch(() => null);
  if (!user) return [];
  const supabase = await createClient();
  const d = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("training_sessions")
    .select("id, title, scheduled_date, kind, running_workouts(planned_distance_m)")
    .eq("athlete_id", user.id)
    .gte("scheduled_date", d(-62))
    .lte("scheduled_date", d(62))
    .limit(200);
  type Row = { id: string; title: string; scheduled_date: string; kind: string; running_workouts: { planned_distance_m: number | null } | { planned_distance_m: number | null }[] | null };
  return ((data ?? []) as Row[]).map((r) => {
    const m = (Array.isArray(r.running_workouts) ? r.running_workouts[0] : r.running_workouts)?.planned_distance_m;
    return { date: r.scheduled_date, title: r.title, sport: SPORT[r.kind] ?? "other", km: m ? Math.round(m / 100) / 10 : null, href: `/athlete/sessions/${r.id}` };
  });
}
