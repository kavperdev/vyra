import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { HistoryTable } from "@/components/athlete/history-table";
import { requireRole } from "@/lib/auth";
import { addDaysISO, todayISO } from "@/lib/dates";
import { listSessions } from "@/lib/data/sessions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Historia" };

export default async function AthleteHistoryPage() {
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const today = todayISO(user.profile.timezone);
  const sessions = await listSessions(supabase, { athleteIds: [user.id], from: addDaysISO(today, -730), to: today, order: "desc" });
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Twoje treningi" title="Historia" description="Plan trenera, Twoje wyniki i komentarze. Zmiany w przyszłym planie nie zmieniają tej historii." />
      <HistoryTable sessions={sessions} today={today} hrefBase="/athlete/sessions" />
    </div>
  );
}
