import { ClubToday } from "@/components/club/club-today";
import { AppGuide } from "@/components/app/guide";
import { getCurrentUser } from "@/lib/auth";
import type { SportClub } from "@/lib/data/clubs";
import { loadMemberClubView } from "@/lib/data/club-management";
import { loadFitness, recentAttendance } from "@/lib/data/club-reports";
import { callupItem, myCallups } from "@/lib/data/club-sport";
import { expandSchedule } from "@/lib/clubs/schedule";
import { addDaysISO, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

/** Loads the club member's day (schedule, attendance, call-ups, notices, fees) and shows it. */
export async function ClubHome({ club }: { club: SportClub }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const today = todayISO(user.profile.timezone);
  const monday = addDaysISO(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));
  const to = addDaysISO(today, 21);
  const [v, att, calls, fit] = await Promise.all([
    loadMemberClubView(supabase, user.id, club.id, monday, to),
    recentAttendance(supabase, user.id, today, addDaysISO(today, -30)),
    myCallups(supabase, user.id),
    loadFitness(supabase, [user.id]),
  ]);
  const occurrences = expandSchedule(v.slots, v.events, (id) => v.groups.find((g) => g.id === id)?.name ?? "", monday, to);
  const sport = club.sport ?? "athletics";
  const { count: coaches } = await supabase.from("coach_athletes").select("athlete_id", { count: "exact", head: true }).eq("athlete_id", user.id).eq("status", "active");
  return (
    <>
    <AppGuide variant="club" userId={user.id} coach={(coaches ?? 0) > 0} next={{ title: "Zacznij od kalendarza", text: "Sprawdź, kiedy masz najbliższe treningi i mecze. Włącz powiadomienia, żeby nie przegapić zmian i odwołanych zajęć.", href: "/athlete/calendar", cta: "Otwórz kalendarz" }} />
    <ClubToday
      data={{
        club: { name: club.name, logo_url: club.logo_url },
        firstName: (user.profile.full_name || "").trim().split(/\s+/)[0] || "",
        today,
        occurrences,
        groups: v.groups.map((g) => ({ id: g.id, name: g.name, color: g.color })),
        announcements: v.announcements,
        charges: v.charges,
        bank: { account: v.bank.bank_account, recipient: v.bank.bank_recipient ?? club.name },
        attendance: att,
        callups: calls.map(({ match, callup }) => callupItem(match, callup, club.name, sport)),
        hasCard: fit.ready && fit.results.length > 0,
      }}
    />
    </>
  );
}
