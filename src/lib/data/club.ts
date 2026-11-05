import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";

export interface RunClubEvent {
  id: string;
  title: string;
  starts_at: string;
  place: string;
  map_url: string | null;
  pace: string | null;
  description: string | null;
  capacity: number | null;
  visible: boolean;
  meeting_note?: string | null;
  attendees?: number | null;
  distance_km?: number | null;
}

export interface RunClubStats {
  sessions: number;
  people: number;
  km: number;
}

/** Totals for the public counter. Zeros when the migration has not been run yet. */
export async function runClubStats(supabase: ServerSupabase): Promise<RunClubStats> {
  const { data, error } = await supabase.rpc("run_club_stats");
  const r = (Array.isArray(data) ? data[0] : data) as { sessions: number; people: number; km: number | string } | null;
  if (error || !r) return { sessions: 0, people: 0, km: 0 };
  return { sessions: Number(r.sessions) || 0, people: Number(r.people) || 0, km: Number(r.km) || 0 };
}

export interface RunClubPhoto {
  id: string;
  url: string;
  caption: string | null;
  sort: number;
  visible: boolean;
}

export async function listRunClubPhotos(supabase: ServerSupabase): Promise<RunClubPhoto[]> {
  const { data, error } = await supabase.from("run_club_photos").select("*").order("sort").order("created_at", { ascending: false });
  return error ? [] : ((data ?? []) as RunClubPhoto[]);
}

/** Size of the "notify me" list, for founders. */
export async function runClubSubscriberCount(supabase: ServerSupabase): Promise<number> {
  const { count, error } = await supabase.from("run_club_subscribers").select("id", { count: "exact", head: true });
  return error ? 0 : (count ?? 0);
}

/** Map link: the one set in the panel, otherwise a Google Maps search for the place. */
export function mapLink(e: Pick<RunClubEvent, "map_url" | "place">): string {
  return e.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.place)}`;
}

export interface RunClubSignup {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export interface Testimonial {
  id: string;
  name: string;
  result: string | null;
  quote: string;
  quote_en: string | null;
  sort: number;
  visible: boolean;
}

/** Events from today on (or all, for the panel). Empty list when the table does not exist yet. */
export async function listRunClubEvents(supabase: ServerSupabase, opts: { upcoming?: boolean } = {}): Promise<RunClubEvent[]> {
  let q = supabase.from("run_club_events").select("*").order("starts_at");
  if (opts.upcoming) q = q.gte("starts_at", new Date(Date.now() - 2 * 3600 * 1000).toISOString());
  const { data, error } = await q;
  return error ? [] : ((data ?? []) as RunClubEvent[]);
}

export async function runClubCounts(supabase: ServerSupabase): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc("run_club_counts");
  if (error) return {};
  return Object.fromEntries(((data ?? []) as { event_id: string; taken: number }[]).map((r) => [r.event_id, r.taken]));
}

export async function listRunClubSignups(supabase: ServerSupabase): Promise<RunClubSignup[]> {
  const { data, error } = await supabase.from("run_club_signups").select("*").order("created_at");
  return error ? [] : ((data ?? []) as RunClubSignup[]);
}

export async function listTestimonials(supabase: ServerSupabase): Promise<Testimonial[]> {
  const { data, error } = await supabase.from("testimonials").select("*").order("sort").order("created_at");
  return error ? [] : ((data ?? []) as Testimonial[]);
}

export interface Ambassador {
  id: string;
  slug: string;
  name: string;
  handle: string | null;
  goal: string | null;
  quote: string | null;
  code: string | null;
  discount_pct: number;
  photo_url: string | null;
  visible: boolean;
}

/** Influencer pages. Empty list when the table does not exist yet. */
export async function listAmbassadors(supabase: ServerSupabase): Promise<Ambassador[]> {
  const { data, error } = await supabase.from("ambassadors").select("*").order("created_at");
  return error ? [] : ((data ?? []) as Ambassador[]);
}

export async function getAmbassador(supabase: ServerSupabase, slug: string): Promise<Ambassador | null> {
  const { data, error } = await supabase.from("ambassadors").select("*").eq("slug", slug).eq("visible", true).maybeSingle();
  return error ? null : ((data as Ambassador | null) ?? null);
}
