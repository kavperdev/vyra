import "server-only";
import type { Article, Camp, CampParticipant, CampTest, SiteTeamCard } from "@/lib/camps";
import type { ServerSupabase } from "@/lib/supabase/server";

const num = (v: unknown): number | null => (v == null ? null : Number(v));

function normTest(t: CampTest): CampTest {
  return {
    ...t,
    vo2max: num(t.vo2max),
    weight_kg: num(t.weight_kg),
    body_fat_pct: num(t.body_fat_pct),
    muscle_kg: num(t.muscle_kg),
    cmj_cm: num(t.cmj_cm),
  };
}

export async function listCamps(supabase: ServerSupabase, opts: { publicOnly?: boolean } = {}): Promise<Camp[]> {
  let q = supabase.from("camps").select("*").order("starts_on", { ascending: true, nullsFirst: false });
  if (opts.publicOnly) q = q.in("status", ["published", "closed"]);
  const { data, error } = await q;
  if (error) throw new Error(`Nie udało się pobrać obozów: ${error.message}`);
  return (data ?? []) as Camp[];
}

export async function getCamp(supabase: ServerSupabase, idOrSlug: { id?: string; slug?: string }): Promise<Camp | null> {
  let q = supabase.from("camps").select("*");
  q = idOrSlug.id ? q.eq("id", idOrSlug.id) : q.eq("slug", idOrSlug.slug ?? "");
  const { data } = await q.maybeSingle();
  return (data as Camp | null) ?? null;
}

export async function listParticipants(supabase: ServerSupabase, campId: string): Promise<CampParticipant[]> {
  const { data, error } = await supabase
    .from("camp_participants")
    .select("*")
    .eq("camp_id", campId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Nie udało się pobrać uczestników: ${error.message}`);
  return (data ?? []) as CampParticipant[];
}

/** Places taken per camp (registered, paid, attended). Works for visitors too: counts only. */
export async function takenPlaces(supabase: ServerSupabase): Promise<Record<string, number>> {
  const { data } = await supabase.rpc("camp_taken_places");
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as { camp_id: string; taken: number }[]) out[r.camp_id] = Number(r.taken);
  return out;
}

export async function getParticipant(supabase: ServerSupabase, id: string): Promise<CampParticipant | null> {
  const { data } = await supabase.from("camp_participants").select("*").eq("id", id).maybeSingle();
  return (data as CampParticipant | null) ?? null;
}

export async function listTests(supabase: ServerSupabase, participantIds: string[]): Promise<CampTest[]> {
  if (!participantIds.length) return [];
  const { data, error } = await supabase.from("camp_tests").select("*").in("participant_id", participantIds);
  if (error) throw new Error(`Nie udało się pobrać testów: ${error.message}`);
  return ((data ?? []) as CampTest[]).map(normTest);
}

export async function listArticles(supabase: ServerSupabase, opts: { publishedOnly?: boolean } = {}): Promise<Article[]> {
  let q = supabase.from("articles").select("*").order("published_at", { ascending: false, nullsFirst: true }).order("updated_at", { ascending: false });
  if (opts.publishedOnly) q = q.eq("status", "published");
  const { data, error } = await q;
  if (error) throw new Error(`Nie udało się pobrać artykułów: ${error.message}`);
  return (data ?? []) as Article[];
}

export async function getArticle(supabase: ServerSupabase, idOrSlug: { id?: string; slug?: string }): Promise<Article | null> {
  let q = supabase.from("articles").select("*");
  q = idOrSlug.id ? q.eq("id", idOrSlug.id) : q.eq("slug", idOrSlug.slug ?? "");
  const { data } = await q.maybeSingle();
  return (data as Article | null) ?? null;
}

export async function listSiteTeam(supabase: ServerSupabase): Promise<SiteTeamCard[]> {
  const { data } = await supabase.from("site_team").select("*").order("sort").order("created_at");
  return (data ?? []) as SiteTeamCard[];
}

export interface MyCamp {
  participant: CampParticipant;
  camp: Camp;
  info: string | null;
}

/** Camps the signed-in athlete takes part in, newest first, with information for participants. */
export async function listMyCamps(supabase: ServerSupabase, userId: string): Promise<MyCamp[]> {
  const { data } = await supabase
    .from("camp_participants")
    .select("*, camp:camps ( * )")
    .eq("athlete_id", userId)
    .neq("status", "cancelled");
  type Row = CampParticipant & { camp: Camp | Camp[] | null };
  const rows = ((data ?? []) as unknown as Row[])
    .map(({ camp, ...participant }) => ({ participant, camp: Array.isArray(camp) ? (camp[0] ?? null) : camp }))
    .filter((r): r is { participant: CampParticipant; camp: Camp } => !!r.camp);
  if (!rows.length) return [];
  const { data: infos } = await supabase
    .from("camp_private_info")
    .select("camp_id, body")
    .in(
      "camp_id",
      rows.map((r) => r.camp.id),
    );
  const byCamp = new Map(((infos ?? []) as { camp_id: string; body: string }[]).map((i) => [i.camp_id, i.body]));
  return rows
    .map((r) => ({ ...r, info: byCamp.get(r.camp.id) || null }))
    .sort((a, b) => (b.camp.starts_on ?? "").localeCompare(a.camp.starts_on ?? ""));
}

export async function getCampPrivateInfo(supabase: ServerSupabase, campId: string): Promise<string> {
  const { data } = await supabase.from("camp_private_info").select("body").eq("camp_id", campId).maybeSingle();
  return (data as { body: string } | null)?.body ?? "";
}
