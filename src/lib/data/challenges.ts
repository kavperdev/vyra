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
  prizes?: string | null;
  finisher_code?: string | null;
}

export interface BoardRow {
  member_no: number;
  name: string;
  club: string | null;
  km: number;
  runs: number;
  verified_km?: number;
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
  finisher_code: string | null;
  entries: { id: string; day: string; km: number; seconds: number | null; status: EntryStatus; proof: boolean }[];
}

export type EntryStatus = "ok" | "pending" | "verified" | "rejected";

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
  return ((data ?? []) as BoardRow[]).map((r) => ({ ...r, km: Number(r.km) || 0, runs: Number(r.runs) || 0, verified_km: Number(r.verified_km) || 0 }));
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
  return { ...d, challenge: { ...d.challenge, goal: d.challenge.goal == null ? null : Number(d.challenge.goal) }, finisher_code: d.finisher_code ?? null, entries: d.entries.map((e) => ({ ...e, km: Number(e.km), seconds: e.seconds == null ? null : Number(e.seconds), status: e.status ?? "ok", proof: !!e.proof })) };
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

export interface PendingEntry {
  id: string;
  day: string;
  km: number;
  seconds: number | null;
  status: EntryStatus;
  note: string | null;
  proof_url: string | null;
  name: string;
  member_no: number;
  challenge_title: string;
}

/** Founders: runs waiting for a check, with a temporary link to the screenshot. */
export async function listPendingEntries(supabase: ServerSupabase): Promise<PendingEntry[]> {
  const { data, error } = await supabase
    .from("challenge_entries")
    .select("id, day, km, duration_s, status, note, proof_path, challenge_participants(member_no, vyra_members(name), challenges(title))")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) return [];
  type Row = {
    id: string;
    day: string;
    km: number;
    duration_s: number | null;
    status: EntryStatus;
    note: string | null;
    proof_path: string | null;
    challenge_participants: { member_no: number; vyra_members: { name: string } | null; challenges: { title: string } | null } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  const paths = rows.map((r) => r.proof_path).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabase.storage.from("challenge-proofs").createSignedUrls(paths, 3600);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }
  return rows.map((r) => ({
    id: r.id,
    day: r.day,
    km: Number(r.km),
    seconds: r.duration_s,
    status: r.status,
    note: r.note,
    proof_url: r.proof_path ? (signed.get(r.proof_path) ?? null) : null,
    name: r.challenge_participants?.vyra_members?.name ?? "",
    member_no: r.challenge_participants?.member_no ?? 0,
    challenge_title: r.challenge_participants?.challenges?.title ?? "",
  }));
}

/** "1:05:30" or "25:10" or "25" (minutes) → seconds; null when empty or unreadable. */
export function parseDuration(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  const parts = s.split(":").map((x) => Number(x.replace(",", ".")));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 1) return Math.round(parts[0] * 60);
  if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1]);
  if (parts.length === 3) return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  return null;
}

export function fmtDuration(sec: number | null): string {
  if (sec == null) return "";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
}

export function fmtPace(sec: number | null, km: number): string {
  if (sec == null || !km) return "";
  const p = Math.round(sec / km);
  return `${Math.floor(p / 60)}:${String(p % 60).padStart(2, "0")}/km`;
}
