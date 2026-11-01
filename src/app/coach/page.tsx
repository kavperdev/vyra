import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, HelloCard, Initials, PageHeader, SectionTitle, Stat } from "@/components/ui/misc";
import { CompletionChart, VolumeChart } from "@/components/charts/charts";
import { SessionList } from "@/components/training/session-bits";
import { requireRole } from "@/lib/auth";
import { addDaysISO, todayISO, weekStartISO } from "@/lib/dates";
import { listAthletes } from "@/lib/data/people";
import { listRecentComments, listSessions } from "@/lib/data/sessions";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { completionStats, periodStart, weeklyBuckets } from "@/lib/training/analytics";
import { displayStatus } from "@/lib/training/status";
import { canPlan, type SessionSummary } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Pulpit trenera", "Coach dashboard") };
}

interface Attention {
  athleteId: string;
  name: string;
  reasons: string[];
}

/** Transparent rules, each shown as the reason on the card. */
function attentionFor(athletes: { id: string; full_name: string }[], sessions: SessionSummary[], today: string): Attention[] {
  const from14 = addDaysISO(today, -14);
  const from7 = addDaysISO(today, -7);
  const out: Attention[] = [];
  for (const a of athletes) {
    const mine = sessions.filter((s) => s.athlete_id === a.id);
    const recent = mine.filter((s) => s.scheduled_date >= from14 && s.scheduled_date <= today);
    const reasons: string[] = [];
    const missing = recent.filter((s) => displayStatus(s.status, s.scheduled_date, today) === "needs_update").length;
    const skipped = recent.filter((s) => s.status === "skipped").length;
    if (missing >= 2) reasons.push(`${missing} treningi bez wpisu (14 dni)`);
    if (skipped >= 2) reasons.push(`${skipped} pominięte treningi (14 dni)`);
    const plannedWeek = mine.filter((s) => s.scheduled_date >= from7 && s.scheduled_date <= today).length;
    const loggedWeek = mine.filter((s) => s.execution && s.execution.performed_on >= from7).length;
    if (plannedWeek >= 2 && loggedWeek === 0) reasons.push("brak zapisanych treningów od 7 dni");
    const highRpe = recent.filter((s) => (s.execution?.rpe ?? 0) >= 9).length;
    if (highRpe >= 2) reasons.push(`${highRpe} treningi z RPE ≥ 9 (14 dni)`);
    const upcoming = mine.filter((s) => s.scheduled_date > today && s.scheduled_date <= addDaysISO(today, 7)).length;
    if (upcoming === 0) reasons.push("brak treningów na najbliższy tydzień");
    if (reasons.length) out.push({ athleteId: a.id, name: a.full_name, reasons });
  }
  return out.sort((x, y) => y.reasons.length - x.reasons.length);
}

export default async function CoachDashboard() {
  await getLang();
  const user = await requireRole("coach");
  const supabase = await createClient();
  const today = todayISO(user.profile.timezone);
  const athletes = (await listAthletes(supabase, user.id)).filter((a) => a.link_status === "active");

  if (!athletes.length) {
    return (
      <div className="grid gap-8">
        <PageHeader eyebrow="Pulpit" title={`Cześć, ${user.profile.full_name.split(" ")[0]}`} />
        <EmptyState
          title="Zacznij od zaproszenia zawodnika"
          description="Wyślij zaproszenie, a po dołączeniu zawodnika zaplanujesz mu pierwszy trening. Pulpit pokaże wtedy treningi na dziś, realizację planów i zawodników, którzy wymagają uwagi."
          action={
            <Button asChild>
              <Link href="/coach/athletes?invite=1">Zaproś zawodnika</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const ids = athletes.map((a) => a.id);
  const from = periodStart(today, 8);
  const [sessions, comments] = await Promise.all([
    listSessions(supabase, { athleteIds: ids, from, to: addDaysISO(today, 14) }),
    listRecentComments(supabase, { onlyRole: "athlete", limit: 5 }),
  ]);

  const todays = sessions.filter((s) => s.scheduled_date === today);
  const weekStart = weekStartISO(today);
  const thisWeek = sessions.filter((s) => s.scheduled_date >= weekStart && s.scheduled_date <= addDaysISO(weekStart, 6));
  const doneWeek = thisWeek.filter((s) => s.status === "completed" || s.status === "partial").length;
  const awaiting = sessions.filter((s) => displayStatus(s.status, s.scheduled_date, today) === "needs_update" && s.scheduled_date >= addDaysISO(today, -14));
  const comp = completionStats(sessions, addDaysISO(today, -27), today);
  const buckets = weeklyBuckets(sessions, today, 8);
  const weekKm = buckets[buckets.length - 1]?.actualKm ?? 0;
  const attention = attentionFor(athletes, sessions, today);
  const recentDone = sessions
    .filter((s) => s.execution && s.execution.status !== "in_progress")
    .sort((a, b) => (b.execution!.performed_on + b.scheduled_date).localeCompare(a.execution!.performed_on + a.scheduled_date))
    .slice(0, 6);
  const upcoming = sessions.filter((s) => s.scheduled_date > today).slice(0, 6);

  return (
    <div className="grid gap-8">
      <HelloCard
        eyebrow={formatDate(today, "EEEE, d MMMM")}
        title={`Cześć, ${user.profile.full_name.split(" ")[0]}`}
        line={`Dziś ${todays.length ? `${todays.length} ${todays.length === 1 ? "trening" : todays.length < 5 ? "treningi" : "treningów"} w planie` : "brak treningów w planie"}${awaiting.length ? ` · ${awaiting.length} do uzupełnienia` : ""}${attention.length ? ` · ${attention.length} ${attention.length === 1 ? "zawodnik wymaga" : "zawodników wymaga"} uwagi` : ""}.`}
        actions={
          canPlan(user.profile.staff_role) ? (
            <Button asChild variant="accent">
              <Link href="/coach/sessions/new">
                <Plus className="size-4" /> Nowy trening
              </Link>
            </Button>
          ) : undefined
        }
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Najważniejsze statystyki">
        <Stat label="Aktywni zawodnicy" value={athletes.length} href="/coach/athletes" />
        <Stat label="Treningi dziś" value={todays.length} href={`/coach/calendar?view=day&date=${today}`} />
        <Stat label="Wykonane w tym tygodniu" value={doneWeek} hint={`z ${thisWeek.length} zaplanowanych`} />
        <Stat label="Do uzupełnienia" value={awaiting.length} tone={awaiting.length ? "warning" : "default"} hint="ostatnie 14 dni" href="/coach/calendar?status=needs_update&view=list" />
        <Stat label="Realizacja 4 tyg." value={comp.rate == null ? "–" : `${comp.rate}%`} hint={`${comp.done}/${comp.due} treningów`} />
        <Stat label="Kilometry w tym tyg." value={formatNumber(weekKm)} unit="km" hint="wszyscy zawodnicy" />
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-8">
          <section className="grid gap-3">
            <SectionTitle action={<Link href={`/coach/calendar?view=day&date=${today}`} className="text-[13px] text-muted hover:text-foreground">Kalendarz</Link>}>
              Dzisiaj
            </SectionTitle>
            <SessionList
              sessions={todays}
              hrefFor={(s) => `/coach/sessions/${s.id}`}
              today={today}
              showAthlete
              empty={<EmptyState title="Na dziś nic nie zaplanowano" description="Zawodnicy mają dzień wolny albo plan jeszcze nie jest rozpisany." />}
            />
          </section>

          <section className="grid gap-3">
            <SectionTitle>Ostatnio wykonane</SectionTitle>
            <SessionList
              sessions={recentDone}
              hrefFor={(s) => `/coach/sessions/${s.id}`}
              today={today}
              showAthlete
              empty={<EmptyState title="Brak zapisanych wyników" description="Gdy zawodnicy uzupełnią treningi, zobaczysz tu ich wyniki." />}
            />
          </section>

          <section className="grid gap-3">
            <SectionTitle>Najbliższe treningi</SectionTitle>
            <SessionList sessions={upcoming} hrefFor={(s) => `/coach/sessions/${s.id}`} today={today} showAthlete empty={<EmptyState title="Brak zaplanowanych treningów" description="Zaplanuj treningi na najbliższe dni." />} />
          </section>
        </div>

        <div className="grid content-start gap-8">
          <section className="grid gap-3">
            <SectionTitle>Wymagają uwagi</SectionTitle>
            {attention.length ? (
              <ul className="grid gap-2">
                {attention.map((a) => (
                  <li key={a.athleteId}>
                    <Link href={`/coach/athletes/${a.athleteId}`} className="flex gap-3 rounded-lg border border-warning/30 bg-surface p-3 hover:border-warning/60">
                      <Initials name={a.name} size="sm" />
                      <div className="grid min-w-0 gap-1">
                        <p className="text-sm font-semibold">{a.name}</p>
                        <ul className="grid gap-0.5">
                          {a.reasons.map((r) => (
                            <li key={r} className="flex items-center gap-1.5 text-[13px] text-warning">
                              <AlertTriangle className="size-3.5 shrink-0" /> {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">Wszyscy zawodnicy realizują plan bez sygnałów ostrzegawczych.</p>
            )}
          </section>

          <section className="grid gap-3">
            <SectionTitle>Komentarze zawodników</SectionTitle>
            {comments.length ? (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
                {comments.map((c) => (
                  <li key={c.id}>
                    <Link href={`/coach/sessions/${c.session_id}`} className="grid gap-1 px-4 py-3 hover:bg-surface-2">
                      <p className="flex items-center gap-2 text-[13px] text-muted">
                        <MessageSquare className="size-3.5" /> {c.author_name} · {c.session_title}
                      </p>
                      <p className="line-clamp-2 text-sm">{c.body}</p>
                      <p className="text-[12px] text-subtle">{formatDateTime(c.created_at)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Brak nowych komentarzy.</p>
            )}
          </section>

          <section className="grid gap-3">
            <SectionTitle>Brakujące wpisy</SectionTitle>
            <SessionList
              sessions={awaiting.slice(0, 6)}
              hrefFor={(s) => `/coach/sessions/${s.id}`}
              today={today}
              showAthlete
              empty={<p className="text-sm text-muted">Wszystkie minione treningi są uzupełnione.</p>}
            />
          </section>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2" aria-label="Analityka zespołu">
        <Card>
          <CardHeader>
            <CardTitle>Realizacja planów zespołu</CardTitle>
            <span className="text-[12px] text-muted">8 tygodni</span>
          </CardHeader>
          <CardContent>
            <CompletionChart data={buckets.map((b) => ({ weekStart: b.weekStart, completion: b.completion, doneSessions: b.doneSessions, dueSessions: b.dueSessions }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Objętość biegowa zespołu</CardTitle>
            <Link href="/coach/analytics" className="text-[12px] text-muted hover:text-foreground">
              Pełna analityka
            </Link>
          </CardHeader>
          <CardContent>
            <VolumeChart data={buckets.map((b) => ({ weekStart: b.weekStart, plannedKm: b.plannedKm, actualKm: b.actualKm }))} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
