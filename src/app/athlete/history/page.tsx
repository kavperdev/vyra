import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { HistoryTable } from "@/components/athlete/history-table";
import { requireRole } from "@/lib/auth";
import { addDaysISO, todayISO } from "@/lib/dates";
import { listSessions } from "@/lib/data/sessions";
import { createClient } from "@/lib/supabase/server";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Historia", "History") };
}

export default async function AthleteHistoryPage() {
  await getLang();
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const today = todayISO(user.profile.timezone);
  const sessions = await listSessions(supabase, { athleteIds: [user.id], from: addDaysISO(today, -730), to: today, order: "desc" });
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={tl("Twoje treningi", "Your sessions")} title={tl("Historia", "History")} description={tl("Plan trenera, Twoje wyniki i komentarze. Zmiany w przyszłym planie nie zmieniają tej historii.", "Your coach’s plan, your results and comments. Changes to future plans don’t change this history.")} />
      <HistoryTable sessions={sessions} today={today} hrefBase="/athlete/sessions" />
    </div>
  );
}
