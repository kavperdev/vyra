import Link from "next/link";
import { Activity, Calculator, CalendarDays, Dumbbell, Footprints, Moon, Plus, TimerReset, TrendingUp, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormCard } from "@/components/app/form-hub";
import { CourseCard } from "@/components/app/course-progress";
import { ForYou } from "@/components/app/for-you";
import { TodayPlan } from "@/components/app/today-plan";
import { PlanToday, type PlanSession } from "@/components/app/plan-today";
import { WeekStrip } from "@/components/app/week-strip";
import { HomeWeek } from "@/components/app/run-log";
import { Today } from "@/components/app/today";
import { Card, Chip, Group, Row, SectionHead } from "@/components/app/ui";
import { getCurrentUser } from "@/lib/auth";
import { challengeState, listChallenges } from "@/lib/data/challenges";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { athleteHasAccess } from "@/lib/data/access";

export const metadata = { title: "Dziś" };

export default async function AppHome() {
  const { t } = await getT();
  const supabase = await createClient();
  const [user, challenges] = await Promise.all([isSupabaseConfigured() ? getCurrentUser().catch(() => null) : null, listChallenges(supabase).catch(() => [])]);
  // Signed in: today's sessions straight from the plan (VYRA Method or the coach).
  let todays: PlanSession[] = [];
  let week: { date: string; done: boolean }[] = [];
  if (user) {
    const day = todayISO();
    const dow = (new Date(`${day}T12:00:00Z`).getUTCDay() || 7) - 1;
    const shift = (n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("training_sessions")
      .select("id, title, planned_duration_s, goal, status, kind, scheduled_date, running_workouts(planned_distance_m)")
      .eq("athlete_id", user.id)
      .gte("scheduled_date", shift(-dow))
      .lte("scheduled_date", shift(6 - dow))
      .limit(40);
    type Row = PlanSession & { scheduled_date: string; running_workouts?: { planned_distance_m: number | null } | { planned_distance_m: number | null }[] | null };
    const rows = ((data ?? []) as Row[]).map(({ running_workouts: rw, ...r }) => {
      const m = (Array.isArray(rw) ? rw[0] : rw)?.planned_distance_m;
      return { ...r, km: m ? Math.round(m / 100) / 10 : null };
    });
    todays = rows.filter((r) => r.scheduled_date === day).slice(0, 3);
    week = rows.map((r) => ({ date: r.scheduled_date, done: r.status === "completed" || r.status === "partial" }));
  }
  const athlete = user?.profile.role === "athlete";
  const paid = athlete && user ? await athleteHasAccess(supabase, user.id).catch(() => false) : !!user;
  type Synced = { sleep: number; energy: number; soreness: number; pain: boolean };
  let synced: Synced | null = null;
  if (athlete && user) {
    const { data, error } = await supabase.from("readiness").select("sleep, energy, soreness, pain").eq("athlete_id", user.id).eq("day", todayISO(user.profile.timezone)).maybeSingle();
    if (!error && data) synced = data as Synced;
  }
  const live = challenges.find((c) => c.visible && challengeState(c) !== "ended");
  const today = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Warsaw" }).format(new Date());

  const first = (user?.profile.full_name ?? "").trim().split(/\s+/)[0];
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/Warsaw" }).format(new Date()));
  const hello = hour < 11 ? t("Dzień dobry", "Good morning") : hour < 18 ? t("Cześć", "Hi") : t("Dobry wieczór", "Good evening");
  const quick = [
    { href: "/app/dziennik?add=1", icon: Plus, label: t("Dodaj trening", "Log run"), main: true },
    { href: "/app/forma", icon: Activity, label: t("Forma", "Form") },
    { href: "/app/postepy", icon: TrendingUp, label: t("Postępy", "Progress") },
    { href: paid ? "/panel" : "/app/cel", icon: CalendarDays, label: t("Plan", "Plan") },
    ...(todayISO() <= "2027-05-22" ? [{ href: "/app/nocna", icon: Moon, label: "Nocna Ekipa", main: false }] : []),
  ];

  return (
    <div className="app-rise app-wide grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-x-10">
      <div className="pt-1 lg:col-span-2">
        <p className="text-[12px] capitalize text-white/40">{today}</p>
        <h1 className="mt-0.5 text-[26px] font-semibold leading-tight tracking-[-0.02em]">
          {hello}
          {first ? `, ${first}` : ""}
        </h1>
      </div>

      <div className="grid min-w-0 grid-cols-1 content-start">
      <WeekStrip planned={week} />

      {!paid ? <TodayPlan /> : user ? <PlanToday sessions={todays} /> : null}

      {/* Shortcuts as quiet chips: the tab bar already covers the big sections. */}
      <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {quick.map((q) => (
          <Link key={q.href} href={q.href} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition active:scale-95", q.main ? "bg-[var(--accent)] text-white" : "border border-white/[0.08] bg-white/[0.04] text-white/85")}>
            <q.icon className="size-4" strokeWidth={2} />
            {q.label}
          </Link>
        ))}
      </div>

      <div className="mt-3">
        <Today synced={synced} athlete={athlete} part="ready" />
      </div>

      <SectionHead title={t("Twoja forma", "Your form")} href="/app/forma" more={t("Szczegóły", "Details")} />
      <FormCard />

      <SectionHead title={t("Dziennik", "Log")} href="/app/dziennik" more={t("Dodaj bieg", "Add run")} />
      <HomeWeek />
      </div>

      <div className="grid min-w-0 grid-cols-1 content-start lg:pt-2">

      <SectionHead title={t("Warunki do biegu", "Running conditions")} />
      <Today part="weather" />

      <ForYou />

      <SectionHead title={t("Ucz się", "Learn")} href="/app/wiedza" more={t("Wiedza", "Learn")} />
      <CourseCard />

      <SectionHead title={t("Narzędzia", "Tools")} href="/app/narzedzia" more={t("Wszystkie", "All")} />
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
        {[
          { href: "/app/biblioteka", icon: Dumbbell, title: t("Biblioteka", "Library"), sub: t("18 treningów", "18 workouts") },
          { href: "/app/narzedzia?t=paliwo", icon: Calculator, title: t("Paliwo na start", "Race fuel"), sub: t("plan żeli i picia", "gels and drinks plan") },
          { href: "/app/strategia", icon: Trophy, title: t("Strategia na start", "Race strategy"), sub: t("tempo na każdy km", "pace for every km") },
          { href: "/app/timer", icon: TimerReset, title: t("Timer interwałów", "Interval timer"), sub: t("sygnał przy każdej zmianie", "a beep at every change") },
          { href: "/app/bieg", icon: Footprints, title: t("Bieg z telefonem", "Run with phone"), sub: t("GPS, gdy nie masz zegarka", "GPS when you have no watch") },
          { href: "/app/znajomi", icon: Users, title: t("Znajomi", "Friends"), sub: t("ranking kilometrów", "kilometre ranking") },
        ].map((x) => (
          <Card key={x.href} href={x.href} className="p-4">
            <x.icon className="size-5 text-white/70" />
            <p className="mt-6 text-[15px] font-medium leading-tight">{x.title}</p>
            <p className="mt-0.5 text-[12px] text-white/45">{x.sub}</p>
          </Card>
        ))}
      </div>

      {live ? (
        <>
          <SectionHead title={t("Wyzwanie", "Challenge")} href="/app/wyzwania" more={t("Wszystkie", "All")} />
          <Group>
            <Row
              href={`/app/wyzwania/${live.slug}`}
              icon={<Trophy className="size-4" />}
              title={live.title}
              sub={`${formatDate(live.starts_on, "d.MM")} – ${formatDate(live.ends_on, "d.MM")}`}
              right={<Chip tone={challengeState(live) === "live" ? "good" : "quiet"}>{challengeState(live) === "live" ? t("trwa", "live") : t("wkrótce", "soon")}</Chip>}
            />
          </Group>
        </>
      ) : null}

      {!paid ? (
        <Card href="/app/sklep" className="mt-7 overflow-hidden p-0">
          <div className="h-32 bg-cover bg-center grayscale" style={{ backgroundImage: "url(/site/night-city.jpg)" }} />
          <div className="p-4">
            <Chip tone="accent">{t("14 dni za darmo, bez karty", "14 days free, no card")}</Chip>
            <p className="mt-2.5 text-[17px] font-semibold leading-snug">{t("VYRA Method: plan, który co tydzień dopasowuje się do Ciebie", "VYRA Method: a plan that adapts to you every week")}</p>
          </div>
        </Card>
      ) : null}
      </div>
    </div>
  );
}
