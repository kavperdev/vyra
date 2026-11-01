import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageSquare, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, HelloCard, ProgressBar, SectionTitle, Stat } from "@/components/ui/misc";
import { describeSegment, KindIcon, plannedVolume, SessionList, StatusBadge } from "@/components/training/session-bits";
import { requireRole } from "@/lib/auth";
import { addDaysISO, eachDay, todayISO, weekEndISO, weekStartISO } from "@/lib/dates";
import { listRecords } from "@/lib/data/people";
import { getSessionDetail, listRecentComments, listSessions } from "@/lib/data/sessions";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { completionStats, weeklyBuckets } from "@/lib/training/analytics";
import { categoryLabel } from "@/lib/training/categories";
import { bestRecords, formatRecordValue } from "@/lib/training/records";
import { isDone } from "@/lib/training/status";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dziś" };

export default async function AthleteDashboard() {
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const today = todayISO(user.profile.timezone);
  const weekStart = weekStartISO(today);
  const [sessions, records, coachComments] = await Promise.all([
    listSessions(supabase, { athleteIds: [user.id], from: addDaysISO(weekStart, -56), to: addDaysISO(today, 14) }),
    listRecords(supabase, user.id),
    listRecentComments(supabase, { onlyRole: "coach", limit: 3 }),
  ]);

  const todays = sessions.filter((s) => s.scheduled_date === today);
  const featured = todays.find((s) => s.status === "planned" || s.status === "in_progress") ?? todays[0];
  const featuredDetail = featured ? await getSessionDetail(supabase, featured.id) : null;
  const upcoming = sessions.filter((s) => s.scheduled_date > today && s.scheduled_date <= addDaysISO(today, 7));
  const lastDone = sessions
    .filter((s) => s.execution && isDone(s.execution.status))
    .sort((a, b) => b.execution!.performed_on.localeCompare(a.execution!.performed_on))[0];
  const comp = completionStats(sessions, addDaysISO(today, -27), today);
  const buckets = weeklyBuckets(sessions, today, 1);
  const week = buckets[0];
  const weekDays = eachDay(weekStart, weekEndISO(today));
  const weekSessions = sessions.filter((s) => s.scheduled_date >= weekStart && s.scheduled_date <= weekEndISO(today));
  const weekDone = weekSessions.filter((s) => isDone(s.status)).length;
  const prs = bestRecords(records).slice(0, 3);
  const firstName = user.profile.full_name.split(" ")[0];

  return (
    <div className="grid gap-8">
      <HelloCard
        eyebrow={formatDate(today, "EEEE, d MMMM")}
        title={`Cześć, ${firstName}`}
        tone={featured && featured.status === "planned" ? "warm" : "sky"}
        line={
          featured
            ? featured.status === "planned" || featured.status === "in_progress"
              ? `Dziś: ${featured.title}. ${weekDone}/${weekSessions.length} treningów w tym tygodniu za Tobą.`
              : `Dzisiejszy trening zapisany. ${weekDone}/${weekSessions.length} w tym tygodniu.`
            : weekSessions.length
              ? `Dziś wolne. ${weekDone}/${weekSessions.length} treningów w tym tygodniu za Tobą.`
              : "Dziś wolne."
        }
      />

      <section aria-labelledby="today-title" className="grid gap-3">
        <h2 id="today-title" className="eyebrow">Dzisiejszy trening</h2>
        {featured && featuredDetail ? (
          <Card className="overflow-hidden">
            <CardContent className="grid gap-4 pt-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <p className="flex items-center gap-2 text-[13px] text-muted">
                    <KindIcon kind={featured.kind} /> {categoryLabel(featured.category)}
                    {featured.scheduled_time ? ` · ${featured.scheduled_time.slice(0, 5)}` : ""}
                  </p>
                  <p className="display text-xl">{featured.title}</p>
                  {featuredDetail.goal ? <p className="text-sm text-muted">{featuredDetail.goal}</p> : null}
                </div>
                <StatusBadge status={featured.status} date={featured.scheduled_date} today={today} />
              </div>
              {featuredDetail.segments.length ? (
                <ul className="grid gap-1 text-sm">
                  {featuredDetail.segments.slice(0, 5).map((s) => (
                    <li key={s.id} className="num text-muted">
                      — {describeSegment(s)}
                    </li>
                  ))}
                </ul>
              ) : featuredDetail.exercises.length ? (
                <p className="text-sm text-muted">{featuredDetail.exercises.map((e) => `${e.name} (${e.sets.length})`).join(" · ")}</p>
              ) : plannedVolume(featured) ? (
                <p className="num text-sm text-muted">{plannedVolume(featured)}</p>
              ) : null}
              <Button asChild size="lg" variant={featured.status === "planned" || featured.status === "in_progress" ? "accent" : "outline"} className="w-full sm:w-fit">
                <Link href={`/athlete/sessions/${featured.id}`}>
                  {featured.status === "planned" ? "Otwórz i zapisz wykonanie" : featured.status === "in_progress" ? "Dokończ zapis" : "Zobacz podsumowanie"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {todays.length > 1 ? <p className="text-[12px] text-muted">Dziś masz {todays.length} treningi. Pozostałe są w planie tygodnia poniżej.</p> : null}
            </CardContent>
          </Card>
        ) : (
          <EmptyState title="Dziś wolne" description={upcoming[0] ? `Następny trening: ${formatDate(upcoming[0].scheduled_date, "EEEE, d MMM")} — ${upcoming[0].title}.` : "Trener nie zaplanował jeszcze kolejnych treningów."} />
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Statystyki">
        <Stat label="Ten tydzień" value={`${weekDone}/${weekSessions.length}`} hint="treningi wykonane / zaplanowane" />
        <Stat label="Kilometry w tym tyg." value={formatNumber(week?.actualKm ?? 0)} unit="km" hint={week?.plannedKm ? `plan ${formatNumber(week.plannedKm)} km` : undefined} />
        <Stat label="Realizacja 4 tyg." value={comp.rate == null ? "–" : `${comp.rate}%`} hint={`${comp.done} z ${comp.due} treningów`} href="/athlete/progress" />
        <Stat label="Ostatni trening" value={lastDone ? formatDate(lastDone.execution!.performed_on, "d MMM") : "–"} hint={lastDone?.title} href={lastDone ? `/athlete/sessions/${lastDone.id}` : undefined} />
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="grid content-start gap-3">
          <SectionTitle action={<Link href="/athlete/calendar" className="text-[13px] text-muted hover:text-foreground">Kalendarz</Link>}>Plan tygodnia</SectionTitle>
          <ol className="grid gap-1.5">
            {weekDays.map((d) => {
              const items = weekSessions.filter((s) => s.scheduled_date === d);
              return (
                <li key={d} className={cn("grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3 rounded-md border border-border bg-surface px-3 py-2.5", d === today && "border-accent/60")}>
                  <span className={cn("text-[13px] capitalize", d === today ? "font-semibold text-accent" : "text-muted")}>{formatDate(d, "EEE d")}</span>
                  {items.length ? (
                    <div className="grid gap-1.5">
                      {items.map((s) => (
                        <Link key={s.id} href={`/athlete/sessions/${s.id}`} className="flex min-w-0 items-center justify-between gap-2 hover:underline">
                          <span className="truncate text-sm">{s.title}</span>
                          <StatusBadge status={s.status} date={s.scheduled_date} today={today} />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[13px] text-subtle">wolne</span>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="grid gap-1.5 pt-1">
            <ProgressBar value={weekSessions.length ? (weekDone / weekSessions.length) * 100 : 0} tone="accent" />
          </div>
        </section>

        <div className="grid content-start gap-8">
          <section className="grid gap-3">
            <SectionTitle>Najbliższe treningi</SectionTitle>
            <SessionList sessions={upcoming.slice(0, 5)} hrefFor={(s) => `/athlete/sessions/${s.id}`} today={today} empty={<p className="text-sm text-muted">Brak treningów w najbliższych 7 dniach.</p>} />
          </section>

          <section className="grid gap-3">
            <SectionTitle>Od trenera</SectionTitle>
            {coachComments.length ? (
              <ul className="grid gap-2">
                {coachComments.map((c) => (
                  <li key={c.id}>
                    <Link href={`/athlete/sessions/${c.session_id}`} className="grid gap-1 rounded-md border border-border border-l-2 border-l-accent bg-surface p-3 hover:border-border-strong">
                      <p className="flex items-center gap-1.5 text-[12px] text-muted">
                        <MessageSquare className="size-3.5" /> {c.session_title}
                      </p>
                      <p className="line-clamp-3 text-sm">{c.body}</p>
                      <p className="text-[12px] text-subtle">{formatDateTime(c.created_at)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Brak nowych komentarzy trenera.</p>
            )}
          </section>

          <section className="grid gap-3">
            <SectionTitle action={<Link href="/athlete/records" className="text-[13px] text-muted hover:text-foreground">Wszystkie</Link>}>Rekordy</SectionTitle>
            {prs.length ? (
              <ul className="grid gap-2">
                {prs.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm">
                      <Trophy className="size-3.5 text-accent" /> {r.label}
                    </span>
                    <span className="num text-sm font-semibold">{formatRecordValue(r)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Dodaj swoje rekordy, by śledzić postęp.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
