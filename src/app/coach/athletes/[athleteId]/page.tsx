import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquare, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Initials, KeyValue, LinkTabs, PageHeader, SectionTitle, Stat } from "@/components/ui/misc";
import { AthleteAnalytics, PeriodFilter, parsePeriod } from "@/components/charts/analytics-panel";
import { VolumeChart } from "@/components/charts/charts";
import { CopyWeekButton } from "@/components/calendar/copy-week";
import { TrainingCalendar } from "@/components/calendar/training-calendar";
import { HistoryTable } from "@/components/athlete/history-table";
import { GoalsSection, RecordsSection } from "@/components/athlete/records-goals";
import { AthleteAccountCard, AthleteProfileForm, CoachNotes, PlansManager } from "@/components/coach/athlete-tools";
import { SessionList } from "@/components/training/session-bits";
import { StrengthHistory } from "@/components/training/strength-history";
import { requireRole } from "@/lib/auth";
import { calendarRange, parseDate, parseView } from "@/lib/calendar";
import { addDaysISO, todayISO, weekStartISO } from "@/lib/dates";
import { getAthlete, listAthletes, listCoachNotes, listGoals, listPlans, listRecords, strengthHistory } from "@/lib/data/people";
import { listRecentComments, listSessions } from "@/lib/data/sessions";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { completionStats, periodStart, weeklyBuckets } from "@/lib/training/analytics";
import { suggestRunningRecords } from "@/lib/training/records";
import { isDone } from "@/lib/training/status";
import { createClient } from "@/lib/supabase/server";
import { canPlan, type SessionKind } from "@/lib/types";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Zawodnik", "Athlete") };
}

const TABS = [
  ["overview", "Przegląd"],
  ["calendar", "Kalendarz"],
  ["plan", "Plan"],
  ["running", "Bieganie"],
  ["strength", "Siła"],
  ["analytics", "Analityka"],
  ["records", "Rekordy i cele"],
  ["history", "Historia"],
  ["notes", "Notatki"],
  ["settings", "Ustawienia"],
] as const;
type Tab = (typeof TABS)[number][0];

export default async function AthleteProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ athleteId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await getLang();
  const { athleteId } = await params;
  const sp = await searchParams;
  const user = await requireRole("coach");
  const supabase = await createClient();
  const athlete = await getAthlete(supabase, user.id, athleteId);
  if (!athlete) notFound();
  const today = todayISO(user.profile.timezone);
  const planner = canPlan(user.profile.staff_role);
  const tab: Tab = (TABS.find(([k]) => k === sp.tab)?.[0] ?? "overview") as Tab;
  const base = `/coach/athletes/${athleteId}`;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={athlete.link_status === "archived" ? "Zawodnik · archiwum" : "Zawodnik"}
        title={
          <span className="flex items-center gap-3">
            <Initials name={athlete.full_name} size="lg" />
            <span className="min-w-0">{athlete.full_name}</span>
          </span>
        }
        description={athlete.profile?.sport_goal ? `Cel: ${athlete.profile.sport_goal}` : undefined}
        actions={
          athlete.link_status === "active" ? (
            planner ? (
              <>
                <CopyWeekButton
                  athletes={(await listAthletes(supabase, user.id))
                    .filter((a) => a.link_status === "active")
                    .map((a) => ({ id: a.id, full_name: a.full_name }))}
                  athleteId={athleteId}
                  week={today}
                  size="default"
                />
                <Button asChild>
                  <Link href={`/coach/sessions/new?athlete=${athleteId}`}>
                    <Plus className="size-4" /> Trening
                  </Link>
                </Button>
              </>
            ) : null
          ) : (
            <Badge>zarchiwizowany</Badge>
          )
        }
      />
      <LinkTabs tabs={TABS.map(([key, label]) => ({ key, label, href: `${base}?tab=${key}` }))} active={tab} />
      <TabContent tab={tab} athleteId={athleteId} athlete={athlete} today={today} sp={sp} base={base} planner={planner} userId={user.id} />
    </div>
  );
}

async function TabContent({
  tab,
  athleteId,
  athlete,
  today,
  sp,
  base,
  planner,
  userId,
}: {
  planner: boolean;
  userId: string;
  tab: Tab;
  athleteId: string;
  athlete: NonNullable<Awaited<ReturnType<typeof getAthlete>>>;
  today: string;
  sp: Record<string, string | undefined>;
  base: string;
}) {
  const supabase = await createClient();
  const hrefFor = (s: { id: string }) => `/coach/sessions/${s.id}`;

  if (tab === "overview") {
    const [sessions, plans] = await Promise.all([
      listSessions(supabase, { athleteIds: [athleteId], from: periodStart(today, 8), to: addDaysISO(today, 28) }),
      listPlans(supabase, athleteId),
    ]);
    const current = plans.find((p) => p.start_date <= today && (!p.end_date || p.end_date >= today));
    const next = sessions.find((s) => s.scheduled_date >= today && s.status === "planned");
    const done = sessions.filter((s) => s.execution && isDone(s.execution.status)).sort((a, b) => b.execution!.performed_on.localeCompare(a.execution!.performed_on));
    const comp = completionStats(sessions, addDaysISO(today, -27), today);
    const buckets = weeklyBuckets(sessions, today, 8);
    const week = buckets[buckets.length - 1];
    const p = athlete.profile;
    return (
      <div className="grid gap-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Realizacja 4 tyg." value={comp.rate == null ? "–" : `${comp.rate}%`} hint={`${comp.done}/${comp.due} · pominięte ${comp.skipped}`} />
          <Stat label="Ten tydzień" value={formatNumber(week?.actualKm ?? 0)} unit="km" hint={week?.plannedKm ? `plan ${formatNumber(week.plannedKm)} km` : "bez planu km"} />
          <Stat label="Najbliższy trening" value={next ? formatDate(next.scheduled_date, "d MMM") : "–"} hint={next?.title ?? "nic nie zaplanowano"} href={next ? hrefFor(next) : undefined} />
          <Stat label="Ostatni wykonany" value={done[0] ? formatDate(done[0].execution!.performed_on, "d MMM") : "–"} hint={done[0]?.title ?? "brak wpisów"} href={done[0] ? hrefFor(done[0]) : undefined} />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Trend objętości</CardTitle>
              <Link href={`${base}?tab=analytics`} className="text-[12px] text-muted hover:text-foreground">Analityka</Link>
            </CardHeader>
            <CardContent>
              <VolumeChart data={buckets.map((b) => ({ weekStart: b.weekStart, plannedKm: b.plannedKm, actualKm: b.actualKm }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Informacje</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <KeyValue
                className="sm:grid-cols-2"
                items={[
                  { label: "E-mail", value: athlete.email ?? "–" },
                  { label: "W zespole od", value: formatDate(athlete.linked_at) },
                  { label: "Aktualny plan", value: current ? current.name : "–" },
                  { label: "Tętno spocz. / maks.", value: `${p?.resting_hr ?? "–"} / ${p?.max_hr ?? "–"}` },
                  { label: "LTHR", value: p?.lthr ? `${p.lthr} bpm` : "–" },
                  { label: "Easy do", value: p?.easy_hr_max ? `${p.easy_hr_max} bpm` : "–" },
                ]}
              />
              {p?.athlete_notes ? <p className="rounded-md bg-surface-2 p-3 text-[13px]">{p.athlete_notes}</p> : null}
            </CardContent>
          </Card>
        </div>
        <section className="grid gap-3">
          <SectionTitle>Ostatnie wyniki</SectionTitle>
          <SessionList sessions={done.slice(0, 6)} hrefFor={hrefFor} today={today} empty={<EmptyState title="Brak wyników" description="Zawodnik nie zapisał jeszcze żadnego treningu." />} />
        </section>
      </div>
    );
  }

  if (tab === "calendar") {
    const view = parseView(sp.view);
    const date = parseDate(sp.date, today);
    const { from, to } = calendarRange(view, date);
    const kind = (["running", "strength", "mobility", "other"] as const).find((k) => k === sp.kind) as SessionKind | undefined;
    const sessions = await listSessions(supabase, { athleteIds: [athleteId], from, to, kinds: kind ? [kind] : undefined });
    return (
      <TrainingCalendar role="coach" sessions={sessions} view={view} date={date} today={today} lockedAthleteId={athleteId} filters={{ athlete: athleteId, kind: kind ?? "", status: sp.status ?? "" }} />
    );
  }

  if (tab === "plan") {
    const [plans, sessions] = await Promise.all([
      listPlans(supabase, athleteId),
      listSessions(supabase, { athleteIds: [athleteId], from: addDaysISO(today, -365), to: addDaysISO(today, 365) }),
    ]);
    const counts: Record<string, { total: number; done: number }> = {};
    for (const s of sessions) {
      if (!s.plan_id) continue;
      const c = (counts[s.plan_id] ??= { total: 0, done: 0 });
      c.total += 1;
      if (isDone(s.status)) c.done += 1;
    }
    const upcoming = sessions.filter((s) => s.scheduled_date >= weekStartISO(today) && s.scheduled_date <= addDaysISO(today, 35));
    const weeks = new Map<string, typeof upcoming>();
    for (const s of upcoming) {
      const w = weekStartISO(s.scheduled_date);
      weeks.set(w, [...(weeks.get(w) ?? []), s]);
    }
    return (
      <div className="grid gap-6">
        {athlete.link_status === "active" && planner ? <PlansManager athleteId={athleteId} plans={plans} today={today} sessionCounts={counts} /> : null}
        <section className="grid gap-4">
          <SectionTitle
            action={
              athlete.link_status === "active" && planner ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/coach/sessions/new?athlete=${athleteId}`}>
                    <Plus className="size-4" /> Dodaj trening
                  </Link>
                </Button>
              ) : null
            }
          >
            Najbliższe 5 tygodni
          </SectionTitle>
          {weeks.size ? (
            [...weeks.entries()].map(([w, list]) => (
              <div key={w} className="grid gap-2">
                <p className="text-[13px] text-muted">
                  Tydzień {formatDate(w, "d MMM")} – {formatDate(addDaysISO(w, 6), "d MMM")} ·{" "}
                  {formatNumber(list.reduce((n, s) => n + (s.planned_distance_m ?? 0), 0) / 1000)} km zaplanowane
                </p>
                <SessionList sessions={list} hrefFor={hrefFor} today={today} />
              </div>
            ))
          ) : (
            <EmptyState title="Brak zaplanowanych treningów" description="Dodaj trening albo skorzystaj z szablonu, aby rozpisać kolejne tygodnie." />
          )}
        </section>
      </div>
    );
  }

  if (tab === "running" || tab === "strength" || tab === "analytics") {
    const weeks = parsePeriod(sp.weeks);
    const kindFilter: SessionKind[] | undefined = tab === "running" ? ["running"] : tab === "strength" ? ["strength", "mobility", "other"] : undefined;
    const [sessions, strength] = await Promise.all([
      listSessions(supabase, { athleteIds: [athleteId], from: periodStart(today, weeks * 2), to: addDaysISO(today, 7), kinds: kindFilter }),
      tab === "running" ? Promise.resolve([]) : strengthHistory(supabase, athleteId, periodStart(today, Math.max(weeks, 26))),
    ]);
    const recent = sessions.filter((s) => s.scheduled_date <= today).sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date)).slice(0, 10);
    return (
      <div className="grid gap-6">
        <div className="flex justify-end">
          <PeriodFilter weeks={weeks} basePath={base} extra={{ tab }} />
        </div>
        <AthleteAnalytics sessions={sessions} strength={strength} today={today} weeks={weeks} kind={tab === "analytics" ? "all" : tab} />
        {tab === "strength" ? (
          <section className="grid gap-3">
            <SectionTitle>Historia ćwiczeń</SectionTitle>
            <StrengthHistory entries={strength} sessionHref={(id) => `/coach/sessions/${id}`} />
          </section>
        ) : null}
        {tab !== "analytics" ? (
          <section className="grid gap-3">
            <SectionTitle>Ostatnie treningi</SectionTitle>
            <SessionList sessions={recent} hrefFor={hrefFor} today={today} empty={<EmptyState title="Brak treningów w tym okresie" />} />
          </section>
        ) : null}
      </div>
    );
  }

  if (tab === "records") {
    const [records, goals, sessions] = await Promise.all([
      listRecords(supabase, athleteId),
      listGoals(supabase, athleteId),
      listSessions(supabase, { athleteIds: [athleteId], kinds: ["running"], from: addDaysISO(today, -365), to: today }),
    ]);
    const suggestions = suggestRunningRecords(
      sessions
        .filter((s) => s.execution && s.execution.status === "completed")
        .map((s) => ({ session_id: s.id, title: s.title, category: s.category, performed_on: s.execution!.performed_on, distance_m: s.execution!.distance_m, duration_s: s.execution!.duration_s })),
      records,
    );
    return (
      <div className="grid gap-6">
        <RecordsSection athleteId={athleteId} records={records} suggestions={suggestions} today={today} />
        <GoalsSection athleteId={athleteId} goals={goals} />
      </div>
    );
  }

  if (tab === "history") {
    const sessions = await listSessions(supabase, { athleteIds: [athleteId], from: addDaysISO(today, -730), to: addDaysISO(today, 90), order: "desc" });
    return <HistoryTable sessions={sessions} today={today} hrefBase="/coach/sessions" />;
  }

  if (tab === "notes") {
    const [notes, comments] = await Promise.all([listCoachNotes(supabase, athleteId), listRecentComments(supabase, { athleteId, limit: 20 })]);
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <CoachNotes athleteId={athleteId} notes={notes} currentUserId={userId} />
        <Card>
          <CardHeader>
            <CardTitle>Komentarze do treningów</CardTitle>
          </CardHeader>
          <CardContent>
            {comments.length ? (
              <ul className="grid gap-2">
                {comments.map((c) => (
                  <li key={c.id}>
                    <Link href={`/coach/sessions/${c.session_id}`} className="grid gap-1 rounded-md border border-border p-3 hover:border-border-strong">
                      <p className="flex items-center gap-2 text-[12px] text-muted">
                        <MessageSquare className="size-3.5" /> {c.author_name} ({c.author_role === "coach" ? "trener" : "zawodnik"}) · {c.session_title}
                      </p>
                      <p className="line-clamp-3 text-sm">{c.body}</p>
                      <p className="text-[12px] text-subtle">{formatDateTime(c.created_at)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Brak komentarzy.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // settings
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <AthleteProfileForm athleteId={athleteId} profile={athlete.profile} />
      <AthleteAccountCard athleteId={athleteId} status={athlete.link_status} from={addDaysISO(today, -27)} to={today} />
    </div>
  );
}
