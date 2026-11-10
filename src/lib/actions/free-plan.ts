"use server";

import { createClient } from "@/lib/supabase/server";
import { isPlanToken, planCookie, rememberPlan } from "@/lib/free-plan-store";

export type SavedPlan = { token: string; name: string; done: Record<string, boolean> };

/** Opens the saved plan from the personal link (token) or from this device's cookie. */
export async function loadFreePlan(token?: string | null): Promise<SavedPlan | null> {
  const candidates = [isPlanToken(token) ? token : null, await planCookie()].filter((x): x is string => !!x);
  if (!candidates.length) return null;
  const supabase = await createClient();
  for (const t of [...new Set(candidates)]) {
    const { data, error } = await supabase.rpc("free_plan_get", { p_token: t });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) continue;
    await rememberPlan(t);
    const done = row.done && typeof row.done === "object" ? (row.done as Record<string, boolean>) : {};
    return { token: t, name: String(row.full_name ?? ""), done };
  }
  return null;
}

/** Saves ticked sessions. Returns false when the token is unknown or the database is not ready. */
export async function saveFreePlan(token: string, done: Record<string, boolean>): Promise<boolean> {
  if (!isPlanToken(token) || !done || typeof done !== "object") return false;
  const clean = Object.fromEntries(Object.entries(done).filter(([k, v]) => v === true && /^\d{1,2}-\d$/.test(k)));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("free_plan_save", { p_token: token, p_done: clean });
  return !error && data === true;
}
