"use server";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type Msg = { id: string; sender_id: string; body: string; created_at: string; read_at: string | null };

async function pair(otherId: string) {
  const user = await getCurrentUser();
  if (!user || !/^[0-9a-f-]{36}$/i.test(otherId)) return null;
  const coach = user.profile.role === "coach";
  return { me: user.id, coach_id: coach ? user.id : otherId, athlete_id: coach ? otherId : user.id };
}

/** The last 150 messages of the thread with this person; marks theirs as read. */
export async function getThread(otherId: string): Promise<Msg[] | null> {
  const p = await pair(otherId);
  if (!p) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_messages")
    .select("id, sender_id, body, created_at, read_at")
    .eq("coach_id", p.coach_id)
    .eq("athlete_id", p.athlete_id)
    .order("created_at", { ascending: false })
    .limit(150);
  if (error) return null;
  const rows = ((data ?? []) as Msg[]).reverse();
  if (rows.some((m) => m.sender_id === otherId && !m.read_at)) await supabase.rpc("messages_read", { p_other: otherId });
  return rows;
}

export async function sendMessage(otherId: string, body: string): Promise<{ ok: true; msg: Msg } | { ok: false; error: string }> {
  const text = body.trim().slice(0, 2000);
  if (!text) return { ok: false, error: "Napisz wiadomość." };
  const p = await pair(otherId);
  if (!p) return { ok: false, error: "Zaloguj się ponownie." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_messages")
    .insert({ coach_id: p.coach_id, athlete_id: p.athlete_id, sender_id: p.me, body: text })
    .select("id, sender_id, body, created_at, read_at")
    .single();
  if (error) return { ok: false, error: error.code === "42501" ? "Rozmowa jest dostępna dla zawodników z trenerem." : "Nie udało się wysłać. Spróbuj ponownie." };
  return { ok: true, msg: data as Msg };
}
