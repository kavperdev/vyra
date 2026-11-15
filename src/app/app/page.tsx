import Link from "next/link";
import { ArrowUpRight, Calculator, Dumbbell, Footprints, Timer, TimerReset, Trophy } from "lucide-react";
import { CourseCard } from "@/components/app/course-progress";
import { ForYou } from "@/components/app/for-you";
import { GoalCountdown } from "@/components/app/goal-plan";
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

  return (
    <div className="app-rise grid grid-cols-1">
      <p className="pt-1 text-center text-[12px] capitalize text-white/40">{today}</p>
      <Today synced={synced} athlete={athlete} />
      <GoalCountdown />

      {user && !paid ? (
        <Link href="/app/plan" className="mt-6 flex items-center justify-between rounded-[20px] border border-white/[0.06] bg-[#111113] px-4 py-4 transition active:scale-[0.985]">
          <span>
            <span className="block text-[12px] text-white/45">{t("Twój darmowy plan", "Your free plan")}</span>
            <span className="block text-[15px] font-medium">{t("Zacznij biegać: od zera do 25 minut", "Start running: zero to 25 minutes")}</span>
          </span>
          <ArrowUpRight className="size-5 text-white/50" />
        </Link>
      ) : user ? (
        todays.length ? (
          <>
            <SectionHead title={t("Twój trening na dziś", "Today's session")} href="/panel" more={t("Plan", "Plan")} />
            {todays.map((s) => (
              <Link key={s.id} href={`/athlete/sessions/${s.id}`} className="mb-2 block rounded-[20px] bg-white px-4 py-4 text-black transition active:scale-[0.985]">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-[16px] font-semibold leading-snug">{s.title}</span>
                    {s.goal ? <span className="mt-0.5 line-clamp-2 block text-[13px] text-black/55">{s.goal}</span> : null}
                  </span>
                  {s.planned_duration_s ? <span className="shrink-0 rounded-full bg-black/[0.07] px-2.5 py-1 text-[12px] font-medium tabular-nums">{Math.round(s.planned_duration_s / 60)} min</span> : null}
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

      <SectionHead title={t("Dziennik", "Log")} href="/app/dziennik" more={t("Dodaj bieg", "Add run")} />
      <HomeWeek />

      <ForYou />

      <SectionHead title={t("Ucz się", "Learn")} href="/app/wiedza" more={t("Wiedza", "Learn")} />
      <CourseCard />

      <SectionHead title={t("Narzędzia", "Tools")} href="/app/narzedzia" more={t("Wszystkie", "All")} />
      <div className="grid grid-cols-2 gap-2">
        {[
          { href: "/app/bieg", icon: Footprints, title: t("Biegnij", "Run"), sub: t("GPS i głos co km", "GPS and voice splits") },
          { href: "/app/timer", icon: TimerReset, title: t("Timer interwałów", "Interval timer"), sub: t("sygnał przy każdej zmianie", "a beep at every change") },
          { href: "/app/biblioteka", icon: Dumbbell, title: t("Biblioteka", "Library"), sub: t("18 treningów", "18 workouts") },
          { href: "/app/narzedzia?t=prognoza", icon: Timer, title: t("Prognoza wyniku", "Race predictor"), sub: t("i Twoje tempa", "and your paces") },
          { href: "/app/narzedzia?t=paliwo", icon: Calculator, title: t("Paliwo na start", "Race fuel"), sub: t("plan żeli i picia", "gels and drinks plan") },
          { href: "/app/strategia", icon: Trophy, title: t("Strategia na start", "Race strategy"), sub: t("tempo na każdy km", "pace for every km") },
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
  );
}
