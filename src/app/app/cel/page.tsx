import Link from "next/link";
import { CalendarDays, Sparkles } from "lucide-react";
import { GoalPlanView } from "@/components/app/goal-plan";
import { MyWeek, type WeekSession } from "@/components/app/my-week";
import { Group, PhotoHead, Row, SectionHead } from "@/components/app/ui";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";

export const metadata = { title: "Plan" };

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const fmt = (iso: string) => new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

/**
 * The Plan tab. With a plan from a coach or VYRA Method it shows that plan, week by week, right here.
 * Without one: the race-plan builder.
 */
export default async function AppPlan() {
  const today = todayISO();
  const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() || 7) - 1;
  const mon = addDays(today, -dow);
  let sessions: WeekSession[] = [];
  let method = false;
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser().catch(() => null);
    if (user) {
      const supabase = await createClient();
      const [s, m] = await Promise.all([
        supabase.from("training_sessions").select("id, title, scheduled_date, planned_duration_s, status").eq("athlete_id", user.id).gte("scheduled_date", mon).lte("scheduled_date", addDays(mon, 27)).order("scheduled_date"),
        supabase.rpc("has_method_access", { p_user: user.id }).then((r) => (r.error ? false : !!r.data)),
      ]);
      sessions = (s.data ?? []) as WeekSession[];
      method = m;
    }
  }

  if (sessions.length) {
    const weeks = [0, 1, 2, 3].map((i) => {
      const start = addDays(mon, i * 7);
      const days = Array.from({ length: 7 }, (_, d) => addDays(start, d));
      return { start, days, list: sessions.filter((x) => x.scheduled_date >= days[0] && x.scheduled_date <= days[6]) };
    });
    const shown = weeks.filter((w, i) => i === 0 || w.list.length);
    return (
      <div className="app-rise grid grid-cols-1">
        <PhotoHead photo="track" title="Twój plan" sub={method ? "VYRA Method · plan dopasowuje się co tydzień" : "Od Twojego trenera"} />
        {shown.map((w, i) => (
          <div key={w.start}>
            <SectionHead title={i === 0 ? "Ten tydzień" : `${fmt(w.days[0])} – ${fmt(w.days[6])}`} />
            <MyWeek days={w.days} sessions={w.list} today={today} />
          </div>
        ))}
        <Group className="mt-5">
          <Row href="/athlete/calendar" icon={<CalendarDays className="size-4" />} title="Kalendarz treningów" />
          {method ? <Row href="/athlete/metoda" icon={<Sparkles className="size-4" />} title="VYRA Method: ankieta i podsumowania" /> : null}
        </Group>
        <Link href="/app/dziennik?add=1" className="mt-4 block text-center text-[13px] text-white/45">
          Trening spoza planu? Dodaj go w dzienniku
        </Link>
      </div>
    );
  }

  return (
    <div className="app-rise grid grid-cols-1">
      <PhotoHead photo="blur" title="Plan pod start" sub={method ? "Tydzień po tygodniu aż do startu. Tempa z Twojej formy." : "Ustaw start i zobacz podgląd planu. Cały plan z tempami jest w VYRA Method."} />
      <GoalPlanView />
    </div>
  );
}
