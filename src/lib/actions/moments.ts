"use server";

import { createClient } from "@/lib/supabase/server";

export type Moment = {
  id: string;
  user_id: string;
  name: string;
  me: boolean;
  streak: number;
  run_id: string;
  day: string;
  sport: string;
  km: number;
  sec: number;
  title: string | null;
  visibility: "friends" | "me";
  fire: number;
  five: number;
  my_fire: boolean;
  my_five: boolean;
  comments: number;
};
export type Comment = { id: string; user_id: string; name: string; me: boolean; body: string; created_at: string };
export type ShareInput = { runId: string; day: string; sport: string; km: number; sec: number; title: string | null; visibility: "friends" | "me" };

/** Shares trainings from my diary. Returns how many went through (0 when signed out or before the migration). */
export async function shareMoments(items: ShareInput[]): Promise<number> {
  const supabase = await createClient();
  let ok = 0;
  for (const m of items.slice(0, 30)) {
    const { error } = await supabase.rpc("moment_share", {
      p_run_id: m.runId,
      p_day: m.day,
      p_sport: m.sport,
      p_km: Math.round(m.km * 100) / 100,
      p_sec: Math.round(m.sec),
      p_title: m.title,
      p_visibility: m.visibility,
    });
    if (error) break;
    ok++;
  }
  return ok;
}

export async function unshareMoment(runId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("moment_unshare", { p_run_id: runId });
  return !error;
}

/** null = the feature is not switched on yet (migration missing) or signed out. */
export async function momentsFeed(): Promise<Moment[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("moments_feed", { p_limit: 40 });
  if (error) return null;
  return ((data ?? []) as Moment[]).map((m) => ({ ...m, km: Number(m.km), sec: Number(m.sec) }));
}

export async function react(moment: string, kind: "fire" | "five"): Promise<boolean | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("moment_react", { p_moment: moment, p_kind: kind });
  return error ? null : Boolean(data);
}

export async function comments(moment: string): Promise<Comment[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("moment_comments", { p_moment: moment });
  return (data ?? []) as Comment[];
}

export async function addComment(moment: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const text = body.trim().slice(0, 300);
  if (!text) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("moment_comment", { p_moment: moment, p_body: text });
  if (error) return { ok: false, error: error.message.includes("TOO_MANY") ? "Za dużo komentarzy naraz. Spróbuj za chwilę." : "Nie udało się dodać komentarza." };
  return { ok: true };
}

export async function deleteComment(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("moment_uncomment", { p_comment: id });
  return !error;
}
