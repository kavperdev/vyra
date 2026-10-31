import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { TrainingCalendar } from "@/components/calendar/training-calendar";
import { requireRole } from "@/lib/auth";
import { calendarRange, parseDate, parseView } from "@/lib/calendar";
import { todayISO } from "@/lib/dates";
import { listSessions } from "@/lib/data/sessions";
import { createClient } from "@/lib/supabase/server";
import type { SessionKind } from "@/lib/types";

export const metadata: Metadata = { title: "Kalendarz" };

export default async function AthleteCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; kind?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const today = todayISO(user.profile.timezone);
  const view = parseView(sp.view ?? "week");
  const date = parseDate(sp.date, today);
  const { from, to } = calendarRange(view, date);
  const kind = (["running", "strength", "mobility", "other"] as const).find((k) => k === sp.kind) as SessionKind | undefined;
  const sessions = await listSessions(supabase, { athleteIds: [user.id], from, to, kinds: kind ? [kind] : undefined });

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Twój plan" title="Kalendarz" />
      <TrainingCalendar
        role="athlete"
        sessions={sessions}
        view={view}
        date={date}
        today={today}
        filters={{ athlete: "", kind: kind ?? "", status: sp.status ?? "" }}
      />
    </div>
  );
}
