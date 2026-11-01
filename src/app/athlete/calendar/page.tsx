import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { TrainingCalendar } from "@/components/calendar/training-calendar";
import { requireRole } from "@/lib/auth";
import { calendarRange, parseDate, parseView } from "@/lib/calendar";
import { todayISO } from "@/lib/dates";
import { listSessions } from "@/lib/data/sessions";
import { createClient } from "@/lib/supabase/server";
import type { SessionKind } from "@/lib/types";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Kalendarz", "Calendar") };
}

export default async function AthleteCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; kind?: string; status?: string }>;
}) {
  await getLang();
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
      <PageHeader eyebrow={tl("Twój plan", "Your plan")} title={tl("Kalendarz", "Calendar")} />
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
