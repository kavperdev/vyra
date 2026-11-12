import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ClubBadge } from "@/components/coach/club-space";
import { MemberClubView } from "@/components/club/member-view";
import { FitnessCard } from "@/components/club/fitness-card";
import { CallupList } from "@/components/club/callup-list";
import { SportRecords } from "@/components/club/sport-summary";
import { hasModule, personalBests } from "@/lib/clubs/sports";
import { callupItem, loadGrades, loadSkills, loadSwimTimes, myCallups } from "@/lib/data/club-sport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadFitness, recentAttendance } from "@/lib/data/club-reports";
import { requireRole } from "@/lib/auth";
import { getMyClub } from "@/lib/data/clubs";
import { loadMemberClubView } from "@/lib/data/club-management";
import { expandSchedule } from "@/lib/clubs/schedule";
import { addDaysISO, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Klub", "Club") };
}

export default async function AthleteClubPage() {
  await getLang();
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const club = await getMyClub(supabase, user.id);
  if (!club) {
    return (
      <div className="grid gap-6">
        <PageHeader title={tl("Klub", "Club")} />
        <EmptyState title={tl("Nie należysz do klubu", "You’re not in a club")} description={tl("Gdy trener doda Cię do klubu, zobaczysz tu grupy, harmonogram, komunikaty i składki.", "When your coach adds you to a club, its schedule, notices and fees appear here.")} />
      </div>
    );
  }
  const today = todayISO(user.profile.timezone);
  const from = today;
  const to = addDaysISO(today, 21);
  const v = await loadMemberClubView(supabase, user.id, club.id, from, to);
  const occurrences = expandSchedule(v.slots, v.events, (id) => v.groups.find((g) => g.id === id)?.name ?? "", from, to);
  const sport = club.sport ?? "athletics";
  const [fit, att, calls, swim, grades, skills] = await Promise.all([
    loadFitness(supabase, [user.id]),
    recentAttendance(supabase, user.id, today, addDaysISO(today, -30)),
    myCallups(supabase, user.id),
    hasModule(sport, "swim") ? loadSwimTimes(supabase, [user.id]) : Promise.resolve({ ready: false, rows: [] }),
    hasModule(sport, "grades") ? loadGrades(supabase, [user.id]) : Promise.resolve({ ready: false, rows: [] }),
    hasModule(sport, "skills") ? loadSkills(supabase, [user.id]) : Promise.resolve({ ready: false, rows: [] }),
  ]);
  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-4">
        <ClubBadge club={club} size={56} />
        <PageHeader eyebrow={tl("Twój klub", "Your club")} title={club.name} description={club.city ?? undefined} />
      </div>
      <MemberClubView
        data={{
          today,
          groups: v.groups.map((g) => ({
            id: g.id,
            name: g.name,
            color: g.color,
            slots: v.slots.filter((s) => s.group_id === g.id).sort((a, b) => a.weekday - b.weekday).map((s) => ({ weekday: s.weekday, start: s.start_time, end: s.end_time, place: s.place })),
          })),
          occurrences,
          announcements: v.announcements,
          charges: v.charges,
          bank: { account: v.bank.bank_account, recipient: v.bank.bank_recipient ?? club.name },
        }}
      />
      {calls.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{hasModule(sport, "tournaments") ? "Turnieje" : "Mecze"}</CardTitle>
          </CardHeader>
          <CardContent>
            <CallupList items={calls.map(({ match, callup }) => callupItem(match, callup, club.name, sport))} />
          </CardContent>
        </Card>
      ) : null}
      <SportRecords
        grades={grades.rows.map((g) => ({ grade: g.grade, color: g.color, awarded_on: g.awarded_on }))}
        swim={personalBests(swim.rows)}
        skills={skills.rows.map((r) => ({ skill: r.skill_key, score: r.score, rated_on: r.rated_on }))}
      />
      {fit.ready ? (
        <Card>
          <CardHeader>
            <CardTitle>{tl("Moja karta rozwoju", "My development card")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FitnessCard results={fit.results} attendance={att} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
