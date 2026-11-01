import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { CopyWeekButton } from "@/components/calendar/copy-week";
import { TrainingCalendar } from "@/components/calendar/training-calendar";
import { requireRole } from "@/lib/auth";
import { calendarRange, parseDate, parseView } from "@/lib/calendar";
import { todayISO } from "@/lib/dates";
import { listAthletes } from "@/lib/data/people";
import { listSessions } from "@/lib/data/sessions";
import { createClient } from "@/lib/supabase/server";
import { canPlan, type SessionKind } from "@/lib/types";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Kalendarz", "Calendar") };
}

export default async function CoachCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; athlete?: string; kind?: string; status?: string }>;
}) {
  await getLang();
  const sp = await searchParams;
  const user = await requireRole("coach");
  const supabase = await createClient();
  const today = todayISO(user.profile.timezone);
  const view = parseView(sp.view);
  const date = parseDate(sp.date, today);
  const { from, to } = calendarRange(view, date);
  const athletes = await listAthletes(supabase, user.id);
  const athleteFilter = sp.athlete && athletes.some((a) => a.id === sp.athlete) ? sp.athlete : "";
  const kind = (["running", "strength", "mobility", "other"] as const).find((k) => k === sp.kind) as SessionKind | undefined;
  const sessions = await listSessions(supabase, {
    from,
    to,
    athleteIds: athleteFilter ? [athleteFilter] : undefined,
    kinds: kind ? [kind] : undefined,
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={tl("Planowanie", "Planning")}
        title={tl("Kalendarz treningowy", "Training calendar")}
        description={tl("Treningi wszystkich zawodników. Kliknij dzień, aby zobaczyć szczegóły, albo + aby zaplanować trening.", "All athletes’ sessions. Click a day to see details, or + to plan a session.")}
        actions={
          canPlan(user.profile.staff_role) ? (
            <CopyWeekButton
              athletes={athletes.filter((a) => a.link_status === "active").map((a) => ({ id: a.id, full_name: a.full_name }))}
              athleteId={athleteFilter || undefined}
              week={date}
            />
          ) : undefined
        }
      />
      <TrainingCalendar
        role="coach"
        sessions={sessions}
        view={view}
        date={date}
        today={today}
        athletes={athletes.map((a) => ({ id: a.id, full_name: a.full_name }))}
        filters={{ athlete: athleteFilter, kind: kind ?? "", status: sp.status ?? "" }}
      />
    </div>
  );
}
