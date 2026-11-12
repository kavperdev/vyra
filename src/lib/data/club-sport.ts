import type { createClient } from "@/lib/supabase/server";
import type { SwimStandard, SwimTime, VolleyStats } from "@/lib/clubs/sports";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export interface ClubMatch {
  id: string;
  club_id: string;
  group_id: string | null;
  kind: "match" | "tournament";
  opponent: string | null;
  title: string | null;
  home: boolean;
  starts_at: string;
  meet_at: string | null;
  place: string | null;
  competition: string | null;
  status: "planned" | "played" | "cancelled";
  score_for: number | null;
  score_against: number | null;
  sets: [number, number][] | null;
  duration_min: number | null;
  note: string | null;
}

export interface Callup {
  match_id: string;
  athlete_id: string;
  status: "pending" | "yes" | "no";
  replied_by: "athlete" | "guardian" | "coach" | null;
  starter: boolean;
  position: string | null;
  shirt: number | null;
  minutes: number | null;
  goals: number;
  assists: number;
  rating: number | null;
  category_kg: number | null;
  result: string | null;
  stats: VolleyStats;
}

const n = (v: unknown) => (v == null ? null : Number(v));

/** Matches and tournaments of a club with their call-ups. ready=false before the sport-modules migration. */
export async function loadMatches(supabase: ServerSupabase, clubId: string): Promise<{ ready: boolean; matches: ClubMatch[]; callups: Callup[] }> {
  const { data, error } = await supabase.from("club_matches").select("*").eq("club_id", clubId).order("starts_at", { ascending: false }).limit(200);
  if (error) return { ready: false, matches: [], callups: [] };
  const matches = (data ?? []) as ClubMatch[];
  if (!matches.length) return { ready: true, matches, callups: [] };
  const { data: c } = await supabase.from("match_callups").select("*").in("match_id", matches.map((m) => m.id));
  const callups = ((c ?? []) as Callup[]).map((x) => ({ ...x, category_kg: n(x.category_kg), stats: x.stats ?? {} }));
  return { ready: true, matches, callups };
}

export interface SkillRating {
  athlete_id: string;
  skill_key: string;
  score: number;
  rated_on: string;
}
export interface Grade {
  id: string;
  athlete_id: string;
  grade: string;
  color: string | null;
  awarded_on: string;
  examiner: string | null;
}
export interface Weight {
  athlete_id: string;
  weight_kg: number;
  measured_on: string;
}

async function rows<T>(supabase: ServerSupabase, table: string, athleteIds: string[], order: string): Promise<{ ready: boolean; rows: T[] }> {
  if (!athleteIds.length) {
    const probe = await supabase.from(table).select("athlete_id").limit(1);
    return { ready: !probe.error, rows: [] };
  }
  const { data, error } = await supabase.from(table).select("*").in("athlete_id", athleteIds).order(order);
  return { ready: !error, rows: (data ?? []) as T[] };
}

export const loadSkills = (s: ServerSupabase, ids: string[]) => rows<SkillRating>(s, "skill_ratings", ids, "rated_on");
export const loadGrades = (s: ServerSupabase, ids: string[]) => rows<Grade>(s, "athlete_grades", ids, "awarded_on");
export async function loadWeights(s: ServerSupabase, ids: string[]) {
  const r = await rows<Weight>(s, "athlete_weights", ids, "measured_on");
  return { ...r, rows: r.rows.map((w) => ({ ...w, weight_kg: Number(w.weight_kg) })) };
}
export async function loadSwimTimes(s: ServerSupabase, ids: string[]) {
  const r = await rows<SwimTime>(s, "swim_times", ids, "swum_on");
  return { ...r, rows: r.rows.map((t) => ({ ...t, time_s: Number(t.time_s) })) };
}
export async function loadSwimStandards(s: ServerSupabase, clubId: string): Promise<SwimStandard[]> {
  const { data } = await s.from("swim_standards").select("*").eq("club_id", clubId).order("name");
  return ((data ?? []) as SwimStandard[]).map((x) => ({ ...x, time_s: Number(x.time_s) }));
}

/** Birth year and sex of club athletes (for swim standards). */
export async function loadAthleteBasics(s: ServerSupabase, ids: string[]): Promise<Record<string, { birth_year: number | null; sex: "f" | "m" | null }>> {
  if (!ids.length) return {};
  const { data, error } = await s.from("athlete_profiles").select("athlete_id, birth_year, sex").in("athlete_id", ids);
  const out: Record<string, { birth_year: number | null; sex: "f" | "m" | null }> = {};
  if (error) {
    const { data: d2 } = await s.from("athlete_profiles").select("athlete_id, birth_year").in("athlete_id", ids);
    for (const r of (d2 ?? []) as { athlete_id: string; birth_year: number | null }[]) out[r.athlete_id] = { birth_year: r.birth_year, sex: null };
    return out;
  }
  for (const r of (data ?? []) as { athlete_id: string; birth_year: number | null; sex: "f" | "m" | null }[]) out[r.athlete_id] = { birth_year: r.birth_year, sex: r.sex };
  return out;
}

/** The athlete's own call-ups (athlete app). */
export async function myCallups(s: ServerSupabase, athleteId: string): Promise<{ match: ClubMatch; callup: Callup }[]> {
  const { data, error } = await s.from("match_callups").select("*, club_matches(*)").eq("athlete_id", athleteId);
  if (error) return [];
  type Row = Callup & { club_matches: ClubMatch | null };
  const since = Date.now() - 30 * 86_400_000;
  return ((data ?? []) as Row[])
    .filter((r) => r.club_matches && r.club_matches.status !== "cancelled" && Date.parse(r.club_matches.starts_at) > since)
    .map((r) => ({ match: r.club_matches!, callup: { ...r, stats: r.stats ?? {} } }))
    .sort((a, b) => a.match.starts_at.localeCompare(b.match.starts_at));
}

/** One call-up as the athlete or a parent sees it. */
export function callupItem(
  m: Pick<ClubMatch, "id" | "kind" | "title" | "opponent" | "home" | "starts_at" | "meet_at" | "place" | "competition" | "status" | "score_for" | "score_against" | "sets">,
  c: { status: Callup["status"]; minutes: number | null; goals: number; assists: number; category_kg: number | string | null; result: string | null },
  clubName: string,
  sport: string,
) {
  const name =
    m.kind === "tournament" || !m.opponent ? (m.title ?? "Turniej") : m.home ? `${clubName} – ${m.opponent}` : `${m.opponent} – ${clubName}`;
  const score =
    m.status === "played" && m.score_for != null
      ? m.sets && m.sets.length
        ? `${m.score_for}:${m.score_against} (${m.sets.map((s) => s.join(":")).join(", ")})`
        : `${m.score_for}:${m.score_against}`
      : null;
  let line: string | null = null;
  if (m.status === "played") {
    if (m.kind === "tournament") line = c.result;
    else if (sport === "football") line = c.minutes != null ? `${c.minutes} min${c.goals ? ` · ${c.goals} gol${c.goals > 1 ? "e" : ""}` : ""}${c.assists ? ` · ${c.assists} asyst${c.assists > 1 ? "y" : "a"}` : ""}` : null;
    else if (c.goals) line = `${c.goals} pkt`;
  } else if (c.category_kg) line = `Kategoria wagowa do ${String(c.category_kg).replace(".", ",")} kg`;
  return { id: m.id, name, starts_at: m.starts_at, meet_at: m.meet_at, place: m.place, competition: m.competition, status: m.status, score, answer: c.status, line };
}
