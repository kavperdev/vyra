import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, LinkTabs, PageHeader } from "@/components/ui/misc";
import { AttendanceBoard, ClubBadge, ClubHeaderCard, ClubsAdmin, ManagedAthleteForm } from "@/components/coach/club-space";
import { AnnouncementsTab, ClubOverview, FeesTab, GroupsTab, PeopleTab } from "@/components/club/club-panel";
import { DevelopmentTab } from "@/components/club/development";
import { ReportTab } from "@/components/club/report";
import { MatchesTab } from "@/components/club/matches";
import { GradesTab, SkillsCard, SwimTab } from "@/components/club/sport-records";
import { modulesFor } from "@/lib/clubs/sports";
import { loadAthleteBasics, loadGrades, loadMatches, loadSkills, loadSwimStandards, loadSwimTimes, loadWeights } from "@/lib/data/club-sport";
import { loadFitness, loadGrantReport } from "@/lib/data/club-reports";
import { requireRole } from "@/lib/auth";
import { attendanceForDay, getMyClub, listClubMembers, listClubs, type SportClub } from "@/lib/data/clubs";
import { loadClubWorkspace } from "@/lib/data/club-management";
import { expandSchedule } from "@/lib/clubs/schedule";
import { addDaysISO, isISODate, todayISO } from "@/lib/dates";
import { siteUrl } from "@/lib/env";
import { mailConfigured } from "@/lib/mail";
import { createClient } from "@/lib/supabase/server";
import { canPlan } from "@/lib/types";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Klub", "Club") };
}

const TABS = ["przeglad", "grupy", "mecze", "turnieje", "czasy", "stopnie", "skladki", "zawodnicy", "rozwoj", "komunikaty", "raporty"] as const;

export default async function ClubPage({ searchParams }: { searchParams: Promise<{ date?: string; tab?: string; club?: string; month?: string; from?: string; to?: string; group?: string }> }) {
  await getLang();
  const sp = await searchParams;
  const user = await requireRole("coach");
  const founder = user.profile.staff_role === "founder";
  const supabase = await createClient();
  const today = todayISO(user.profile.timezone);
  const date = isISODate(sp.date) ? sp.date : today;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today.slice(0, 7);
  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? sp.tab! : "przeglad";

  const [own, clubs] = await Promise.all([getMyClub(supabase, user.id), founder ? listClubs(supabase) : Promise.resolve(null)]);
  const picked: SportClub | null = founder && clubs && sp.club ? (clubs.find((c) => c.id === sp.club) ?? null) : own;

  if (!picked && (!founder || clubs === null)) {
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

  // Founder without a picked club: list of clubs to manage.
  if (!picked) {
    const members = clubs ? await listClubMembers(supabase, clubs.map((c) => c.id)) : [];
    return (
      <div className="grid gap-6">
        <PageHeader eyebrow={tl("Platforma dla klubów", "Platform for clubs")} title={tl("Kluby", "Clubs")} description={tl("Wybierz klub, żeby zarządzać grupami, harmonogramem, składkami i komunikatami.", "Pick a club to manage groups, schedule, fees and notices.")} />
        {clubs?.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {clubs.map((c) => (
              <li key={c.id}>
                <Link href={`/coach/klub?club=${c.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:border-border-strong">
                  <ClubBadge club={c} size={44} />
                  <span className="grid">
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-[13px] text-muted">{c.city ?? ""}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <ClubsAdmin clubs={clubs ?? []} members={members} siteUrl={siteUrl()} />
      </div>
    );
  }

  const from = addDaysISO(today, -7);
  const to = addDaysISO(today, 21);
  const ws = await loadClubWorkspace(supabase, picked.id, from, to);
  const groupName = (id: string) => ws.groups.find((g) => g.id === id)?.name ?? "";
  const occurrences = expandSchedule(ws.slots, ws.events, groupName, from, to);
  const base = `/coach/klub?${founder && sp.club ? `club=${picked.id}&` : ""}`;
  const sport = picked.sport ?? "athletics";
  const mods = modulesFor(sport);
  const tabs = [
    { key: "przeglad", label: tl("Przegląd", "Overview") },
    { key: "grupy", label: tl("Grupy i harmonogram", "Groups & schedule") },
    ...(mods.includes("matches") ? [{ key: "mecze", label: tl("Mecze", "Matches") }] : []),
    ...(mods.includes("tournaments") ? [{ key: "turnieje", label: tl("Turnieje", "Tournaments") }] : []),
    ...(mods.includes("swim") ? [{ key: "czasy", label: tl("Czasy i limity", "Times & standards") }] : []),
    ...(mods.includes("grades") ? [{ key: "stopnie", label: tl("Stopnie i waga", "Grades & weight") }] : []),
    { key: "skladki", label: tl("Składki", "Fees") },
    { key: "zawodnicy", label: tl("Zawodnicy i rodzice", "Athletes & guardians") },
    { key: "rozwoj", label: tl("Rozwój zawodników", "Development") },
    { key: "komunikaty", label: tl("Komunikaty", "Notices") },
    { key: "raporty", label: tl("Raporty", "Reports") },
  ].map((t) => ({ ...t, href: `${base}tab=${t.key}` }));
  const manager = canPlan(user.profile.staff_role);

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={tl("Platforma dla klubów", "Platform for clubs")} title={picked.name} />
      {founder && sp.club ? (
        <Link href="/coach/klub" className="w-fit text-sm text-muted hover:text-foreground">
          ← {tl("Wszystkie kluby", "All clubs")}
        </Link>
      ) : null}
      {!ws.ready ? (
        <EmptyState title={tl("Zarządzanie klubem nie jest jeszcze włączone", "Club management isn’t switched on yet")} description={tl("Uruchom migrację 20261113000100_club_management.sql w Supabase.", "Run migration 20261113000100_club_management.sql in Supabase.")} />
      ) : null}
      <LinkTabs tabs={tabs} active={tab} />
      {tab === "przeglad" ? (
        <>
          <ClubHeaderCard club={picked} founder={founder} />
          {ws.ready ? <ClubOverview ws={ws} today={today} occurrences={occurrences} /> : null}
          <AttendanceBoard key={date} rows={await attendanceForDay(supabase, ws.athletes.map((a) => a.id), date)} date={date} />
          {manager ? <ManagedAthleteForm clubId={picked.id} /> : null}
        </>
      ) : null}
      {tab === "grupy" && ws.ready ? <GroupsTab ws={ws} clubId={picked.id} occurrences={occurrences} today={today} /> : null}
      {tab === "skladki" && ws.ready ? <FeesTab ws={ws} clubId={picked.id} month={month} today={today} /> : null}
      {tab === "zawodnicy" && ws.ready ? <PeopleTab ws={ws} siteUrl={siteUrl()} today={today} fitness={(await loadFitness(supabase, ws.athletes.map((a) => a.id))).results} /> : null}
      {tab === "rozwoj" && ws.ready
        ? await (async () => {
            const fit = await loadFitness(supabase, ws.athletes.map((a) => a.id));
            const dev = (
              <DevelopmentTab
                clubId={picked.id}
                today={today}
                ready={fit.ready}
                mailReady={mailConfigured()}
                groups={ws.groups.map((g) => ({ id: g.id, name: g.name, color: g.color }))}
                athletes={ws.athletes.map((a) => ({ id: a.id, full_name: a.full_name, group_ids: a.group_ids }))}
                results={fit.results}
                sport={picked.sport ?? null}
              />
            );
            if (!mods.includes("skills")) return dev;
            const skills = await loadSkills(supabase, ws.athletes.map((a) => a.id));
            return (
              <div className="grid gap-6">
                <SkillsCard
                  ready={skills.ready}
                  today={today}
                  groups={ws.groups.map((g) => ({ id: g.id, name: g.name, color: g.color }))}
                  athletes={ws.athletes.map((a) => ({ id: a.id, full_name: a.full_name, group_ids: a.group_ids }))}
                  ratings={skills.rows}
                />
                {dev}
              </div>
            );
          })()
        : null}
      {tab === "raporty" && ws.ready
        ? await (async () => {
            const rFrom = isISODate(sp.from) ? sp.from! : `${today.slice(0, 7)}-01`;
            const rTo = isISODate(sp.to) ? sp.to! : today;
            const rGroup = sp.group && ws.groups.some((g) => g.id === sp.group) ? sp.group : "";
            const report = await loadGrantReport(supabase, ws, picked.id, rFrom, rTo, rGroup || null);
            return <ReportTab report={report} groups={ws.groups.map((g) => ({ id: g.id, name: g.name }))} clubParam={founder && sp.club ? picked.id : null} query={{ from: rFrom, to: rTo, group: rGroup }} />;
          })()
        : null}
      {(tab === "mecze" || tab === "turnieje") && ws.ready
        ? await (async () => {
            const [{ ready, matches, callups }, weights] = await Promise.all([
              loadMatches(supabase, picked.id),
              mods.includes("grades") ? loadWeights(supabase, ws.athletes.map((a) => a.id)) : Promise.resolve({ ready: true, rows: [] }),
            ]);
            const tournaments = tab === "turnieje";
            return (
              <MatchesTab
                clubId={picked.id}
                clubName={picked.name}
                sport={sport}
                ready={ready}
                groups={ws.groups.map((g) => ({ id: g.id, name: g.name, color: g.color }))}
                athletes={ws.athletes.map((a) => ({ id: a.id, full_name: a.full_name, group_ids: a.group_ids }))}
                matches={matches.filter((m) => (m.kind === "tournament") === tournaments)}
                callups={callups}
                weights={weights.rows}
                tournaments={tournaments}
              />
            );
          })()
        : null}
      {tab === "czasy" && ws.ready
        ? await (async () => {
            const ids = ws.athletes.map((a) => a.id);
            const [times, standards, basics] = await Promise.all([loadSwimTimes(supabase, ids), loadSwimStandards(supabase, picked.id), loadAthleteBasics(supabase, ids)]);
            return (
              <SwimTab
                ready={times.ready}
                clubId={picked.id}
                today={today}
                groups={ws.groups.map((g) => ({ id: g.id, name: g.name, color: g.color }))}
                athletes={ws.athletes.map((a) => ({ id: a.id, full_name: a.full_name, group_ids: a.group_ids }))}
                times={times.rows}
                standards={standards}
                basics={basics}
              />
            );
          })()
        : null}
      {tab === "stopnie" && ws.ready
        ? await (async () => {
            const ids = ws.athletes.map((a) => a.id);
            const [grades, weights] = await Promise.all([loadGrades(supabase, ids), loadWeights(supabase, ids)]);
            return (
              <GradesTab
                ready={grades.ready}
                clubId={picked.id}
                today={today}
                minMonths={Number((picked as { grade_min_months?: number }).grade_min_months ?? 6)}
                groups={ws.groups.map((g) => ({ id: g.id, name: g.name, color: g.color }))}
                athletes={ws.athletes.map((a) => ({ id: a.id, full_name: a.full_name, group_ids: a.group_ids }))}
                grades={grades.rows}
                weights={weights.rows}
              />
            );
          })()
        : null}
      {tab === "komunikaty" && ws.ready ? <AnnouncementsTab ws={ws} clubId={picked.id} mailReady={mailConfigured()} /> : null}
    </div>
  );
}
