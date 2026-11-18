import Link from "next/link";
import { CalendarDays, Moon, Trophy, Users } from "lucide-react";
import { TodayPlan } from "@/components/app/today-plan";
import { PlanToday, type PlanSession } from "@/components/app/plan-today";
import { WeekStrip } from "@/components/app/week-strip";
import { Today } from "@/components/app/today";
import { Chip, Group, PhotoCard, Row, SectionHead, photoOfDay } from "@/components/app/ui";
import { TodayRoutine } from "@/components/app/today-routine";
import { TodayRings } from "@/components/app/rings";
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
  return (
    <div className="app-rise app-wide grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-x-10">
      <PhotoCard photo={photoOfDay(todayISO())} minH={130} pos="center 40%" className="lg:col-span-2">
        <p className="text-[12px] font-medium capitalize tracking-wide text-white/65">{today}</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-[1.05] tracking-[-0.025em]">
          {hello}
          {first ? `, ${first}` : ""}
          <span className="text-[var(--accent)]">.</span>
        </h1>
      </PhotoCard>

      {/* Dziś = three questions only: how am I, what do I do today, how is the week. The rest lives in the tabs. */}
      <div className="mt-4 lg:col-span-2">
        <TodayRings />
      </div>

      <div className="grid min-w-0 grid-cols-1 content-start">
        <div className="mt-3">
          <Today synced={synced} athlete={athlete} part="ready" />
        </div>
        {!paid ? <TodayPlan /> : user ? <PlanToday sessions={todays} /> : null}
        <TodayRoutine />
        <WeekStrip planned={week} />
      </div>

      <div className="grid min-w-0 grid-cols-1 content-start lg:pt-2">
        <div className="mt-3">
          <Today part="weather" />
        </div>

        <SectionHead title={t("W VYRA", "At VYRA")} />
        <Group>
          <Row href="/app/run-club" icon={<Users className="size-4" />} title="Run Club VYRA" sub={t("Czwartki 18:00 · Park Aleksandria", "Thursdays 18:00 · Park Aleksandria")} />
          {live ? (
            <Row
              href={`/app/wyzwania/${live.slug}`}
              icon={<Trophy className="size-4" />}
              title={live.title}
              sub={`${formatDate(live.starts_on, "d.MM")} – ${formatDate(live.ends_on, "d.MM")}`}
              right={<Chip tone={challengeState(live) === "live" ? "good" : "quiet"}>{challengeState(live) === "live" ? t("trwa", "live") : t("wkrótce", "soon")}</Chip>}
            />
          ) : todayISO() <= "2027-05-22" ? (
            <Row href="/app/nocna" icon={<Moon className="size-4" />} title="Nocna Ekipa" sub={t("Darmowy plan na Nocną Dychę", "Free plan for the night 10K")} />
          ) : null}
          {!paid ? <Row href="/app/sklep" icon={<CalendarDays className="size-4" />} title="VYRA Method" sub={t("Plan dopasowany do Ciebie · 14 dni za darmo", "A plan fitted to you · 14 days free")} /> : null}
        </Group>
      </div>
    </div>
  );
}
