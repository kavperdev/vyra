import "server-only";
import { HEALTH_KEY, healthAsReadiness, validHealth, type HealthDay } from "@/lib/app/health";
import type { ServerSupabase } from "@/lib/supabase/server";

type ReadinessRow = { day: string; sleep: number; energy: number; pain: boolean; pain_area: string | null };

/** The runner's morning numbers from their synced app data (empty if not visible to this reader). */
export async function loadHealth(supabase: ServerSupabase, athleteId: string): Promise<HealthDay[]> {
  const { data, error } = await supabase.from("app_state").select("value").eq("user_id", athleteId).eq("key", HEALTH_KEY).maybeSingle();
  if (error || !data) return [];
  return validHealth((data as { value: unknown }).value);
}

/**
 * Check-ins plus bad mornings (resting HR, HRV or sleep off the runner's normal): a bad morning without
 * a check-in counts as poor sleep and energy, so VYRA Method eases the next key session.
 */
export function withHealth(readiness: ReadinessRow[], health: HealthDay[], from: string): ReadinessRow[] {
  const have = new Set(readiness.map((r) => r.day));
  const extra = healthAsReadiness(health, from).filter((r) => !have.has(r.day));
  const merged = readiness.map((r) => {
    const bad = healthAsReadiness(health, r.day).find((x) => x.day === r.day);
    return bad ? { ...r, sleep: Math.min(r.sleep, bad.sleep), energy: Math.min(r.energy, bad.energy) } : r;
  });
  return [...merged, ...extra].sort((a, b) => (a.day < b.day ? -1 : 1));
}
