import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight, MessageSquare, Play, Trophy } from "lucide-react";
import { describeSegment, KindIcon, plannedVolume, StatusBadge } from "@/components/training/session-bits";
import { ReadinessCard } from "@/components/athlete/readiness-card";
import { RaceCountdownCard } from "@/components/athlete/race-countdown";
import { FormWeekCard } from "@/components/athlete/form-week-card";
import { formIndex, intensitySplit } from "@/lib/training/form-index";
import { WorkoutChart } from "@/components/training/workout-chart";
import { raceCountdown } from "@/lib/training/race";
import { requireRole } from "@/lib/auth";
import type { Readiness } from "@/lib/readiness";
import { addDaysISO, eachDay, todayISO, weekEndISO, weekStartISO } from "@/lib/dates";
import { listGoals, listRecords } from "@/lib/data/people";
import { getSessionDetail, listRecentComments, listSessions } from "@/lib/data/sessions";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { completionStats, weeklyBuckets } from "@/lib/training/analytics";
import { categoryLabel } from "@/lib/training/categories";
import { bestRecords, formatRecordValue } from "@/lib/training/records";
import { isDone } from "@/lib/training/status";
import { createClient } from "@/lib/supabase/server";
import { ensureWeeks, loadMethod } from "@/lib/method/server";
import { cn } from "@/lib/utils";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Dziś", "Today") };
}

export default async function AthleteDashboard() {
  await getLang();
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const today = todayISO(user.profile.timezone);
  const weekStart = weekStartISO(today);
  // VYRA Method: this week's plan is generated before the calendar is read (null before the migration).
  const method = await loadMethod(supabase, user.id).catch(() => null);
  if (method?.access && method.profile) await ensureWeeks(supabase, user.id, method).catch((e) => console.error("[method]", e));
  const methodSetup = !!method && method.access === true && !method.profile;
  const [sessions, records, coachComments, readiness, intakeMissing, lastWeekReadiness, membershipEnded, goals, feedbackDue] = await Promise.all([
    listSessions(supabase, { athleteIds: [user.id], from: addDaysISO(weekStart, -70), to: addDaysISO(today, 14) }),
    listRecords(supabase, user.id),
    listRecentComments(supabase, { onlyRole: "coach", limit: 3 }),
    // Missing table (migration not run yet) simply hides the check-in.
    supabase
      .from("readiness")
      .select("*")
      .eq("athlete_id", user.id)
      .eq("day", today)
      .maybeSingle()
      .then((r) => (r.error ? undefined : ((r.data as Readiness | null) ?? null))),
    // Onboarding questionnaire not sent yet (hidden if the migration has not run).
    supabase
      .from("athlete_profiles")
      .select("intake_done_at")
      .eq("athlete_id", user.id)
      .maybeSingle()
      .then((r) => !r.error && !(r.data as { intake_done_at: string | null } | null)?.intake_done_at),
    supabase
      .from("readiness")
      .select("sleep, energy, soreness, pain")
      .eq("athlete_id", user.id)
      .gte("day", addDaysISO(weekStart, -7))
      .lt("day", weekStart)
      .then((r) => (r.error ? [] : ((r.data ?? []) as Pick<Readiness, "sleep" | "energy" | "soreness" | "pain">[]))),
    // A bought package that has ended (cancelled or run out): offer to come back.
    supabase
      .from("memberships")
      .select("status")
      .then((r) => {
        const rows = (r.error ? [] : (r.data ?? [])) as { status: string }[];
        return rows.length > 0 && rows.every((m) => m.status === "ended");
      }),
    listGoals(supabase, user.id).catch(() => []),
    // After 4 weeks with the coach: ask once for feedback (hidden if the migration has not run).
    Promise.all([
      supabase.from("coach_athletes").select("created_at").eq("athlete_id", user.id).eq("status", "active").order("created_at").limit(1),
      supabase.from("athlete_feedback").select("id", { count: "exact", head: true }).eq("athlete_id", user.id),
    ]).then(([link, fb]) => {
      const since = (link.data as { created_at: string }[] | null)?.[0]?.created_at;
      return !fb.error && (fb.count ?? 0) === 0 && !!since && Date.now() - Date.parse(since) >= 28 * 86_400_000;
    }),
  ]);
  const race = raceCountdown(goals, today);

  const todays = sessions.filter((s) => s.scheduled_date === today);
  const featured = todays.find((s) => s.status === "planned" || s.status === "in_progress") ?? todays[0];
  const featuredDetail = featured ? await getSessionDetail(supabase, featured.id) : null;
  const upcoming = sessions.filter((s) => s.scheduled_date > today && s.scheduled_date <= addDaysISO(today, 7));
  const comp = completionStats(sessions, addDaysISO(today, -27), today);
  const buckets = weeklyBuckets(sessions, today, 8);
  const week = buckets[buckets.length - 1];
  const last = buckets[buckets.length - 2];
  const prev = buckets[buckets.length - 3];
  // Consecutive finished weeks with at least 80% of planned sessions done.
  let streak = 0;
  for (let i = buckets.length - 2; i >= 0; i--) {
    const b = buckets[i];
    if (!b.plannedSessions || b.doneSessions / b.plannedSessions < 0.8) break;
    streak++;
  }
  const lastReady = lastWeekReadiness.length
    ? Math.round((lastWeekReadiness.reduce((n, r) => n + r.sleep + r.energy + (6 - r.soreness), 0) / lastWeekReadiness.length / 15) * 100)
    : null;
  const kmTrend = last && prev && prev.actualKm > 0 ? Math.round(((last.actualKm - prev.actualKm) / prev.actualKm) * 100) : null;
  const weekDays = eachDay(weekStart, weekEndISO(today));
  const weekSessions = sessions.filter((s) => s.scheduled_date >= weekStart && s.scheduled_date <= weekEndISO(today));
  const weekDone = weekSessions.filter((s) => isDone(s.status)).length;
  const prs = bestRecords(records).slice(0, 3);
  const form = formIndex(sessions, today);
  const split = intensitySplit(sessions, weekStart, today);
  const firstName = user.profile.full_name.split(" ")[0];

  const card = "rounded-[20px] border border-border bg-surface";
  const primary = "flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[15px] font-semibold text-background transition active:scale-[0.98]";
  const secondary = "flex h-12 items-center justify-center gap-2 rounded-full bg-surface-2 px-5 text-[15px] font-medium transition active:scale-[0.98]";
  const Head = ({ title, href, more }: { title: string; href?: string; more?: string }) => (
    <div className="flex items-baseline justify-between px-1 pb-2 pt-6">
      <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
      {href ? (
        <Link href={href} className="text-[13px] text-muted active:opacity-60">
          {more}
        </Link>
      ) : null}
    </div>
  );
  const Notice = ({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) => (
    <div className={cn(card, "grid gap-3 p-4")}>
      <div>
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{text}</p>
      </div>
      <Link href={href} className={primary}>
        {cta} <ArrowRight className="size-4" />
      </Link>
    </div>
  );

  return (
    <div className="app-rise grid grid-cols-1 gap-3 lg:max-w-3xl">
      <div className="pb-2 pt-1">
        <p className="text-[13px] capitalize text-muted">{formatDate(today, "EEEE, d MMMM")}</p>
        <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-[-0.02em]">{tl(`Cześć, ${firstName}`, `Hi, ${firstName}`)}</h1>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">
          {featured
            ? featured.status === "planned" || featured.status === "in_progress"
              ? tl(`Dziś: ${featured.title}.`, `Today: ${featured.title}.`)
              : tl("Dzisiejszy trening zapisany.", "Today’s session is logged.")
            : tl("Dziś wolne.", "Rest day today.")}{" "}
          {weekSessions.length ? tl(`${weekDone} z ${weekSessions.length} w tym tygodniu.`, `${weekDone} of ${weekSessions.length} this week.`) : ""}
        </p>
      </div>

      {membershipEnded ? (
        <Notice title={tl("Twój pakiet się zakończył", "Your package has ended")} text={tl("Historia treningów i rekordy zostają. Wybierz pakiet, żeby wrócić do planu.", "Your history and records stay. Choose a package to get back to your plan.")} href="/app/sklep" cta={tl("Wróć do planu", "Resume")} />
      ) : null}
      {methodSetup ? <Notice title="Pierwszy krok: ankieta VYRA Method" text="Około 4 minut. Na tej podstawie powstanie Twój pierwszy tydzień." href="/athlete/metoda" cta="Ułóż mój plan" /> : null}
      {intakeMissing && !method?.access ? (
        <Notice title={tl("Pierwszy krok: ankieta startowa", "First step: questionnaire")} text={tl("5 minut. Cel, doświadczenie, kalendarz i zdrowie. Na tej podstawie trener ułoży Twój plan.", "5 minutes. Your coach builds your plan from it.")} href="/athlete/ankieta" cta={tl("Wypełnij ankietę", "Fill it in")} />
      ) : null}
      {feedbackDue ? <Notice title={tl("Minął pierwszy miesiąc. Jak Ci się trenuje?", "Your first month is done. How is it going?")} text={tl("2 minuty, szczerze. Pomaga nam prowadzić Cię lepiej.", "2 minutes, honestly.")} href="/athlete/opinia" cta={tl("Daj znać", "Tell us")} /> : null}

      {/* Today's session first: it is why the athlete opens the app. */}
      {featured && featuredDetail ? (
        <div className={cn(card, "grid gap-4 p-4")}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
                <KindIcon kind={featured.kind} /> {tl("Dziś", "Today")} · {categoryLabel(featured.category)}
                {featured.scheduled_time ? ` · ${featured.scheduled_time.slice(0, 5)}` : ""}
              </p>
              <p className="mt-1 text-[22px] font-semibold leading-tight tracking-tight">{featured.title}</p>
              {featuredDetail.goal ? <p className="mt-1 text-[13.5px] text-muted">{featuredDetail.goal}</p> : null}
            </div>
            <StatusBadge status={featured.status} date={featured.scheduled_date} today={today} />
          </div>
          {featuredDetail.segments.length ? <WorkoutChart segments={featuredDetail.segments} compact /> : null}
          {featuredDetail.segments.length ? (
            <ul className="grid gap-1.5">
              {featuredDetail.segments.slice(0, 5).map((s) => (
                <li key={s.id} className="num rounded-[12px] bg-surface-2 px-3 py-2 text-[13.5px]">
                  {describeSegment(s)}
                </li>
              ))}
            </ul>
          ) : featuredDetail.exercises.length ? (
            <p className="text-[13.5px] text-muted">{featuredDetail.exercises.map((e) => `${e.name} (${e.sets.length})`).join(" · ")}</p>
          ) : plannedVolume(featured) ? (
            <p className="num text-[13.5px] text-muted">{plannedVolume(featured)}</p>
          ) : null}
          <div className="grid gap-2">
            {featured.status === "planned" && (featuredDetail.segments.length || featuredDetail.exercises.length) ? (
              <Link href={`/athlete/sessions/${featured.id}?start=1`} className={primary}>
                <Play className="size-4" /> {tl("Zacznij trening", "Start workout")}
              </Link>
            ) : null}
            <Link
              href={`/athlete/sessions/${featured.id}`}
              className={(featured.status === "planned" && !(featuredDetail.segments.length || featuredDetail.exercises.length)) || featured.status === "in_progress" ? primary : secondary}
            >
              {featured.status === "planned" ? tl("Zapisz wykonanie", "Log result") : featured.status === "in_progress" ? tl("Dokończ zapis", "Finish logging") : tl("Zobacz podsumowanie", "View summary")}
            </Link>
          </div>
          {todays.length > 1 ? <p className="text-[12px] text-muted">{tl(`Dziś masz ${todays.length} treningi. Reszta w planie tygodnia.`, `${todays.length} sessions today. The rest is in the week below.`)}</p> : null}
        </div>
      ) : (
        <div className={cn(card, "p-4")}>
          <p className="text-[12.5px] text-muted">{tl("Dziś", "Today")}</p>
          <p className="mt-1 text-[22px] font-semibold tracking-tight">{tl("Wolne", "Rest day")}</p>
          <p className="mt-1 text-[13.5px] text-muted">
            {upcoming[0] ? tl(`Następny: ${formatDate(upcoming[0].scheduled_date, "EEEE, d MMM")} · ${upcoming[0].title}`, `Next: ${formatDate(upcoming[0].scheduled_date, "EEEE, d MMM")} · ${upcoming[0].title}`) : tl("Kolejne treningi pojawią się tutaj.", "Next sessions will appear here.")}
          </p>
        </div>
      )}

      {readiness !== undefined ? <ReadinessCard today={readiness} /> : null}
      {intakeMissing && !method?.access ? null : <RaceCountdownCard race={race} goalsHref="/athlete/records" />}

      <Head title={tl("Ten tydzień", "This week")} href="/athlete/calendar" more={tl("Kalendarz", "Calendar")} />
      <div className={cn(card, "overflow-hidden")}>
        <div className="flex items-center gap-3 px-4 pt-4">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${weekSessions.length ? (weekDone / weekSessions.length) * 100 : 0}%` }} />
          </div>
          <span className="num text-[12.5px] text-muted">
            {weekDone}/{weekSessions.length}
          </span>
        </div>
        <ol className="mt-2 divide-y divide-border">
          {weekDays.map((d) => {
            const items = weekSessions.filter((x) => x.scheduled_date === d);
            return (
              <li key={d} className="flex items-start gap-3 px-4 py-3">
                <span className={cn("w-12 shrink-0 pt-0.5 text-[12.5px] capitalize", d === today ? "font-semibold text-accent" : "text-muted")}>{formatDate(d, "EEE d")}</span>
                {items.length ? (
                  <div className="grid min-w-0 flex-1 gap-2">
                    {items.map((x) => (
                      <Link key={x.id} href={`/athlete/sessions/${x.id}`} className="flex min-w-0 items-center gap-2 active:opacity-60">
                        <span className={cn("min-w-0 flex-1 truncate text-[14.5px]", isDone(x.status) && "text-muted line-through")}>{x.title}</span>
                        {isDone(x.status) ? <Check className="size-4 shrink-0 text-done" /> : <ChevronRight className="size-4 shrink-0 text-subtle" />}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <span className="text-[13.5px] text-subtle">{tl("wolne", "rest")}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        {[
          [tl("Kilometry", "Distance"), `${formatNumber(week?.actualKm ?? 0)} km`, week?.plannedKm ? `plan ${formatNumber(week.plannedKm)} km` : tl("w tym tygodniu", "this week"), "/athlete/progress"],
          [tl("Realizacja 4 tyg.", "4-week completion"), comp.rate == null ? "–" : `${comp.rate}%`, tl(`${comp.done} z ${comp.due} treningów`, `${comp.done} of ${comp.due}`), "/athlete/progress"],
        ].map(([k, v, h, href]) => (
          <Link key={k} href={href} className={cn(card, "p-4 active:scale-[0.985]")}>
            <p className="text-[12px] text-muted">{k}</p>
            <p className="num mt-1 text-[26px] font-light leading-none tracking-tight">{v}</p>
            <p className="mt-1.5 truncate text-[12px] text-subtle">{h}</p>
          </Link>
        ))}
      </div>

      <FormWeekCard form={form} split={split} week={week} buckets={buckets} />

      {last && last.plannedSessions > 0 ? (
        <>
          <Head title={tl("Poprzedni tydzień", "Last week")} />
          <div className={cn(card, "grid gap-4 p-4")}>
            {streak >= 2 ? <span className="w-fit rounded-full bg-accent/15 px-3 py-1 text-[12px] font-semibold text-accent">🔥 {tl(`${streak} tygodnie z rzędu na planie`, `${streak} weeks in a row on plan`)}</span> : null}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[12px] text-muted">{tl("Treningi", "Sessions")}</p>
                <p className="num mt-0.5 text-[22px] font-light">
                  {last.doneSessions}/{last.plannedSessions}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-muted">{tl("Kilometry", "Distance")}</p>
                <p className="num mt-0.5 text-[22px] font-light">{formatNumber(last.actualKm)} km</p>
                {kmTrend != null ? (
                  <p className={cn("num text-[12px]", kmTrend >= 0 ? "text-done" : "text-muted")}>
                    {kmTrend >= 0 ? "+" : ""}
                    {kmTrend}%
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-[12px] text-muted">{tl("Czas biegu", "Running time")}</p>
                <p className="num mt-0.5 text-[22px] font-light">
                  {Math.floor(last.runningSeconds / 3600)}:{String(Math.round((last.runningSeconds % 3600) / 60)).padStart(2, "0")} h
                </p>
              </div>
              <div>
                <p className="text-[12px] text-muted">{tl("Gotowość", "Readiness")}</p>
                <p className="num mt-0.5 text-[22px] font-light">{lastReady != null ? `${lastReady}%` : "–"}</p>
              </div>
            </div>
            <p className="text-[13.5px] leading-relaxed text-muted">
              {last.doneSessions >= last.plannedSessions
                ? tl("Cały plan wykonany. Tak buduje się formę: tydzień po tygodniu.", "The whole plan done. This is how form is built.")
                : last.doneSessions / last.plannedSessions >= 0.8
                  ? tl("Bardzo dobry tydzień. Regularność to Twoja największa przewaga.", "A very good week. Consistency is your advantage.")
                  : tl("Nie wszystko wyszło? Napisz trenerowi, co przeszkodziło. Plan dopasujemy do życia.", "Didn’t go to plan? Tell your coach what got in the way.")}
            </p>
          </div>
        </>
      ) : null}

      {upcoming.length ? (
        <>
          <Head title={tl("Najbliższe treningi", "Upcoming")} />
          <div className={cn(card, "divide-y divide-border overflow-hidden")}>
            {upcoming.slice(0, 5).map((x) => (
              <Link key={x.id} href={`/athlete/sessions/${x.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-surface-2">
                <span className="w-12 shrink-0 text-[12.5px] capitalize text-muted">{formatDate(x.scheduled_date, "EEE d")}</span>
                <span className="min-w-0 flex-1 truncate text-[14.5px]">{x.title}</span>
                <ChevronRight className="size-4 shrink-0 text-subtle" />
              </Link>
            ))}
          </div>
        </>
      ) : null}

      {coachComments.length ? (
        <>
          <Head title={tl("Od trenera", "From your coach")} />
          <div className="grid gap-2">
            {coachComments.map((c) => (
              <Link key={c.id} href={`/athlete/sessions/${c.session_id}`} className={cn(card, "grid gap-1 p-4 active:scale-[0.985]")}>
                <p className="flex items-center gap-1.5 text-[12px] text-muted">
                  <MessageSquare className="size-3.5" /> {c.session_title}
                </p>
                <p className="line-clamp-3 text-[14px] leading-relaxed">{c.body}</p>
                <p className="text-[11.5px] text-subtle">{formatDateTime(c.created_at)}</p>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <Head title={tl("Rekordy", "Records")} href="/athlete/records" more={tl("Wszystkie", "All")} />
      {prs.length ? (
        <div className={cn(card, "divide-y divide-border overflow-hidden")}>
          {prs.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3">
              <span className="flex items-center gap-2 text-[14.5px]">
                <Trophy className="size-4 text-accent" /> {r.label}
              </span>
              <span className="num text-[15px] font-semibold">{formatRecordValue(r)}</span>
            </div>
          ))}
        </div>
      ) : (
        <Link href="/athlete/records" className={cn(card, "block p-4 text-[13.5px] text-muted")}>
          {tl("Dodaj swoje rekordy, żeby śledzić postęp.", "Add your records to track progress.")}
        </Link>
      )}
    </div>
  );
}
