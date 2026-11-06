import "server-only";
import type { createClient } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type Discipline = "ulica" | "ultra" | "triathlon" | "hyrox" | "inne";

export const DISCIPLINES: Record<Discipline, { pl: string; en: string }> = {
  ulica: { pl: "Bieg uliczny", en: "Road running" },
  ultra: { pl: "Ultra i trail", en: "Ultra and trail" },
  triathlon: { pl: "Triathlon", en: "Triathlon" },
  hyrox: { pl: "Hyrox", en: "Hyrox" },
  inne: { pl: "Inne", en: "Other" },
};

export interface TeamMember {
  id: string;
  name: string;
  discipline: Discipline;
  city: string | null;
  photo_url: string | null;
  bio: string | null;
  pbs: string | null;
  goal: string | null;
  quote: string | null;
  instagram: string | null;
  tiktok: string | null;
  strava_url: string | null;
  sort: number;
  visible: boolean;
}

export interface TeamApplication {
  id: string;
  name: string;
  email: string;
  discipline: Discipline;
  city: string | null;
  pbs: string;
  about: string | null;
  link: string | null;
  created_at: string;
}

export async function listTeamMembers(supabase: ServerSupabase): Promise<TeamMember[]> {
  const { data, error } = await supabase.from("team_members").select("*").order("sort").order("created_at");
  return error ? [] : ((data ?? []) as TeamMember[]);
}

export async function listTeamApplications(supabase: ServerSupabase): Promise<TeamApplication[]> {
  const { data, error } = await supabase.from("team_applications").select("*").order("created_at", { ascending: false }).limit(50);
  return error ? [] : ((data ?? []) as TeamApplication[]);
}
