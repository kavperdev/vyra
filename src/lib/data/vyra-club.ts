import "server-only";
import type { createClient } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type MemberPostKind = "plan" | "news" | "event";

export interface MemberPost {
  id: string;
  kind: MemberPostKind;
  title: string;
  body: string | null;
  link_url: string | null;
  link_label: string | null;
  visible: boolean;
  sort: number;
  created_at: string;
}

export interface MemberArea {
  member_no: number;
  name: string;
  since: string;
  newsletter: boolean;
  club: boolean;
  challenges: { title: string; slug: string; kind: "km" | "runs"; goal: number | null; token: string; km: number; runs: number; ends_on: string }[];
  posts: Pick<MemberPost, "id" | "kind" | "title" | "body" | "link_url" | "link_label" | "created_at">[];
}

export interface NewsletterIssue {
  id: string;
  subject: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  sent_at: string | null;
  recipients: number | null;
  created_at: string;
}

export const memberNo = (n: number) => `#${String(n).padStart(3, "0")}`;

export async function memberArea(supabase: ServerSupabase, token: string): Promise<MemberArea | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data, error } = await supabase.rpc("member_area", { p_token: token });
  if (error || !data) return null;
  const d = data as MemberArea;
  return { ...d, challenges: d.challenges.map((c) => ({ ...c, km: Number(c.km) || 0, runs: Number(c.runs) || 0, goal: c.goal == null ? null : Number(c.goal) })) };
}

export async function clubCount(supabase: ServerSupabase): Promise<number> {
  const { data, error } = await supabase.rpc("club_count");
  return error ? 0 : Number(data) || 0;
}

/** Founders: member posts, newsletter issues and list sizes. */
export async function listMemberPosts(supabase: ServerSupabase): Promise<MemberPost[]> {
  const { data, error } = await supabase.from("member_posts").select("*").order("sort").order("created_at", { ascending: false });
  return error ? [] : ((data ?? []) as MemberPost[]);
}

export async function listNewsletterIssues(supabase: ServerSupabase): Promise<NewsletterIssue[]> {
  const { data, error } = await supabase.from("newsletter_issues").select("*").order("created_at", { ascending: false }).limit(20);
  return error ? [] : ((data ?? []) as NewsletterIssue[]);
}

export async function clubSizes(supabase: ServerSupabase): Promise<{ members: number; club: number; newsletter: number }> {
  const [all, club, nl] = await Promise.all([
    supabase.from("vyra_members").select("member_no", { count: "exact", head: true }),
    supabase.from("vyra_members").select("member_no", { count: "exact", head: true }).eq("club", true),
    supabase.from("vyra_members").select("member_no", { count: "exact", head: true }).eq("newsletter", true),
  ]);
  return { members: all.count ?? 0, club: club.count ?? 0, newsletter: nl.count ?? 0 };
}
