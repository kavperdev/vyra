import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { AttendanceBoard, ClubHeaderCard, ClubsAdmin, ManagedAthleteForm } from "@/components/coach/club-space";
import { requireRole } from "@/lib/auth";
import { attendanceForDay, getMyClub, listClubMembers, listClubs } from "@/lib/data/clubs";
import { listAthletes } from "@/lib/data/people";
import { isISODate, todayISO } from "@/lib/dates";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { canPlan } from "@/lib/types";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Klub", "Club") };
}

export default async function ClubPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await getLang();
  const sp = await searchParams;
  const user = await requireRole("coach");
  const founder = user.profile.staff_role === "founder";
  const supabase = await createClient();
  const today = todayISO(user.profile.timezone);
  const date = isISODate(sp.date) ? sp.date : today;

  const [club, clubs, athletes] = await Promise.all([
    getMyClub(supabase, user.id),
    founder ? listClubs(supabase) : Promise.resolve(null),
    listAthletes(supabase, user.id),
  ]);

  if (!club && (!founder || clubs === null)) {
    return (
      <div className="grid gap-6">
        <PageHeader eyebrow={tl("Platforma dla klubów", "Platform for clubs")} title={tl("Klub", "Club")} />
        <EmptyState
          title={founder ? tl("Kluby nie są jeszcze włączone", "Clubs aren’t switched on yet") : tl("Nie należysz do klubu", "You’re not in a club")}
          description={founder ? tl("Uruchom migrację 20261112000100_sport_clubs.sql w Supabase.", "Run migration 20261112000100_sport_clubs.sql in Supabase.") : tl("Do klubu dodaje założyciel VYRA.", "A VYRA founder adds you to a club.")}
        />
      </div>
    );
  }

  const active = athletes.filter((a) => a.link_status === "active");
  const [rows, members] = await Promise.all([
    attendanceForDay(supabase, active.map((a) => a.id), date),
    founder && clubs ? listClubMembers(supabase, clubs.map((c) => c.id)) : Promise.resolve([]),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={tl("Platforma dla klubów", "Platform for clubs")}
        title={club ? club.name : tl("Kluby", "Clubs")}
        description={tl("Kadra, zawodnicy bez konta i obecność na treningach grupowych.", "Staff, athletes without accounts and attendance at group sessions.")}
      />
      {club ? <ClubHeaderCard club={club} founder={founder} /> : null}
      <AttendanceBoard key={date} rows={rows} date={date} />
      {canPlan(user.profile.staff_role) ? <ManagedAthleteForm /> : null}
      {founder && clubs ? <ClubsAdmin clubs={clubs} members={members} siteUrl={siteUrl()} /> : null}
    </div>
  );
}
