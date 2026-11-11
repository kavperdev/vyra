import type { createClient } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Whether the athlete may add and edit their own sessions (training diary).
 * Returns null when the column doesn't exist yet (migration not run), so pages simply hide the feature.
 */
export async function getSelfPlanning(supabase: ServerSupabase, athleteId: string): Promise<boolean | null> {
  const { data, error } = await supabase.from("profiles").select("self_planning").eq("id", athleteId).maybeSingle();
  if (error || !data) return null;
  return !!(data as { self_planning: boolean | null }).self_planning;
}
