import Link from "next/link";
import { Activity, ArrowUpRight, Calculator, CalendarDays, Dumbbell, Footprints, Play, Plus, TimerReset, TrendingUp, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormCard } from "@/components/app/form-hub";
import { CourseCard } from "@/components/app/course-progress";
import { ForYou } from "@/components/app/for-you";
import { TodayPlan } from "@/components/app/today-plan";
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
  let todays: { id: string; title: string; planned_duration_s: number | null; goal: string | null }[] = [];
  if (user) {
    const { data } = await supabase
      .from("training_sessions")
      .select("id, title, planned_duration_s, goal")
      .eq("athlete_id", user.id)
      .eq("scheduled_date", todayISO())
      .limit(3);
    todays = (data ?? []) as typeof todays;
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
    { href: paid ? "/panel" : "/app/trening", icon: CalendarDays, label: t("Plan", "Plan") },
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
      {/* The heart of the app: what the runs mean, today. */}
      <div className="mt-4 lg:mt-6">
        <FormCard />
      </div>

      {/* The four things people open the app for, always one tap away. */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {quick.map((q) => (
          <Link key={q.href} href={q.href} className={cn("flex flex-col items-center gap-1.5 rounded-[18px] py-3 text-[11.5px] font-medium transition active:scale-95", q.main ? "bg-[var(--accent)] text-white shadow-[0_10px_30px_-10px_rgba(229,52,59,0.8)]" : "bg-white/[0.06] text-white/85")}>
            <q.icon className="size-[22px]" strokeWidth={1.9} />
            {q.label}
          </Link>
        ))}
      </div>

      {!paid ? (
        <TodayPlan />
      ) : user ? (
        todays.length ? (
          <>
            <SectionHead title={t("Twój trening na dziś", "Today's session")} href="/panel" more={t("Plan", "Plan")} />
            {todays.map((s) => (
              <Link key={s.id} href={`/athlete/sessions/${s.id}`} className="app-sheen mb-2 block rounded-[22px] bg-white px-4 py-4 text-black shadow-[0_18px_50px_-18px_rgba(229,52,59,0.55)] transition active:scale-[0.985]">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-[17px] font-semibold leading-snug">{s.title}</span>
                    {s.goal ? <span className="mt-0.5 line-clamp-2 block text-[13px] text-black/55">{s.goal}</span> : null}
                  </span>
                  {s.planned_duration_s ? <span className="shrink-0 rounded-full bg-black/[0.07] px-2.5 py-1 text-[12px] font-medium tabular-nums">{Math.round(s.planned_duration_s / 60)} min</span> : null}
                </span>
                <span className="mt-3 flex items-center justify-center gap-2 rounded-full bg-black py-3 text-[14px] font-semibold text-white">
                  <Play className="size-4" /> {t("Otwórz trening", "Open session")}
                </span>
              </Link>
            ))}
          </>
        ) : (
          <Link href="/panel" className="mt-6 flex items-center justify-between rounded-[20px] border border-white/[0.06] bg-[#111113] px-4 py-4 transition active:scale-[0.985]">
            <span>
              <span className="block text-[12px] text-white/45">{t("Twój plan", "Your plan")}</span>
              <span className="block text-[15px] font-medium">{t("Dziś dzień bez treningu. Zobacz cały tydzień", "Rest day. See your week")}</span>
            </span>
            <ArrowUpRight className="size-5 text-white/50" />
          </Link>
        )
      ) : null}

      <div className="mt-3">
        <Today synced={synced} athlete={athlete} part="ready" />
      </div>

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
