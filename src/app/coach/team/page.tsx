import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TeamManager, type StaffMember } from "@/components/coach/team-manager";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { listAthletes } from "@/lib/data/people";
import { createClient } from "@/lib/supabase/server";
import type { Invitation, StaffRole } from "@/lib/types";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Zespół VYRA", "VYRA team") };
}

export default async function TeamPage() {
  await getLang();
  const user = await requireRole("coach");
  if (user.profile.staff_role !== "founder") redirect("/coach");
  const supabase = await createClient();

  const [{ data: staffRows }, athletes, { data: links }, { data: invites }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, staff_role").eq("role", "coach").order("full_name"),
    listAthletes(supabase, user.id),
    supabase.from("coach_athletes").select("coach_id, athlete_id, status"),
    supabase
      .from("invitations")
      .select("*")
      .not("staff_role", "is", null)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  type StaffRow = { id: string; full_name: string; email: string | null; staff_role: StaffRole };
  type LinkRow = { coach_id: string; athlete_id: string; status: string };
  const linkRows = (links ?? []) as LinkRow[];

  const staff: StaffMember[] = ((staffRows ?? []) as StaffRow[]).map((s) => ({
    ...s,
    isMe: s.id === user.id,
    athleteIds:
      s.staff_role === "founder"
        ? []
        : linkRows.filter((l) => l.coach_id === s.id && l.status === "active").map((l) => l.athlete_id),
  }));

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Zarządzanie"
        title="Zespół VYRA"
        description="Zapraszaj trenerów i fizjoterapeutę, nadawaj role i przypisuj im zawodników. Założyciele widzą wszystkich zawodników automatycznie."
      />
      <TeamManager
        staff={staff}
        athletes={athletes.filter((a) => a.link_status === "active").map((a) => ({ id: a.id, full_name: a.full_name }))}
        invitations={(invites ?? []) as Invitation[]}
        siteUrl={siteUrl()}
      />
    </div>
  );
}
