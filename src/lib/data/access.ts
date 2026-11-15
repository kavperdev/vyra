import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

/** Athlete platform access: an active coach link (package, trial, invitation) or VYRA Method. Free app accounts have neither. */
export async function athleteHasAccess(supabase: Db, userId: string): Promise<boolean> {
  const [method, linked] = await Promise.all([
    supabase.rpc("has_method_access", { p_user: userId }).then((r) => (r.error ? false : !!r.data)),
    supabase
      .from("coach_athletes")
      .select("athlete_id", { count: "exact", head: true })
      .eq("athlete_id", userId)
      .eq("status", "active")
      .then((r) => (r.count ?? 0) > 0),
  ]);
  return method || linked;
}
