"use server";

import { createClient } from "@/lib/supabase/server";

export type Stats = { name?: string; weekStart: string; weekKm: number; weekRuns: number; month: string; monthKm: number; totalKm: number; streak: number };
export type BoardRow = { user_id: string; name: string; me: boolean; week_km: number; week_runs: number; month_km: number; total_km: number; streak: number };

/** Sends my weekly numbers to my friends' ranking. Returns my friend code, or null when signed out / before the migration. */
export async function publishStats(s: Stats): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("runner_publish", {
    p_name: (s.name ?? "").slice(0, 60),
    p_week_start: s.weekStart,
    p_week_km: Math.round(s.weekKm * 100) / 100,
    p_week_runs: Math.round(s.weekRuns),
    p_month: s.month,
    p_month_km: Math.round(s.monthKm * 100) / 100,
    p_total_km: Math.round(s.totalKm * 100) / 100,
    p_streak: Math.round(s.streak),
  });
  return error ? null : (data as string);
}

export async function friendsBoard(weekStart: string, month: string): Promise<BoardRow[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("friends_board", { p_week_start: weekStart, p_month: month });
  if (error) return null;
  return ((data ?? []) as BoardRow[]).map((r) => ({ ...r, week_km: Number(r.week_km), month_km: Number(r.month_km), total_km: Number(r.total_km) }));
}

export async function addFriend(code: string): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(c)) return { ok: false, error: "Kod ma 6 znaków." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("friend_add", { p_code: c });
  if (error) {
    const m = error.message;
    return { ok: false, error: m.includes("FRIEND_NOT_FOUND") ? "Nie ma biegacza z takim kodem." : m.includes("FRIEND_SELF") ? "To Twój własny kod." : m.includes("FRIEND_LIMIT") ? "Masz już 200 znajomych." : "Zaloguj się, żeby dodać znajomego." };
  }
  return { ok: true, name: String(data ?? "Biegacz") };
}

export async function removeFriend(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("friend_remove", { p_friend: id });
  return !error;
}
