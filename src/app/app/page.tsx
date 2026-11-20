import Link from "next/link";
import { CalendarDays, Flame, Moon, Trophy, Users, MapPin } from "lucide-react";
import { TodayPlan } from "@/components/app/today-plan";
import type { PlanSession } from "@/components/app/plan-today";
import { Today } from "@/components/app/today";
import { Chip, Group, Row, SectionHead } from "@/components/app/ui";
import { TodayRoutine } from "@/components/app/today-routine";
import { OsBento, OsTiles, OsToday } from "@/components/app/athlete-os";
import { getCurrentUser } from "@/lib/auth";
import { challengeState, listChallenges } from "@/lib/data/challenges";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { athleteHasAccess } from "@/lib/data/access";

export const metadata = { title: "Dziś" };

import { AppGuide } from "@/components/app/guide";
import { blockingStep, guideNext } from "@/lib/data/first-step";

export default async function AppHome() {
  const { t } = await getT();
  const supabase = await createClient();
  const [user, challenges] = await Promise.all([isSupabaseConfigured() ? getCurrentUser().catch(() => null) : null, listChallenges(supabase).catch(() => [])]);
  // Signed in: today's sessions straight from the plan (VYRA Method or the coach).
  let todays: PlanSession[] = [];
  let week: { date: string; done: boolean }[] = [];
  let todayCats: Record<string, string | null> = {};
  if (user) {
    const day = todayISO();
    const dow = (new Date(`${day}T12:00:00Z`).getUTCDay() || 7) - 1;
    const shift = (n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("training_sessions")
      .select("id, title, planned_duration_s, goal, status, kind, category, instructions, scheduled_date, running_workouts(planned_distance_m)")
      .eq("athlete_id", user.id)
      .gte("scheduled_date", shift(-dow))
      .lte("scheduled_date", shift(6 - dow))
      .limit(40);
    type Row = PlanSession & { scheduled_date: string; category?: string | null; running_workouts?: { planned_distance_m: number | null } | { planned_distance_m: number | null }[] | null };
    const rows = ((data ?? []) as Row[]).map(({ running_workouts: rw, ...r }) => {
      const m = (Array.isArray(rw) ? rw[0] : rw)?.planned_distance_m;
      return { ...r, km: m ? Math.round(m / 100) / 10 : null };
    });
    todays = rows.filter((r) => r.scheduled_date === day).slice(0, 3);
    todayCats = Object.fromEntries(todays.map((r) => [r.id, (r as Row).category ?? null]));
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
  const todo = athlete && user ? await blockingStep(supabase, user.id).catch(() => null) : null;
  const live = challenges.find((c) => c.visible && challengeState(c) !== "ended");

  const first = (user?.profile.full_name ?? "").trim().split(/\s+/)[0];
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/Warsaw" }).format(new Date()));
  const hello = hour < 11 ? t("Dzień dobry", "Good morning") : hour < 18 ? t("Cześć", "Hi") : t("Dobry wieczór", "Good evening");
  const plan = paid && user ? { hasPlan: week.length > 0, sessions: todays.map((s) => ({ title: s.title, kind: s.kind, category: todayCats[s.id] ?? null, km: s.km ?? null, status: s.status })) } : undefined;
  return (
    <div className="app-rise app-wide grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-x-10">
      <header className="px-1 pb-4 pt-1 lg:col-span-2">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/40">VYRA · Athlete OS</p>
        <h1 className="mt-1.5 text-[30px] font-semibold leading-[1.02] tracking-[-0.035em]">
          {hello}
          {first ? `, ${first}` : ""}
          <span className="text-[var(--accent)]">.</span>
        </h1>
      </header>

      {todo ? (
        <Link href={todo.href} className="mb-3 block rounded-[24px] border border-[#e5343b]/40 bg-[#e5343b]/10 p-5 active:scale-[0.99] lg:col-span-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#ff8a8f]">{t("Zrób to najpierw", "Do this first")}</p>
          <p className="mt-1.5 text-[20px] font-semibold leading-tight tracking-[-0.01em]">{todo.title}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-white/75">{todo.text}</p>
          <span className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold text-black">{todo.cta} →</span>
        </Link>
      ) : null}
      {athlete && user ? <AppGuide variant="runner" userId={user.id} next={guideNext(todo)} /> : null}

      {/* Athlete OS: one card for today (score, verdict, today's session, morning actions), three numbers, the grid. */}
      <OsToday plan={plan} sessions={paid ? todays : []} />
      {/* the morning check-in sheet and its sync live here; the card above opens it */}
      <div className="hidden">
        <Today synced={synced} athlete={athlete} part="sheet" />
      </div>
      {!paid ? (
        <div className="lg:col-span-2">
          <TodayPlan />
        </div>
      ) : null}
      <OsTiles planned={week} />
      <OsBento />

      <div className="grid min-w-0 grid-cols-1 content-start">
        <TodayRoutine />
        <div className="mt-3">
          <Today part="weather" />
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 content-start lg:pt-2">
        <SectionHead title={t("W VYRA", "At VYRA")} />
        <Group>
          <Row href="/app/znajomi" icon={<Flame className="size-4" />} title={t("Ekipa", "Crew")} sub={t("Treningi znajomych, 🔥 i komentarze", "Friends' sessions, 🔥 and comments")} />
          <Row href="/app/wspolne-biegi" icon={<MapPin className="size-4" />} title={t("Wspólne biegi", "Run together")} sub={t("Znajdź ekipę do biegania w okolicy", "Find people to run with nearby")} />
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
