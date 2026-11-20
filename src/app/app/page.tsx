import Link from "next/link";
import type { PlanSession } from "@/components/app/plan-today";
import { Today } from "@/components/app/today";
import { TodayRoutine } from "@/components/app/today-routine";
import { OsToday } from "@/components/app/athlete-os";
import { SessionHero, TodayTop } from "@/components/app/today-hero";
import { RunInsights } from "@/components/app/coach-cards";
import { GoalRoad, RunnerLevel, WeekRing } from "@/components/app/viz";
import { GuardBanner } from "@/components/app/guard";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { athleteHasAccess } from "@/lib/data/access";

export const metadata = { title: "Dziś" };

import { AppTour } from "@/components/app/tour";
import { blockingStep, guideNext } from "@/lib/data/first-step";

export default async function AppHome() {
  const { t } = await getT();
  const supabase = await createClient();
  const user = isSupabaseConfigured() ? await getCurrentUser().catch(() => null) : null;
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
  type Synced = { sleep: number; energy: number; soreness: number; pain: boolean; pain_area?: string };
  let synced: Synced | null = null;
  if (athlete && user) {
    const { data, error } = await supabase.from("readiness").select("sleep, energy, soreness, pain, pain_area").eq("athlete_id", user.id).eq("day", todayISO(user.profile.timezone)).maybeSingle();
    if (!error && data) synced = { ...(data as Synced), pain_area: (data as { pain_area?: string | null }).pain_area ?? undefined };
  }
  const todo = athlete && user ? await blockingStep(supabase, user.id).catch(() => null) : null;

  const first = (user?.profile.full_name ?? "").trim().split(/\s+/)[0];
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/Warsaw" }).format(new Date()));
  const hello = hour < 11 ? t("Dzień dobry", "Good morning") : hour < 18 ? t("Cześć", "Hi") : t("Dobry wieczór", "Good evening");
  const plan = paid && user ? { hasPlan: week.length > 0, sessions: todays.map((s) => ({ title: s.title, kind: s.kind, category: todayCats[s.id] ?? null, km: s.km ?? null, status: s.status })) } : undefined;
  return (
    <div className="app-rise mx-auto grid w-full max-w-xl grid-cols-1 gap-4">
      <h1 className="sr-only">
        {hello}
        {first ? `, ${first}` : ""}
      </h1>
      <TodayTop planned={week} hasPlan={paid && week.length > 0} />

      {todo ? (
        <Link href={todo.href} className="block rounded-[22px] border border-[#e5343b]/40 bg-[#e5343b]/10 p-5 active:scale-[0.99]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#ff8a8f]">{t("Zrób to najpierw", "Do this first")}</p>
          <p className="mt-1.5 text-[20px] font-semibold leading-tight tracking-[-0.01em]">{todo.title}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-white/75">{todo.text}</p>
          <span className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold text-black">{todo.cta} →</span>
        </Link>
      ) : null}
      {athlete && user ? <AppTour userId={user.id} next={guideNext(todo)} /> : null}

      <GuardBanner />
      <SessionHero hasPlan={paid && week.length > 0} sessions={paid ? todays.map((x) => ({ ...x, category: todayCats[x.id] ?? null })) : []} />
      <WeekRing planned={week} />
      <GoalRoad />
      <RunnerLevel />

      {/* Readiness: the call for today (do it / lighter / rest) and the morning check-in. */}
      <OsToday plan={plan} sessions={[]} />
      {/* the morning check-in sheet and its sync live here; the card above opens it */}
      <div className="hidden">
        <Today synced={synced} athlete={athlete} part="sheet" />
      </div>

      <RunInsights limit={1} />

      <TodayRoutine
        hard={todays.some((x) => x.status === "planned" && ["tempo", "threshold", "intervals", "fartlek", "hills", "progression", "race_pace", "test", "race"].includes(todayCats[x.id] ?? ""))}
        strength={todays.some((x) => x.status === "planned" && x.kind === "strength")}
        run={todays.some((x) => x.kind === "running")}
      />
    </div>
  );
}
