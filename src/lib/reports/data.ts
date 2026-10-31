import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { isISODate, todayISO, addDaysISO } from "@/lib/dates";
import { listSessions } from "@/lib/data/sessions";
import { createClient } from "@/lib/supabase/server";
import type { SessionSummary } from "@/lib/types";

export interface ReportData {
  athlete: { id: string; full_name: string };
  from: string;
  to: string;
  today: string;
  sessions: SessionSummary[];
}

/** Loads report data for the signed-in user. Access is limited to self or own athletes (and RLS). */
export async function loadReport(athleteId: string, url: URL): Promise<{ ok: true; data: ReportData } | { ok: false; status: number; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401, error: "Wymagane logowanie" };
  const supabase = await createClient();
  if (user.id !== athleteId) {
    const { data: link } = await supabase.from("coach_athletes").select("athlete_id").eq("coach_id", user.id).eq("athlete_id", athleteId).maybeSingle();
    if (!link) return { ok: false, status: 403, error: "Brak dostępu do danych tego zawodnika" };
  }
  const { data: profile } = await supabase.from("profiles").select("id, full_name").eq("id", athleteId).maybeSingle();
  if (!profile) return { ok: false, status: 404, error: "Nie znaleziono zawodnika" };
  const today = todayISO(user.profile.timezone);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const to = isISODate(toParam) ? toParam : today;
  let from = isISODate(fromParam) ? fromParam : addDaysISO(to, -27);
  if (from > to) from = to;
  if (addDaysISO(from, 400) < to) from = addDaysISO(to, -400);
  const sessions = await listSessions(supabase, { athleteIds: [athleteId], from, to });
  return { ok: true, data: { athlete: profile as { id: string; full_name: string }, from, to, today, sessions } };
}

export function fileSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
