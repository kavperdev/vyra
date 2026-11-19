"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { warsawLocalToIso } from "@/lib/format";

export type GroupRun = {
  id: string;
  host: string;
  mine: boolean;
  city: string;
  place: string;
  starts_at: string;
  distance_km: number | null;
  pace: string | null;
  level: "easy" | "steady" | "fast";
  note: string | null;
  max_people: number;
  people: number;
  joined: boolean;
};
export type GroupRunInput = { city: string; place: string; when: string; distance: string; pace: string; level: string; note: string; max: string };
type Res = { ok: true } | { ok: false; error: string };

const MSG: Record<string, string> = {
  TERMS: "Najpierw zaakceptuj zasady wspólnych biegów.",
  ADULT_ONLY: "Wspólne biegi są tylko dla osób pełnoletnich.",
  BAD_TIME: "Wybierz termin od teraz do 30 dni naprzód.",
  TOO_MANY: "Masz już 5 zaplanowanych biegów. Odwołaj któryś, żeby dodać nowy.",
  FULL: "Na ten bieg nie ma już miejsc.",
  GONE: "Ten bieg został odwołany albo już się odbył.",
};
const fail = (e: { message: string } | null): Res => {
  if (!e) return { ok: true };
  const code = Object.keys(MSG).find((k) => e.message.includes(k));
  return { ok: false, error: code ? MSG[code] : "Coś poszło nie tak. Spróbuj jeszcze raz." };
};

/** null = the feature isn't switched on yet (migration missing) or signed out. */
export async function groupRuns(city: string | null): Promise<{ runs: GroupRun[]; terms: boolean } | null> {
  const supabase = await createClient();
  const [list, terms] = await Promise.all([supabase.rpc("group_runs_list", { p_city: city }), supabase.rpc("group_run_terms_ok")]);
  if (list.error || terms.error) return null;
  return { runs: ((list.data ?? []) as GroupRun[]).map((r) => ({ ...r, distance_km: r.distance_km == null ? null : Number(r.distance_km) })), terms: !!terms.data };
}

export async function acceptGroupRunTerms(adult: boolean): Promise<Res> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("group_run_accept", { p_adult: adult });
  return fail(error);
}

export async function createGroupRun(v: GroupRunInput): Promise<Res> {
  if (v.city.trim().length < 2) return { ok: false, error: "Podaj miasto." };
  if (v.place.trim().length < 3) return { ok: false, error: "Podaj miejsce zbiórki (publiczne, np. park, przy wejściu)." };
  if (!v.when) return { ok: false, error: "Wybierz dzień i godzinę." };
  const dist = v.distance ? Number(v.distance.replace(",", ".")) : null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("group_run_create", {
    p_city: v.city.trim().slice(0, 60),
    p_place: v.place.trim().slice(0, 120),
    p_starts_at: warsawLocalToIso(v.when),
    p_distance: dist && dist >= 1 && dist <= 60 ? dist : null,
    p_pace: v.pace.trim().slice(0, 20),
    p_level: ["easy", "steady", "fast"].includes(v.level) ? v.level : "easy",
    p_note: v.note.trim().slice(0, 300),
    p_max: Math.max(2, Math.min(30, Number(v.max) || 8)),
  });
  revalidatePath("/app/wspolne-biegi");
  return fail(error);
}

export async function joinGroupRun(id: string): Promise<Res> {
  const supabase = await createClient();
  return fail((await supabase.rpc("group_run_join", { p_run: id })).error);
}
export async function leaveGroupRun(id: string): Promise<Res> {
  const supabase = await createClient();
  return fail((await supabase.rpc("group_run_leave", { p_run: id })).error);
}
export async function cancelGroupRun(id: string): Promise<Res> {
  const supabase = await createClient();
  return fail((await supabase.rpc("group_run_cancel", { p_run: id })).error);
}
export async function reportGroupRun(id: string, reason: string): Promise<Res> {
  if (!reason.trim()) return { ok: false, error: "Napisz krótko, co jest nie tak." };
  const supabase = await createClient();
  return fail((await supabase.rpc("group_run_report", { p_run: id, p_reason: reason })).error);
}
export async function groupRunPeople(id: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("group_run_people_names", { p_run: id });
  return (data ?? []) as string[];
}
