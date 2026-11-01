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
