"use server";

import { createClient } from "@/lib/supabase/server";

const KEYS = new Set(["vyra-log", "vyra-log-del", "vyra-result", "vyra-start-plan", "vyra-start-on", "vyra-goal-plan", "vyra-me", "vyra-onboarded", "vyra-course-done", "vyra-swaps"]);
export type StateRow = { key: string; value: unknown; ts: number };

/** Everything the app saved on this account. Null when signed out or before the migration. */
export async function pullAppState(): Promise<StateRow[] | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("app_state").select("key, value, ts").eq("user_id", user.id);
  if (error) return null;
  const rows = (data ?? []).map((r) => ({ key: r.key as string, value: r.value, ts: Number(r.ts) || 0 }));
  // Free plan claimed on the website before the e-mail was confirmed: switch it on in the app.
  if (user.user_metadata?.plan === "start" && !rows.some((r) => r.key === "vyra-start-on")) rows.push({ key: "vyra-start-on", value: true, ts: 1 });
  return rows;
}

export async function pushAppState(rows: StateRow[]): Promise<boolean> {
  const clean = rows.filter((r) => KEYS.has(r.key) && r.value !== undefined).slice(0, 20);
  if (!clean.length) return true;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from("app_state").upsert(
    clean.map((r) => ({ user_id: user.id, key: r.key, value: r.value ?? null, ts: Math.round(r.ts) || Date.now(), updated_at: new Date().toISOString() })),
    { onConflict: "user_id,key" },
  );
  return !error;
}
