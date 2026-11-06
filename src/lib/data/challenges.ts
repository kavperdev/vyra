import "server-only";
import type { createClient } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type ChallengeKind = "km" | "runs";

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  kind: ChallengeKind;
  goal: number | null;
  starts_on: string;
  ends_on: string;
  visible: boolean;
}

export interface BoardRow {
  member_no: number;
  name: string;
  club: string | null;
  km: number;
  runs: number;
}

export interface ClubRow {
  club: string;
  people: number;
  km: number;
  runs: number;
}

export interface MyChallenge {
  name: string;
  member_no: number;
  club: string | null;
  challenge: Pick<Challenge, "id" | "slug" | "title" | "kind" | "goal" | "starts_on" | "ends_on">;
  entries: { id: string; day: string; km: number }[];
}

/** Today in Poland as YYYY-MM-DD. */
export function todayPl(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
}

export function challengeState(c: Pick<Challenge, "starts_on" | "ends_on">): "upcoming" | "live" | "ended" {
  const today = todayPl();
  if (today < c.starts_on) return "upcoming";
  if (today > c.ends_on) return "ended";
  return "live";
}

export async function listChallenges(supabase: ServerSupabase): Promise<Challenge[]> {
  const { data, error } = await supabase.from("challenges").select("*").order("starts_on", { ascending: false });
  return error ? [] : ((data ?? []).map((c) => ({ ...c, goal: c.goal == null ? null : Number(c.goal) })) as Challenge[]);
}

export async function getChallenge(supabase: ServerSupabase, slug: string): Promise<Challenge | null> {
  const { data, error } = await supabase.from("challenges").select("*").eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  return { ...(data as Challenge), goal: data.goal == null ? null : Number(data.goal) };
}

export async function challengeBoard(supabase: ServerSupabase, id: string): Promise<BoardRow[]> {
  const { data, error } = await supabase.rpc("challenge_board", { p_challenge: id });
  if (error) return [];
  return ((data ?? []) as BoardRow[]).map((r) => ({ ...r, km: Number(r.km) || 0, runs: Number(r.runs) || 0 }));
}

export async function challengeClubs(supabase: ServerSupabase, id: string): Promise<ClubRow[]> {
  const { data, error } = await supabase.rpc("challenge_clubs", { p_challenge: id });
  if (error) return [];
  return ((data ?? []) as ClubRow[]).map((r) => ({ ...r, km: Number(r.km) || 0, runs: Number(r.runs) || 0, people: Number(r.people) || 0 }));
}

export async function myChallenge(supabase: ServerSupabase, token: string): Promise<MyChallenge | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data, error } = await supabase.rpc("challenge_me", { p_token: token });
  if (error || !data) return null;
  const d = data as MyChallenge;
  return { ...d, challenge: { ...d.challenge, goal: d.challenge.goal == null ? null : Number(d.challenge.goal) }, entries: d.entries.map((e) => ({ ...e, km: Number(e.km) })) };
}

/** Score for the ranking: kilometres or number of runs. */
export function score(kind: ChallengeKind, r: { km: number; runs: number }): number {
  return kind === "runs" ? r.runs : r.km;
}

export const fmtKm = (v: number) => new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 }).format(v);

export interface ParticipantAdminRow {
  id: string;
  challenge_id: string;
  club: string | null;
  member_no: number;
  name: string;
  email: string;
}

/** Founders: who joined which challenge (with e-mails). */
export async function listChallengeParticipants(supabase: ServerSupabase): Promise<ParticipantAdminRow[]> {
  const { data, error } = await supabase
    .from("challenge_participants")
    .select("id, challenge_id, club, member_no, vyra_members(name, email)")
    .order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as unknown as { id: string; challenge_id: string; club: string | null; member_no: number; vyra_members: { name: string; email: string } | null }[]).map((r) => ({
    id: r.id,
    challenge_id: r.challenge_id,
    club: r.club,
    member_no: r.member_no,
    name: r.vyra_members?.name ?? "",
    email: r.vyra_members?.email ?? "",
  }));
}
