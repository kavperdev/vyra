import Link from "next/link";
import { ArrowUpRight, BookOpen, Calculator, Dumbbell, Flag, Footprints, HeartPulse, NotebookPen, Timer, TimerReset, TrendingUp, Trophy } from "lucide-react";
import { Chip, Group, PageHead, Row, SectionHead } from "@/components/app/ui";
import { ProBadge } from "@/components/app/paywall";
import { getCurrentUser } from "@/lib/auth";
import { challengeState, listChallenges } from "@/lib/data/challenges";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { MyWeek, type WeekSession } from "@/components/app/my-week";
import { Award, CalendarDays, ClipboardList, History, LineChart, Medal, Sparkles } from "lucide-react";

export const metadata = { title: "Trening" };

export default async function AppTraining() {
  const { t } = await getT();
  const supabase = await createClient();
  const [user, challenges] = await Promise.all([isSupabaseConfigured() ? getCurrentUser().catch(() => null) : null, listChallenges(supabase).catch(() => [])]);
  const open = challenges.filter((c) => c.visible && challengeState(c) !== "ended");
  // Signed in with a plan: this week from the platform, shown right here.
  const today = todayISO();
  const mon = new Date(`${today}T12:00:00Z`);
  mon.setUTCDate(mon.getUTCDate() - ((mon.getUTCDay() || 7) - 1));
  const days = Array.from({ length: 7 }, (_, i) => new Date(mon.getTime() + i * 864e5).toISOString().slice(0, 10));
  const athlete = user?.profile.role === "athlete";
  let week: WeekSession[] = [];
  let access = false;
  let method = false;
  if (athlete && user) {
    const [links, m] = await Promise.all([
      supabase.from("coach_athletes").select("status").eq("athlete_id", user.id).eq("status", "active").limit(1),
      supabase.rpc("has_method_access", { p_user: user.id }).then((r) => (r.error ? false : !!r.data)),
    ]);
    access = !!links.data?.length || m;
    method = m;
  }
  if (athlete && user && access) {
    const { data } = await supabase
      .from("training_sessions")
      .select("id, title, scheduled_date, planned_duration_s, status")
      .eq("athlete_id", user.id)
      .gte("scheduled_date", days[0])
      .lte("scheduled_date", days[6])
      .order("scheduled_date");
    week = (data ?? []) as WeekSession[];
  }
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title={t("Trening", "Train")} sub={t("Plan, treningi i narzędzia w jednym miejscu.", "Plan, workouts and tools in one place.")} />
      {user && !athlete ? (
        <Link href="/coach" className="flex items-center justify-between rounded-[20px] bg-white px-4 py-4 text-black transition active:scale-[0.985]">
          <span className="block text-[16px] font-semibold">{t("Panel trenera", "Coach panel")}</span>
          <ArrowUpRight className="size-5 shrink-0" />
        </Link>
      ) : athlete && !access ? (
        <Link href="/app/sklep" className="flex items-center justify-between rounded-[20px] bg-white px-4 py-4 text-black transition active:scale-[0.985]">
          <span>
            <span className="block text-[12px] text-black/50">{t("Twój dostęp się skończył", "Your access has ended")}</span>
            <span className="block text-[16px] font-semibold">{t("Odnów plan i wróć do treningów", "Renew your plan")}</span>
          </span>
          <ArrowUpRight className="size-5 shrink-0" />
        </Link>
      ) : athlete ? (
        <>
          <SectionHead title={t("Twój tydzień", "Your week")} href="/athlete/calendar" more={t("Kalendarz", "Calendar")} />
          <MyWeek days={days} sessions={week} today={today} />
          <Group className="mt-2">
            <Row href="/athlete" icon={<ClipboardList className="size-4" />} title={t("Plan i trening na dziś", "Plan and today")} />
            {method ? <Row href="/athlete/metoda" icon={<Sparkles className="size-4" />} title="VYRA Method" sub={t("Ankieta, tydzień i podsumowania", "Questionnaire, week and check-ins")} /> : null}
            <Row href="/athlete/calendar" icon={<CalendarDays className="size-4" />} title={t("Kalendarz treningów", "Training calendar")} />
            <Row href="/athlete/progress" icon={<LineChart className="size-4" />} title={t("Postępy", "Progress")} />
            <Row href="/athlete/history" icon={<History className="size-4" />} title={t("Historia", "History")} />
            <Row href="/athlete/records" icon={<Medal className="size-4" />} title={t("Rekordy i cele", "Records and goals")} />
            <Row href="/athlete/odznaki" icon={<Award className="size-4" />} title={t("Odznaki", "Badges")} />
          </Group>
        </>
      ) : (
        <Link href="/app/sklep" className="flex items-center justify-between rounded-[20px] bg-white px-4 py-4 text-black transition active:scale-[0.985]">
          <span>
            <span className="block text-[12px] text-black/50">VYRA Method</span>
            <span className="block text-[16px] font-semibold">{t("Plan dopasowany do Ciebie · 14 dni za darmo", "A plan fitted to you · 14 days free")}</span>
          </span>
          <ArrowUpRight className="size-5 shrink-0" />
        </Link>
      )}

      <SectionHead title={t("Treningi", "Workouts")} />
      <Group>
        <Row href="/app/dziennik" icon={<NotebookPen className="size-4" />} title={t("Dziennik biegów", "Run log")} sub={t("Kilometry z tygodnia i miesiąca", "Weekly and monthly kilometres")} />
        <Row href="/app/bieg" icon={<Footprints className="size-4" />} title={t("Biegnij z GPS", "Run with GPS")} sub={t("Dystans, tempo i głos co kilometr", "Distance, pace and a voice split every km")} />
        <Row href="/app/timer" icon={<TimerReset className="size-4" />} title={t("Timer interwałów", "Interval timer")} sub={t("Dźwięk i wibracja przy każdej zmianie", "Sound and vibration at every change")} />
        <Row href="/app/biblioteka" icon={<Dumbbell className="size-4" />} title={t("Biblioteka treningów", "Workout library")} sub={t("18 treningów z tempem dla Ciebie", "18 workouts with your paces")} />
        <Row href="/app/plan" icon={<Footprints className="size-4" />} title={t("Zacznij biegać", "Start running")} sub={t("Darmowy plan: od zera do 25 minut", "Free plan: zero to 25 minutes")} />
        <Row href="/app/kurs" icon={<BookOpen className="size-4" />} title={t("Kurs: Biegaj mądrze", "Course: Run smart")} sub={t("9 krótkich lekcji", "9 short lessons")} />
      </Group>

      <SectionHead title={t("Zaawansowane", "Advanced")} />
      <Group>
        <Row href="/app/strategia" icon={<Flag className="size-4" />} title={t("Strategia na start", "Race strategy")} sub={t("Tempo na każdy km i plan biegu", "Pace for every km and a race plan")} right={<ProBadge />} />
        <Row href="/app/obciazenie" icon={<TrendingUp className="size-4" />} title={t("Obciążenie i ryzyko", "Load and injury risk")} sub={t("Czy nie przesadzasz z treningiem", "Are you overdoing it")} right={<ProBadge />} />
      </Group>

      <SectionHead title={t("Narzędzia", "Tools")} />
      <Group>
        <Row href="/app/narzedzia?t=prognoza" icon={<Timer className="size-4" />} title={t("Prognoza wyniku i tempa", "Race predictor and paces")} />
        <Row href="/app/narzedzia?t=tetno" icon={<HeartPulse className="size-4" />} title={t("Strefy tętna", "Heart rate zones")} />
        <Row href="/app/narzedzia?t=paliwo" icon={<Calculator className="size-4" />} title={t("Paliwo na start", "Race fuel")} />
      </Group>

      <SectionHead title={t("Wyzwania", "Challenges")} href="/app/wyzwania" more={t("Wszystkie", "All")} />
      <Group>
        {open.length ? (
          open.map((c) => (
            <Row
              key={c.id}
              href={`/app/wyzwania/${c.slug}`}
              icon={<Trophy className="size-4" />}
              title={c.title}
              sub={`${formatDate(c.starts_on, "d.MM")} – ${formatDate(c.ends_on, "d.MM")}`}
              right={<Chip tone={challengeState(c) === "live" ? "good" : "quiet"}>{challengeState(c) === "live" ? t("trwa", "live") : t("wkrótce", "soon")}</Chip>}
            />
          ))
        ) : (
          <p className="px-4 py-4 text-[13px] text-white/45">{t("Nowe wyzwanie już niedługo.", "A new challenge is coming soon.")}</p>
        )}
      </Group>
    </div>
  );
}
